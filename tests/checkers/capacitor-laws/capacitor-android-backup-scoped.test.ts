/**
 * CapacitorAndroidBackupScoped (#260): the main manifest's backup decision,
 * read by fixed path although the fixtures exclude android/ from the scan.
 */
import { CapacitorAndroidBackupScopedLaw } from '../../../src/checkers/capacitor-laws/capacitor-android-backup-scoped';
import { CAPACITOR_NATIVE_LAWS } from '../../../src/data/capacitor-native-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, MANIFEST, capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

const ANDROID = { '@capacitor/android': '8.5.1' };
const XML = 'android/app/src/main/res/xml';
const app = (attributes: string) =>
  `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n<application\n  ${attributes}\n  android:label="x">\n</application>\n</manifest>`;
const RULES = 'android:dataExtractionRules="@xml/data_extraction_rules" android:fullBackupContent="@xml/backup_rules"';
const RULE_FILES = {
  [`${XML}/data_extraction_rules.xml`]:
    '<data-extraction-rules><cloud-backup><exclude domain="sharedpref" path="session.xml"/></cloud-backup><device-transfer><exclude domain="sharedpref" path="session.xml"/></device-transfer></data-extraction-rules>',
  [`${XML}/backup_rules.xml`]: '<full-backup-content><exclude domain="database" path="."/></full-backup-content>',
};
const check = (files: Record<string, string>) =>
  CapacitorAndroidBackupScopedLaw.check(ctx(capacitorProject(files, {}, ANDROID), IGNORING_SHELLS));

describe('CapacitorAndroidBackupScopedLaw (#260)', () => {
  it('red: the template form — allowBackup="true", no rules', () => {
    const result = check({ [MANIFEST]: app('android:allowBackup="true"') });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/src\/main\/AndroidManifest\.xml: android:allowBackup="true" without android:dataExtractionRules .* and android:fullBackupContent/),
    ]);
  });

  it('red: allowBackup absent is Android\'s default true', () => {
    expect(check({ [MANIFEST]: app('android:icon="@mipmap/x"') }).violations).toEqual([
      expect.stringContaining("android:allowBackup absent (Android's default is true)"),
    ]);
  });

  it('red: only one of the two rule files, or a reference to a file that does not exist', () => {
    const one = check({
      [MANIFEST]: app('android:allowBackup="true" android:dataExtractionRules="@xml/data_extraction_rules"'),
      ...RULE_FILES,
    });
    expect(one.violations).toEqual([expect.stringMatching(/without android:fullBackupContent \(Android 11 and lower\)/)]);

    const dangling = check({ [MANIFEST]: app(`android:allowBackup="true" ${RULES}`) });
    expect(dangling.violations).toEqual([expect.stringContaining('(no such res/xml file)')]);
  });

  it('green: allowBackup="false"', () => {
    expect(check({ [MANIFEST]: app('android:allowBackup="false"') }).passed).toBe(true);
  });

  it('green: allowBackup="true" with both rule files; what they exclude is reported, not judged', () => {
    const result = check({ [MANIFEST]: app(`android:allowBackup="true" ${RULES}`), ...RULE_FILES });
    expect(result.violations).toEqual([]);
    expect(result.details).toEqual([
      expect.stringMatching(/data_extraction_rules\.xml: excludes sharedpref:session\.xml$/),
      expect.stringMatching(/backup_rules\.xml: excludes database:\.$/),
    ]);
  });

  it('control: a commented-out allowBackup="false" does not count', () => {
    const manifest = app('android:allowBackup="true"').replace('<application', '<!-- <application android:allowBackup="false"> -->\n<application');
    expect(check({ [MANIFEST]: manifest }).passed).toBe(false);
  });

  it('cannot read: a placeholder, a missing manifest, or no android/ shell fails', () => {
    expect(check({ [MANIFEST]: app('android:allowBackup="${backup}"') }).violations).toEqual([
      expect.stringContaining('is filled in by the build — not judged'),
    ]);
    // #300: a missing file now says so; a manifest without <application> keeps the old message.
    expect(check({ 'android/app/build.gradle': '' }).violations).toEqual([
      expect.stringContaining('AndroidManifest.xml: does not exist — this law reads the committed main manifest'),
    ]);
    expect(check({ [MANIFEST]: '<manifest></manifest>' }).violations).toEqual([
      expect.stringContaining('no readable <application> element'),
    ]);
    expect(check({}).violations).toEqual([expect.stringContaining('no android/ shell exists')]);
  });
});

describe('selection (#260 requires @capacitor/core AND @capacitor/android AND a config)', () => {
  const card = CAPACITOR_NATIVE_LAWS.find(law => law.title === 'Capacitor Android Backup Scoped')!;

  it('selected with the Android platform, not without it', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, ANDROID))).toBe(true);
    expect(lawRequirementsMet(card.requires, capacitorProject())).toBe(false);
  });
});
