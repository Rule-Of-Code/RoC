/**
 * CapacitorFirebaseNativeConfigNotSkipped (#257): the app build script must
 * not swallow a missing google-services.json, and a present one must name
 * the variant's package. The template text below is @capacitor/cli 8.5.1's
 * android-template app/build.gradle:47-54, verbatim.
 */
import { CapacitorFirebaseNativeConfigNotSkippedLaw } from '../../../src/checkers/capacitor-laws/capacitor-firebase-native-config-not-skipped';
import { CAPACITOR_NATIVE_LAWS } from '../../../src/data/capacitor-native-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, MANIFEST, androidManifest, capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const PUSH_ANDROID = { '@capacitor/android': '8.5.1', '@capacitor/push-notifications': '8.1.2' };
const GRADLE = 'android/app/build.gradle';
const TEMPLATE_APPLY = `try {
    def servicesJSON = file('google-services.json')
    if (servicesJSON.text) {
        apply plugin: 'com.google.gms.google-services'
    }
} catch(Exception e) {
    logger.info("google-services.json not found, google-services plugin not applied. Push Notifications won't work")
}`;
const androidBlock = (buildTypes = '') => `apply plugin: 'com.android.application'

android {
    namespace = "com.example.app"
    defaultConfig {
        applicationId "com.example.app"
        aaptOptions {
            ignoreAssetsPattern = '!.svn:!.git'
        }
    }
    buildTypes {
        release {
            minifyEnabled false
        }
${buildTypes}
    }
}
`;
const FAILING_TASK = `
def present = file('google-services.json').exists()
if (present) {
    apply plugin: 'com.google.gms.google-services'
}
tasks.register('checkServices') {
    doLast {
        if (!present) {
            throw new GradleException('''
android/app/google-services.json is missing. Do not wrap the apply in try { } catch.
''')
        }
    }
}
`;
const services = (...packages: string[]) =>
  JSON.stringify({
    project_info: { project_id: 'p' },
    client: packages.map(name => ({ client_info: { android_client_info: { package_name: name } } })),
  });
const check = (files: Record<string, string>, deps: Record<string, string> = PUSH_ANDROID) =>
  CapacitorFirebaseNativeConfigNotSkippedLaw.check(
    ctx(capacitorProject({ [MANIFEST]: androidManifest(), ...files }, {}, deps), IGNORING_SHELLS)
  );

