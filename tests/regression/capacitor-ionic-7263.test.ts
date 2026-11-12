/**
 * Capacitor / Ionic residuals of the 7.26.1 QA run (#298, #299, #300, #308,
 * #312). Each block reproduces the issue's overlay and asserts the corrected
 * contract; every one of them is red against the source before the fix.
 */
import fs from 'fs';
import path from 'path';
import { CapacitorAndroidBackupScopedLaw } from '../../src/checkers/capacitor-laws/capacitor-android-backup-scoped';
import { CapacitorAndroidCleartextDebugOnlyLaw } from '../../src/checkers/capacitor-laws/capacitor-android-cleartext-debug-only';
import { CapacitorFirebaseNativeConfigNotSkippedLaw } from '../../src/checkers/capacitor-laws/capacitor-firebase-native-config-not-skipped';
import { CapacitorIosPrivacyManifestDeclaredLaw } from '../../src/checkers/capacitor-laws/capacitor-ios-privacy-manifest-declared';
import { CapacitorLocalPluginContractLaw } from '../../src/checkers/capacitor-laws/capacitor-local-plugin-contract';
import { CapacitorPluginStubHasContractTestLaw } from '../../src/checkers/capacitor-laws/capacitor-plugin-stub-has-contract-test';
import { IonicViewportFitCoverLaw } from '../../src/checkers/ionic-laws/ionic-viewport-fit-cover';
import { IONIC_RENDERING_LAWS } from '../../src/data/ionic-rendering-laws';
import { ModularLawsRegistry } from '../../src/registry/modular-laws-registry';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { IGNORING_SHELLS, MANIFEST, capacitorProject, track } from '../checkers/capacitor-laws/capacitor-fixture';
import { ctx, manifest, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

const ANDROID = { '@capacitor/android': '8.5.1' };
const app = (attributes = '') =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application android:label="x" ${attributes}>\n</application>\n</manifest>`;
const cleartext = (files: Record<string, string>) =>
  CapacitorAndroidCleartextDebugOnlyLaw.check(ctx(capacitorProject(files, {}, ANDROID), IGNORING_SHELLS));

describe('#298 cleartext: redirected, missing and resource-valued manifests are judged, not passed', () => {
  const CUSTOM = 'android/app/custom/AndroidManifest.xml';

  it('red: main redirected outside app/src with a sourceSets block', () => {
    const result = cleartext({
      'android/app/build.gradle': 'android {\n  sourceSets {\n    main {\n      manifest.srcFile "custom/AndroidManifest.xml"\n    }\n  }\n}\n',
      [CUSTOM]: app('android:usesCleartextTraffic="true"'),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/custom\/AndroidManifest\.xml: android:usesCleartextTraffic="true" — the build script ships this manifest \(sourceSets\.main\.manifest\.srcFile\)/),
    ]);
  });

  it('red: main redirected outside app/src with the dotted form', () => {
    const result = cleartext({
      'android/app/build.gradle': 'android {\n  sourceSets.main.manifest.srcFile "custom/AndroidManifest.xml"\n}\n',
      [CUSTOM]: app('android:usesCleartextTraffic="true"'),
    });
    expect(result.violations).toEqual([expect.stringContaining('custom/AndroidManifest.xml: android:usesCleartextTraffic="true" — the build script ships this manifest')]);
  });

  it('red: a redirect to a manifest that does not exist is not judged', () => {
    const result = cleartext({
      [MANIFEST]: app(),
      'android/app/build.gradle': "android {\n  sourceSets.release.manifest.srcFile 'store/Missing.xml'\n}\n",
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/store\/Missing\.xml: does not exist — the build script ships it \(sourceSets\.release\.manifest\.srcFile\), so cleartext is not judged/),
    ]);
  });

  it('red: a srcFile whose target is a variable is not judged', () => {
    const result = cleartext({
      [MANIFEST]: app(),
      'android/app/build.gradle': 'def m = "custom/AndroidManifest.xml"\nandroid {\n  sourceSets.main.manifest.srcFile m\n}\n',
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/build\.gradle:3: manifest\.srcFile of main names its target with something other than a string literal — .*not judged/),
    ]);
  });

  it('red: a missing main manifest is reported as not read (Backup Scoped already was)', () => {
    const result = cleartext({ 'android/app/build.gradle': '', 'android/app/src/debug/AndroidManifest.xml': app() });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/src\/main\/AndroidManifest\.xml: does not exist — it is the main manifest every variant merges, so cleartext is not judged/),
    ]);
  });

  it('red: usesCleartextTraffic="@bool/x" resolved to true through res/values', () => {
    const result = cleartext({
      [MANIFEST]: app('android:usesCleartextTraffic="@bool/x"'),
      'android/app/src/main/res/values/bools.xml': '<resources>\n<bool name="x">true</bool>\n</resources>',
    });
    expect(result.violations).toEqual([
      expect.stringContaining('android:usesCleartextTraffic="@bool/x" (true in android/app/src/main/res/values/bools.xml) — src/main is merged into every variant'),
    ]);
  });

  it('red: a qualified values directory that turns it on counts too', () => {
    const result = cleartext({
      [MANIFEST]: app('android:usesCleartextTraffic="@bool/x"'),
      'android/app/src/main/res/values/bools.xml': '<resources><bool name="x">false</bool></resources>',
      'android/app/src/main/res/values-v28/bools.xml': '<resources><bool name="x">true</bool></resources>',
    });
    expect(result.violations).toEqual([expect.stringContaining('(true in android/app/src/main/res/values-v28/bools.xml)')]);
  });

  it('red: an unresolved @bool reference is not judged', () => {
    const result = cleartext({ [MANIFEST]: app('android:usesCleartextTraffic="@bool/missing"') });
    expect(result.violations).toEqual([
      expect.stringContaining('android:usesCleartextTraffic="@bool/missing" does not resolve to a <bool> in res/values* of main — not judged'),
    ]);
  });

  it('green: @bool/x resolved to false everywhere', () => {
    const result = cleartext({
      [MANIFEST]: app('android:usesCleartextTraffic="@bool/x"'),
      'android/app/src/main/res/values/bools.xml': '<resources><!-- <bool name="x">true</bool> --><bool name="x">false</bool></resources>',
    });
    expect(result.violations).toEqual([]);
  });

  it('green: a release overlay without <application> (it only removes a permission) is not a finding', () => {
    // A real app's shape: the release source set's manifest is an overlay the
    // merger folds into main; it has no <application> and needs none.
    const result = cleartext({
      [MANIFEST]: app(),
      'android/app/build.gradle': "android {\n  sourceSets.release.manifest.srcFile 'src/noBackground/AndroidManifest.xml'\n}\n",
      'android/app/src/noBackground/AndroidManifest.xml':
        '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools">\n  <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" tools:node="remove" />\n</manifest>',
    });
    expect(result.violations).toEqual([]);
  });

  it('control: a main manifest without <application> is still a finding', () => {
    const result = cleartext({
      [MANIFEST]: '<manifest xmlns:android="http://schemas.android.com/apk/res/android"></manifest>',
    });
    expect(result.violations).toEqual([expect.stringContaining('no readable <application> element')]);
  });

  it('control: a redirect inside app/src is still judged once, as shipped', () => {
    const result = cleartext({
      [MANIFEST]: app(),
      'android/app/build.gradle': "android {\n  sourceSets.release.manifest.srcFile 'src/shipped/AndroidManifest.xml'\n}\n",
      'android/app/src/shipped/AndroidManifest.xml': app('android:usesCleartextTraffic="true"'),
    });
    expect(result.violations).toEqual([expect.stringContaining('the build script ships this manifest (sourceSets.release.manifest.srcFile)')]);
  });
});

describe('#299 stub law: a mapper held in a variable is read, or reported as not read', () => {
  const DEPS = { '@capacitor/app': '8.0.0' };
  const run = (config: string) =>
    CapacitorPluginStubHasContractTestLaw.check(ctx(capacitorProject({ 'jest.config.js': config }, undefined, DEPS)));

  it('red: a same-file const object is followed, so the stub is found', () => {
    const result = run(
      "const stubs = {\n  '^@capacitor/app$': '<rootDir>/testing/capacitor-app.stub.ts',\n};\nmodule.exports = {\n  moduleNameMapper: stubs,\n};\n"
    );
    expect(result.violations).toEqual([
      expect.stringContaining('@capacitor/app is stubbed workspace-wide by jest.config.js (^@capacitor/app$ → <rootDir>/testing/capacitor-app.stub.ts)'),
    ]);
  });

  it('red: a const spread into the mapper is followed too', () => {
    const result = run(
      "const base = { '^@capacitor/app$': './app.stub.ts' };\nmodule.exports = { moduleNameMapper: { ...base, '^x$': './x.ts' } };\n"
    );
    expect(result.violations).toEqual([expect.stringContaining('@capacitor/app is stubbed workspace-wide by jest.config.js')]);
  });

  it('red: an imported mapper is not read, and says so naming the file', () => {
    const result = run("const { stubs } = require('./stubs');\nmodule.exports = { moduleNameMapper: stubs };\n");
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^jest\.config\.js:2: moduleNameMapper is `stubs`, which this law cannot read .* does not pass on it$/),
    ]);
  });

  it('red: a mapper built by a function call is not read either', () => {
    const result = run("module.exports = { moduleNameMapper: pathsToModuleNameMapper(paths) };\n");
    expect(result.violations).toEqual([expect.stringContaining('moduleNameMapper is `pathsToModuleNameMapper(paths)`, which this law cannot read')]);
  });
});

describe('#300 native-shell laws read the commit, not the disk', () => {
  const IGNORE_ANDROID = { '.gitignore': 'android/\nnode_modules/\n' };
  const BASE = ['package.json', 'capacitor.config.ts', '.gitignore'];
  const GREEN_BACKUP = app('android:allowBackup="false"');

  it('red: Backup Scoped — a green manifest that exists only on disk (android/ ignored)', () => {
    const root = capacitorProject({ ...IGNORE_ANDROID, [MANIFEST]: GREEN_BACKUP }, {}, ANDROID);
    track(root, ...BASE);
    const result = CapacitorAndroidBackupScopedLaw.check(ctx(root, IGNORING_SHELLS));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining('AndroidManifest.xml: exists on this disk but git ignores it, so a clean checkout of the commit does not have it'),
    ]);
  });

  it('green: Backup Scoped — the tracked manifest is read from the index, even after the disk copy is deleted', () => {
    const root = capacitorProject({ '.gitignore': 'node_modules/\n', [MANIFEST]: GREEN_BACKUP }, {}, ANDROID);
    track(root, ...BASE, MANIFEST);
    fs.rmSync(path.join(root, MANIFEST));
    const result = CapacitorAndroidBackupScopedLaw.check(ctx(root, IGNORING_SHELLS));
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: Cleartext — an untracked main manifest is not read', () => {
    const root = capacitorProject({ '.gitignore': 'node_modules/\n', [MANIFEST]: app() }, {}, ANDROID);
    track(root, ...BASE);
    const result = CapacitorAndroidCleartextDebugOnlyLaw.check(ctx(root, IGNORING_SHELLS));
    expect(result.violations).toEqual([
      expect.stringContaining('AndroidManifest.xml: exists on this disk but is not tracked by git'),
    ]);
  });

  it('red: Firebase — an ignored build script is not read', () => {
    const root = capacitorProject(
      { ...IGNORE_ANDROID, [MANIFEST]: app(), 'android/app/build.gradle': "apply plugin: 'com.google.gms.google-services'\n" },
      {},
      { ...ANDROID, '@capacitor/push-notifications': '8.0.0' }
    );
    track(root, ...BASE);
    const result = CapacitorFirebaseNativeConfigNotSkippedLaw.check(ctx(root, IGNORING_SHELLS));
    expect(result.violations).toEqual([
      expect.stringContaining('android/app/build.gradle exists on this disk but git ignores it'),
    ]);
  });

  it('green: Firebase — the same script tracked', () => {
    const root = capacitorProject(
      { '.gitignore': 'node_modules/\n', [MANIFEST]: app(), 'android/app/build.gradle': "apply plugin: 'com.google.gms.google-services'\n" },
      {},
      { ...ANDROID, '@capacitor/push-notifications': '8.0.0' }
    );
    track(root, ...BASE, 'android/app/build.gradle');
    expect(CapacitorFirebaseNativeConfigNotSkippedLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([]);
  });

  describe('Local Plugin Contract', () => {
    const JAVA_DIR = 'android/app/src/main/java/com/example/app';
    const files = {
      'src/app/settings.ts': [
        "import { registerPlugin } from '@capacitor/core';",
        'export interface SettingsPlugin { open(): Promise<void>; }',
        "export const Settings = registerPlugin<SettingsPlugin>('Settings');",
      ].join('\n'),
      [`${JAVA_DIR}/SettingsPlugin.java`]: [
        'package com.example.app;',
        '@CapacitorPlugin(name = "Settings")',
        'public class SettingsPlugin extends Plugin {',
        '    @PluginMethod',
        '    public void open(PluginCall call) { call.resolve(); }',
        '}',
      ].join('\n'),
      [`${JAVA_DIR}/MainActivity.java`]: [
        'package com.example.app;',
        'public class MainActivity extends BridgeActivity {',
        '    public void onCreate(Bundle savedInstanceState) {',
        '        registerPlugin(SettingsPlugin.class);',
        '        super.onCreate(savedInstanceState);',
        '    }',
        '}',
      ].join('\n'),
    };

    it('red: a plugin class that exists only on disk does not satisfy the contract', () => {
      const root = capacitorProject({ '.gitignore': 'node_modules/\n', ...files });
      track(root, ...BASE, 'src/app/settings.ts', `${JAVA_DIR}/MainActivity.java`);
      const result = CapacitorLocalPluginContractLaw.check(ctx(root, IGNORING_SHELLS));
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([expect.stringContaining('no class under android/app/src/main/java|kotlin has @CapacitorPlugin(name = "Settings")')]);
    });

    it('green: the same files tracked', () => {
      const root = capacitorProject({ '.gitignore': 'node_modules/\n', ...files });
      track(root, ...BASE, 'src/app/settings.ts', JAVA_DIR);
      expect(CapacitorLocalPluginContractLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([]);
    });
  });

  describe('iOS Privacy Manifest: tracked, not merely not ignored', () => {
    const PRIVACY = 'ios/App/App/PrivacyInfo.xcprivacy';
    const files = {
      '.gitignore': 'node_modules/\n',
      'ios/App/App/Info.plist': '<plist><dict/></plist>',
      [PRIVACY]:
        '<plist><dict><key>NSPrivacyAccessedAPITypes</key><array><dict><key>NSPrivacyAccessedAPIType</key><string>NSPrivacyAccessedAPICategoryUserDefaults</string><key>NSPrivacyAccessedAPITypeReasons</key><array><string>CA92.1</string></array></dict></array></dict></plist>',
    };
    const deps = { '@capacitor/ios': '8.5.1', '@capacitor/preferences': '8.0.1' };

    it('red: untracked and not ignored', () => {
      const root = capacitorProject(files, {}, deps);
      track(root, ...BASE);
      expect(CapacitorIosPrivacyManifestDeclaredLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([
        expect.stringContaining(`${PRIVACY} exists here but is not tracked by git, so a clean checkout builds without it`),
      ]);
    });

    it('green: tracked', () => {
      const root = capacitorProject(files, {}, deps);
      track(root, ...BASE, PRIVACY);
      expect(CapacitorIosPrivacyManifestDeclaredLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([]);
    });
  });
});

describe('#308 applicableFrameworks follows requires, not description words', () => {
  const laws = ModularLawsRegistry.getAll();
  const byName = (name: string) => laws.find(law => law.name === name)!;

  it.each(['Ionic No Skip Location Change', 'Ionic Unique URL Key Per View'])('%s is an Ionic law', name => {
    expect(byName(name).applicableFrameworks).toEqual(['ionic']);
  });

  it('no law gated only on framework packages is rendered as universal', () => {
    const framework = /^(@ionic\/|@capacitor\/|@capacitor-firebase\/|@angular\/|@ngrx\/|react$|next$|vue$)/;
    const universal = laws
      .filter(law => (law.requires?.anyDependency ?? []).length > 0)
      .filter(law => law.requires!.anyDependency!.every(name => framework.test(name)))
      .filter(law => law.applicableFrameworks.includes('*'))
      .map(law => law.name);
    expect(universal).toEqual([]);
  });

  it('control: a law any non-framework package satisfies stays universal', () => {
    expect(byName('Client IP Single Boundary').applicableFrameworks).toEqual(['*']);
  });
});

describe('#312 viewport-fit=cover reaches a Capacitor iOS app without Ionic', () => {
  const card = IONIC_RENDERING_LAWS.find(law => law.title === 'Ionic Viewport Fit Cover')!;
  const CAP_IOS = { '@capacitor/core': '8.5.1', '@capacitor/ios': '8.5.1' };
  const INDEX = '<!doctype html>\n<html>\n<head>\n<meta name="viewport" content="width=device-width, initial-scale=1" />\n</head>\n<body></body>\n</html>\n';

  it('is selected for @capacitor/core + @capacitor/ios with no @ionic/*', () => {
    expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest(CAP_IOS) }))).toBe(true);
  });

  it('control: not selected for a Capacitor Android-only app or plain Angular', () => {
    expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest({ '@capacitor/core': '8.5.1', '@capacitor/android': '8.5.1' }) }))).toBe(false);
    expect(lawRequirementsMet(card.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
  });

  it('red in that app, without naming Ionic variables it does not have', () => {
    const root = project({ 'package.json': manifest(CAP_IOS), 'src/index.html': INDEX });
    const result = IonicViewportFitCoverLaw.check(ctx(root));
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/index\.html:4: <meta name="viewport"> has no viewport-fit=cover — .*every env\(safe-area-inset-\*\) rule is inert$/),
    ]);
    expect((result.violations ?? []).join()).not.toContain('--ion-safe-area');
  });
});
