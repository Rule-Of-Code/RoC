/**
 * CapacitorAndroidCleartextDebugOnly (#255): every source set's manifest and
 * the network security config it names, read by fixed path although every
 * fixture here excludes android/ from the scan.
 */
import { CapacitorAndroidCleartextDebugOnlyLaw } from '../../../src/checkers/capacitor-laws/capacitor-android-cleartext-debug-only';
import { CAPACITOR_NATIVE_LAWS } from '../../../src/data/capacitor-native-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, MANIFEST, capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const ANDROID = { '@capacitor/android': '8.5.1' };
const DEBUG_MANIFEST = 'android/app/src/debug/AndroidManifest.xml';
const app = (attributes = '') =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application android:label="x" ${attributes}>\n</application>\n</manifest>`;
const config = (body: string) => `<?xml version="1.0" encoding="utf-8"?>\n<network-security-config>\n${body}\n</network-security-config>`;
const loopback = config(
  '<domain-config cleartextTrafficPermitted="true">\n<domain includeSubdomains="false">localhost</domain>\n<domain>10.0.2.2</domain>\n</domain-config>'
);
const check = (files: Record<string, string>) =>
  CapacitorAndroidCleartextDebugOnlyLaw.check(ctx(capacitorProject(files, {}, ANDROID), IGNORING_SHELLS));

describe('CapacitorAndroidCleartextDebugOnlyLaw (#255)', () => {
  it('red: usesCleartextTraffic="true" in src/main ships in every variant', () => {
    const result = check({ [MANIFEST]: app('android:usesCleartextTraffic="true"') });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/src\/main\/AndroidManifest\.xml: android:usesCleartextTraffic="true" — src\/main is merged into every variant/),
    ]);
  });

  it('red: a base-config permitting cleartext, referenced from src/main', () => {
    const result = check({
      [MANIFEST]: app('android:networkSecurityConfig="@xml/network_security_config"'),
      'android/app/src/main/res/xml/network_security_config.xml': config('<base-config cleartextTrafficPermitted="true"/>'),
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/src\/main\/res\/xml\/network_security_config\.xml: <base-config cleartextTrafficPermitted="true">.*ships in the release APK/),
    ]);
  });

  it('red: a domain-config for localhost in src/main still ships', () => {
    const result = check({
      [MANIFEST]: app('android:networkSecurityConfig="@xml/nsc"'),
      'android/app/src/main/res/xml/nsc.xml': loopback,
    });
    expect(result.violations).toEqual([expect.stringContaining('for localhost, 10.0.2.2')]);
  });

  it('red: an opening in src/release ships too', () => {
    const result = check({
      [MANIFEST]: app(),
      'android/app/src/release/AndroidManifest.xml': app('android:usesCleartextTraffic="true"'),
    });
    expect(result.violations).toEqual([expect.stringContaining('the release source set ships')]);
  });

  it('red: a manifest the build script routes release to is treated as shipped', () => {
    const result = check({
      [MANIFEST]: app(),
      'android/app/build.gradle': "android {\n  sourceSets.release.manifest.srcFile 'src/store/AndroidManifest.xml'\n}\n",
      'android/app/src/store/AndroidManifest.xml': app('android:usesCleartextTraffic="true"'),
    });
    expect(result.violations).toEqual([
      expect.stringContaining('sourceSets.release.manifest.srcFile'),
    ]);
  });

  it('red: a debug opening that names a non-loopback host, or every host', () => {
    const debugHost = check({
      [MANIFEST]: app(),
      [DEBUG_MANIFEST]: app('android:networkSecurityConfig="@xml/dev"'),
      'android/app/src/debug/res/xml/dev.xml': config(
        '<domain-config cleartextTrafficPermitted="true"><domain>localhost</domain><domain>api.example.com</domain></domain-config>'
      ),
    });
    expect(debugHost.violations).toEqual([expect.stringContaining('opens api.example.com for the debug builds')]);

    const debugAll = check({ [MANIFEST]: app(), [DEBUG_MANIFEST]: app('android:usesCleartextTraffic="true"') });
    expect(debugAll.violations).toEqual([expect.stringContaining('opens cleartext to every host for the debug builds')]);
  });

  it('red: a nested domain-config inherits its parent\'s permission', () => {
    const result = check({
      [MANIFEST]: app('android:networkSecurityConfig="@xml/nsc"'),
      'android/app/src/main/res/xml/nsc.xml': config(
        '<domain-config cleartextTrafficPermitted="true"><domain>a.example</domain><domain-config><domain>b.example</domain></domain-config></domain-config>'
      ),
    });
    expect(result.violations).toEqual([
      expect.stringContaining('for b.example'),
      expect.stringContaining('for a.example'),
    ]);
  });

  it('green: src/main clean, a debug source set opening only loopback hosts', () => {
    const result = check({
      [MANIFEST]: app('android:usesCleartextTraffic="false"'),
      [DEBUG_MANIFEST]: app('android:networkSecurityConfig="@xml/dev"'),
      'android/app/src/debug/res/xml/dev.xml': loopback,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: a src/main config that keeps cleartext off; a commented-out opening is not an opening', () => {
    const result = check({
      [MANIFEST]: app('android:networkSecurityConfig="@xml/nsc"').replace('<application', '<!-- <application android:usesCleartextTraffic="true"> -->\n<application'),
      'android/app/src/main/res/xml/nsc.xml': config('<base-config cleartextTrafficPermitted="false"/>\n<!-- <base-config cleartextTrafficPermitted="true"/> -->'),
    });
    expect(result.violations).toEqual([]);
  });

  it('control: the debug config is found through main\'s res/xml when the set has none of its own', () => {
    const result = check({
      [MANIFEST]: app(),
      [DEBUG_MANIFEST]: app('android:networkSecurityConfig="@xml/shared"'),
      'android/app/src/main/res/xml/shared.xml': config('<base-config cleartextTrafficPermitted="true"/>'),
    });
    expect(result.violations).toEqual([expect.stringContaining('main/res/xml/shared.xml: <base-config')]);
  });

  it('cannot read: a placeholder or an unresolved reference fails, never passes', () => {
    const result = check({
      [MANIFEST]: app('android:usesCleartextTraffic="${cleartext}" android:networkSecurityConfig="@xml/missing"'),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining('is filled in by the build — not judged'),
      expect.stringContaining('does not resolve to a file in res/xml of main — not judged'),
    ]);
  });

  it('cannot read: @capacitor/android declared but no android/ shell fails, saying so', () => {
    const result = check({});
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('@capacitor/android is declared but no android/ shell exists')]);
  });
});

describe('selection (#255 requires @capacitor/core AND @capacitor/android AND a config)', () => {
  const card = CAPACITOR_NATIVE_LAWS.find(law => law.title === 'Capacitor Android Cleartext Debug Only')!;

  it('is selected where Capacitor and its Android platform are declared', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, ANDROID))).toBe(true);
  });

  it('is not selected in an iOS-only Capacitor project', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, { '@capacitor/ios': '8.5.1' }))).toBe(false);
  });
});