describe('CapacitorFirebaseNativeConfigNotSkippedLaw (#257)', () => {
  it("red: the Capacitor template's try/catch with logger.info", () => {
    const result = check({ [GRADLE]: androidBlock() + TEMPLATE_APPLY });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/build\.gradle:\d+: com\.google\.gms\.google-services is applied inside try\/catch and the catch does not throw/),
    ]);
  });

  it('red: a conditional apply in a script that never fails the build', () => {
    const result = check({
      [GRADLE]: `${androidBlock()}\nif (file('google-services.json').exists()) {\n    apply plugin: 'com.google.gms.google-services'\n}\n`,
    });
    expect(result.violations).toEqual([expect.stringContaining('applied only when a condition holds')]);
  });

  it('red: the plugin not applied at all (or applied where this law cannot read)', () => {
    const result = check({ [GRADLE]: androidBlock() });
    expect(result.violations).toEqual([
      expect.stringContaining('@capacitor/push-notifications needs Firebase on Android, and this script does not apply'),
    ]);
  });

  it('green: applied unconditionally, or behind a check that fails the build', () => {
    expect(check({ [GRADLE]: `${androidBlock()}\napply plugin: 'com.google.gms.google-services'\n` }).violations).toEqual([]);
    expect(check({ [GRADLE]: androidBlock() + FAILING_TASK }).violations).toEqual([]);
  });

  it('green: a try whose catch rethrows', () => {
    const rethrows = TEMPLATE_APPLY.replace(/logger\.info\([^)]*\)/, 'throw new GradleException("google-services.json missing", e)');
    expect(check({ [GRADLE]: androidBlock() + rethrows }).violations).toEqual([]);
  });

  it('control: the apply line quoted in a comment or a message is not an apply', () => {
    const quoted = `${androidBlock()}\n// apply plugin: 'com.google.gms.google-services'\nprintln "apply plugin: 'com.google.gms.google-services'"\n`;
    expect(check({ [GRADLE]: quoted }).violations).toEqual([expect.stringContaining('does not apply')]);
  });

  it('Kotlin DSL: the plugins block id is unconditional', () => {
    const kts = 'plugins {\n    id("com.android.application")\n    id("com.google.gms.google-services")\n}\n';
    expect(check({ 'android/app/build.gradle.kts': kts }).violations).toEqual([]);
  });

  it('red: a present google-services.json without a client for the variant package', () => {
    const result = check({
      [GRADLE]: androidBlock('        dev {\n            initWith debug\n            applicationIdSuffix ".dev"\n        }') + FAILING_TASK,
      'android/app/google-services.json': services('com.other.app'),
      'android/app/src/dev/google-services.json': services('com.example.app'),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/src\/dev\/google-services\.json: has no client for com\.example\.app\.dev \(it lists com\.example\.app\)/),
      expect.stringMatching(/app\/google-services\.json: has no client for com\.example\.app \(it lists com\.other\.app\)/),
    ]);
  });

  it('green: each present file names its variant package; a missing file is not red by itself', () => {
    const result = check({
      [GRADLE]: androidBlock('        dev {\n            initWith debug\n            applicationIdSuffix ".dev"\n        }') + FAILING_TASK,
      'android/app/google-services.json': services('com.example.app'),
      'android/app/src/dev/google-services.json': services('com.example.app.dev'),
    });
    expect(result.violations).toEqual([]);
    expect(check({ [GRADLE]: androidBlock() + FAILING_TASK }).violations).toEqual([]);
  });

  it('a computed applicationId is named as not compared, in the details', () => {
    const result = check({
      [GRADLE]: androidBlock().replace('applicationId "com.example.app"', "applicationId project.property('appId')") + FAILING_TASK,
      'android/app/google-services.json': services('com.example.app'),
    });
    expect(result.violations).toEqual([]);
    expect(result.details).toEqual([expect.stringContaining('was not compared')]);
  });

  it('cannot read: an unreadable google-services.json, a missing build script, no android/ shell', () => {
    expect(
      check({ [GRADLE]: androidBlock() + FAILING_TASK, 'android/app/google-services.json': '{ nope' }).violations
    ).toEqual([expect.stringContaining('cannot be read as JSON')]);
    expect(check({}).violations).toEqual([expect.stringContaining('build.gradle(.kts) does not exist')]);
    expect(
      CapacitorFirebaseNativeConfigNotSkippedLaw.check(ctx(capacitorProject({}, {}, PUSH_ANDROID), IGNORING_SHELLS)).violations
    ).toEqual([expect.stringContaining('no android/ shell exists')]);
  });
});

describe('selection (#257 requires Android AND a dependency that needs Firebase)', () => {
  const card = CAPACITOR_NATIVE_LAWS.find(law => law.title === 'Capacitor Firebase Native Config Not Skipped')!;

  it('selected with push or a @capacitor-firebase plugin on Android', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, PUSH_ANDROID))).toBe(true);
    expect(
      lawRequirementsMet(
        card.requires,
        capacitorProject({}, {}, { '@capacitor/android': '8.5.1', '@capacitor-firebase/authentication': '8.4.0' })
      )
    ).toBe(true);
  });

  it('not selected without a Firebase dependency, nor without Android', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, { '@capacitor/android': '8.5.1' }))).toBe(false);
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, { '@capacitor/push-notifications': '8.1.2' }))).toBe(false);
  });
});
