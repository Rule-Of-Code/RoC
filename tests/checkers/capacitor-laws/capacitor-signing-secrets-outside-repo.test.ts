/**
 * CapacitorSigningSecretsOutsideRepo (#265): "in the repository" is asked of
 * git, never of the disk — an ignored keystore beside the project is what a
 * correct setup has. A secret's value never appears in a finding.
 */
import { CapacitorSigningSecretsOutsideRepoLaw } from '../../../src/checkers/capacitor-laws/capacitor-signing-secrets-outside-repo';
import { CAPACITOR_NATIVE_LAWS } from '../../../src/data/capacitor-native-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, capacitorProject, track } from './capacitor-fixture';

afterAll(removeProjects);

const GRADLE = 'android/app/build.gradle';
const SECRET = 'hunter2-s3cret';
const signing = (body: string, release = 'signingConfig signingConfigs.release') => `android {
    signingConfigs {
        release {
${body}
        }
    }
    buildTypes {
        release {
            ${release}
        }
    }
}
`;
const FROM_PROPERTIES = signing(`            if (project.hasProperty('storeFile')) {
                storeFile file(project.property('storeFile'))
                storePassword project.property('storePassword')
                keyPassword System.getenv("KEY_PASSWORD")
            }`);

/** A git repository with `tracked` added to the index and the rest left on disk. */
const repo = (files: Record<string, string>, tracked: string[]) => {
  const root = capacitorProject({ '.gitignore': 'node_modules\n', ...files });
  track(root, '.gitignore', ...tracked);
  return root;
};
const run = (root: string) => CapacitorSigningSecretsOutsideRepoLaw.check(ctx(root, IGNORING_SHELLS));

describe('CapacitorSigningSecretsOutsideRepoLaw (#265)', () => {
  it('red: tracked key material, by extension, anywhere in the tree', () => {
    const root = repo(
      { 'android/app/release.jks': 'bin', 'ios/certs/dist.p12': 'bin', 'keys/AuthKey.p8': 'k', [GRADLE]: FROM_PROPERTIES },
      ['android/app/release.jks', 'ios/certs/dist.p12', 'keys/AuthKey.p8', GRADLE]
    );
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/release\.jks: signing key material is tracked by git/),
      expect.stringMatching(/^ios\/certs\/dist\.p12: signing key material is tracked/),
      expect.stringMatching(/^keys\/AuthKey\.p8: signing key material is tracked/),
    ]);
  });

  it('red: a keystore on disk that git does not ignore; green: the same keystore ignored', () => {
    const unignored = repo({ 'android/app/upload.keystore': 'bin', [GRADLE]: FROM_PROPERTIES }, [GRADLE]);
    expect(run(unignored).violations).toEqual([expect.stringContaining('present and not ignored')]);

    const ignored = repo(
      { '.gitignore': 'node_modules\n*.keystore\n', 'android/app/upload.keystore': 'bin', [GRADLE]: FROM_PROPERTIES },
      [GRADLE]
    );
    expect(run(ignored).violations).toEqual([]);
  });

  it('red: storePassword / keyPassword literals in Groovy and Kotlin DSL — without repeating the value', () => {
    const root = repo(
      {
        [GRADLE]: signing(`            storePassword "${SECRET}"\n            keyPassword '${SECRET}'`),
        'android/build.gradle.kts': `android { signingConfigs { create("release") { storePassword = "${SECRET}" } } }`,
      },
      [GRADLE, 'android/build.gradle.kts']
    );
    const result = run(root);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/build\.gradle:4: storePassword is a string literal/),
      expect.stringMatching(/^android\/app\/build\.gradle:5: keyPassword is a string literal/),
      expect.stringMatching(/^android\/build\.gradle\.kts:1: storePassword is a string literal/),
    ]);
    expect(result.violations!.join('\n')).not.toContain(SECRET);
  });

  it('green: passwords from properties / environment, an interpolated GString, a literal only in a comment', () => {
    const root = repo(
      {
        [GRADLE]: `${FROM_PROPERTIES}\n// storePassword "${SECRET}"\nandroid { signingConfigs { ci { storePassword "\${System.getenv('PW')}" } } }\n`,
      },
      [GRADLE]
    );
    expect(run(root).violations).toEqual([]);
  });

  it('red: a password in a tracked .properties file; green: the same file ignored, or the key empty', () => {
    const tracked = repo(
      { 'android/keystore.properties': `storeFile=/keys/release.jks\nRELEASE_STORE_PASSWORD=${SECRET}\nkeyPassword=\n`, [GRADLE]: FROM_PROPERTIES },
      ['android/keystore.properties', GRADLE]
    );
    const result = run(tracked);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/keystore\.properties:2: RELEASE_STORE_PASSWORD holds a value/),
    ]);
    expect(result.violations!.join('\n')).not.toContain(SECRET);

    const ignored = repo(
      { '.gitignore': 'keystore.properties\n', 'android/keystore.properties': `storePassword=${SECRET}\n`, [GRADLE]: FROM_PROPERTIES },
      [GRADLE]
    );
    expect(run(ignored).violations).toEqual([]);
  });

  it('red: the release build type falls back to the debug key; green: release left unsigned', () => {
    const fallback = repo(
      {
        [GRADLE]: signing(
          "            storePassword project.property('pw')",
          "signingConfig project.hasProperty('pw') ? signingConfigs.release : signingConfigs.debug"
        ),
      },
      [GRADLE]
    );
    expect(run(fallback).violations).toEqual([expect.stringContaining('the release build type can be signed with signingConfigs.debug')]);

    const kts = repo(
      { 'android/app/build.gradle.kts': 'android { buildTypes { getByName("release") { signingConfig = signingConfigs.getByName("debug") } } }' },
      ['android/app/build.gradle.kts']
    );
    expect(run(kts).violations).toEqual([expect.stringContaining('signingConfigs.debug')]);

    const debugType = repo(
      { [GRADLE]: `${FROM_PROPERTIES}\nandroid { buildTypes { dev { initWith debug\n signingConfig signingConfigs.debug } } }\n` },
      [GRADLE]
    );
    expect(run(debugType).violations).toEqual([]);
  });

  it('cannot read: outside a git work tree the key-material check fails, saying so', () => {
    const root = capacitorProject({ [GRADLE]: FROM_PROPERTIES });
    const result = run(root);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('git could not be asked')]);
  });
});

describe('selection (#265 requires Capacitor)', () => {
  const card = CAPACITOR_NATIVE_LAWS.find(law => law.title === 'Capacitor Signing Secrets Outside Repo')!;

  it('selected in a Capacitor project, not in a plain web project', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject())).toBe(true);
    expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
  });
});
