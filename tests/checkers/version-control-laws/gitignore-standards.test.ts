/**
 * Git Ignore Standards — the stack-following required set, and the Capacitor
 * extension (#161): the two Firebase credential files and the paths cap sync,
 * Gradle and CocoaPods generate, judged by git itself where there is a git
 * repository (nested .gitignore files count) and by the ignore files' text
 * where there is not.
 */
import { execFileSync } from 'child_process';
import { GitIgnoreStandardsLaw as Law } from '../../../src/checkers/version-control-laws/gitignore-standards';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const ROOT_IGNORE = ['node_modules', 'dist', '.env', '*.log', '.DS_Store'].join('\n');
/** The lines `npx cap add android` writes (Capacitor 8.6.0), abridged to the ones that matter. */
const ANDROID_IGNORE = [
  'build/',
  '.gradle/',
  'local.properties',
  '# google-services.json',
  'app/src/main/assets/public',
  'app/src/main/assets/capacitor.config.json',
  'app/src/main/assets/capacitor.plugins.json',
].join('\n');
/** The lines `npx cap add ios` writes (Capacitor 8.6.0). */
const IOS_IGNORE = ['App/build', 'App/Pods', 'App/App/public', 'App/App/capacitor.config.json'].join('\n');

const git = (root: string, ...args: string[]) =>
  execFileSync('git', args, { cwd: root, stdio: 'ignore', windowsHide: true });

const capacitorApp = (files: Record<string, string>, withGit: boolean) => {
  const root = project({
    'package.json': manifest({ '@capacitor/core': '8.5.1' }),
    'capacitor.config.json': '{}',
    'android/build.gradle': '',
    'ios/App/App/Info.plist': '<plist/>',
    ...files,
  });
  if (withGit) git(root, 'init', '-q');
  return root;
};

describe('GitIgnoreStandardsLaw', () => {
  it('green: a Node project with the five essentials', () => {
    const root = project({ 'package.json': manifest({}), '.gitignore': ROOT_IGNORE });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('red: a missing essential', () => {
    const root = project({ 'package.json': manifest({}), '.gitignore': 'node_modules\n.env' });
    expect(Law.check(ctx(root)).violations).toEqual(
      expect.arrayContaining(['Missing .gitignore entry: dist', 'Missing .gitignore entry: *.log'])
    );
  });

  describe.each([
    ['in a git repository (git check-ignore)', true],
    ['outside git (the ignore files as text)', false],
  ])('a Capacitor project %s', (_, withGit) => {
    it('red: Capacitor’s own nested ignores, no line for the two credential files (the shipped templates)', () => {
      const root = capacitorApp(
        { '.gitignore': ROOT_IGNORE, 'android/.gitignore': ANDROID_IGNORE, 'ios/.gitignore': IOS_IGNORE },
        withGit
      );
      expect(Law.check(ctx(root)).violations).toEqual([
        'Missing .gitignore entry: google-services.json (Firebase configuration; android/app/google-services.json carries API keys)',
        'Missing .gitignore entry: GoogleService-Info.plist (Firebase configuration; ios/App/App/GoogleService-Info.plist carries API keys)',
      ]);
    });

    it('green: the credential files ignored at the root, the shell paths by the nested files', () => {
      const root = capacitorApp(
        {
          '.gitignore': `${ROOT_IGNORE}\ngoogle-services.json\nGoogleService-Info.plist`,
          'android/.gitignore': ANDROID_IGNORE,
          'ios/.gitignore': IOS_IGNORE,
        },
        withGit
      );
      expect(Law.check(ctx(root)).violations).toEqual([]);
    });

    it('red: the nested ignore files deleted — every generated path is named', () => {
      const root = capacitorApp(
        { '.gitignore': `${ROOT_IGNORE}\ngoogle-services.json\nGoogleService-Info.plist` },
        withGit
      );
      const violations = Law.check(ctx(root)).violations ?? [];
      expect(violations).toEqual(
        expect.arrayContaining([
          'Not ignored: android/app/src/main/assets/public (the web build cap sync copies)',
          'Not ignored: android/local.properties (machine-local SDK paths)',
          'Not ignored: ios/App/Pods (CocoaPods output)',
        ])
      );
      expect(violations).toHaveLength(11);
    });
  });

  it('red: a committed credential is found through the index, not the disk', () => {
    const root = capacitorApp(
      {
        '.gitignore': `${ROOT_IGNORE}\ngoogle-services.json\nGoogleService-Info.plist`,
        'android/.gitignore': ANDROID_IGNORE,
        'ios/.gitignore': IOS_IGNORE,
        'android/app/google-services.json': '{"api_key":"x"}',
      },
      true
    );
    git(root, 'add', '-f', 'android/app/google-services.json');
    expect(Law.check(ctx(root)).violations).toEqual([
      expect.stringMatching(/^Tracked credential file: android\/app\/google-services\.json — remove it from the index/),
    ]);
  });

  it('an ignored, untracked credential on disk is what a correct project has — green', () => {
    const root = capacitorApp(
      {
        '.gitignore': `${ROOT_IGNORE}\ngoogle-services.json\nGoogleService-Info.plist`,
        'android/.gitignore': ANDROID_IGNORE,
        'ios/.gitignore': IOS_IGNORE,
        'android/app/google-services.json': '{"api_key":"x"}',
      },
      true
    );
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });

  it('a project without Capacitor is asked for nothing more', () => {
    const root = project({
      'package.json': manifest({ '@angular/core': '20.0.0' }),
      '.gitignore': ROOT_IGNORE,
      'android/build.gradle': '',
    });
    expect(Law.check(ctx(root)).violations).toEqual([]);
  });
});
