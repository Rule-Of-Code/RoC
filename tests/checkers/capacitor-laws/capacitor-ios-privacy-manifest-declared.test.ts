/**
 * CapacitorIosPrivacyManifestDeclared (#264): the table's plugins against the
 * app's PrivacyInfo.xcprivacy, opened by fixed path although the fixtures
 * exclude ios/ from the scan.
 */
import fs from 'fs';
import path from 'path';
import { CapacitorIosPrivacyManifestDeclaredLaw } from '../../../src/checkers/capacitor-laws/capacitor-ios-privacy-manifest-declared';
import { CAPACITOR_NATIVE_LAWS } from '../../../src/data/capacitor-native-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, capacitorProject, track } from './capacitor-fixture';

afterAll(removeProjects);

const IOS_PREFERENCES = { '@capacitor/ios': '8.5.1', '@capacitor/preferences': '8.0.1' };
const INFO_PLIST = 'ios/App/App/Info.plist';
const PRIVACY = 'ios/App/App/PrivacyInfo.xcprivacy';
const plist = (entries: string) => `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>NSPrivacyAccessedAPITypes</key>
	<array>${entries}</array>
	<key>NSPrivacyTracking</key>
	<false/>
</dict>
</plist>`;
const entry = (category: string, reasons: string[]) => `
		<dict>
			<key>NSPrivacyAccessedAPIType</key>
			<string>${category}</string>
			<key>NSPrivacyAccessedAPITypeReasons</key>
			<array>${reasons.map(reason => `<string>${reason}</string>`).join('')}</array>
		</dict>`;
const USER_DEFAULTS = 'NSPrivacyAccessedAPICategoryUserDefaults';
const shell = { [INFO_PLIST]: '<plist><dict/></plist>' };
const run = (root: string) => CapacitorIosPrivacyManifestDeclaredLaw.check(ctx(root, IGNORING_SHELLS));
const check = (files: Record<string, string>, deps = IOS_PREFERENCES) => run(capacitorProject({ ...shell, ...files }, {}, deps));

describe('CapacitorIosPrivacyManifestDeclaredLaw (#264)', () => {
  it('red: @capacitor/preferences installed and no PrivacyInfo.xcprivacy', () => {
    const result = check({});
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^ios\/App\/App\/PrivacyInfo\.xcprivacy does not exist, .*@capacitor\/preferences → NSPrivacyAccessedAPICategoryUserDefaults \(e\.g\. CA92\.1/),
    ]);
  });

  it('red: the file exists without the category, or with the category and no reason', () => {
    const other = check({ [PRIVACY]: plist(entry('NSPrivacyAccessedAPICategoryFileTimestamp', ['C617.1'])) });
    expect(other.violations).toEqual([expect.stringContaining(`no NSPrivacyAccessedAPITypes entry for ${USER_DEFAULTS}`)]);

    const empty = check({ [PRIVACY]: plist(entry(USER_DEFAULTS, [])) });
    expect(empty.violations).toEqual([expect.stringContaining('is declared without a reason')]);
  });

  it('green: the category with a reason; the reason is reported, not judged', () => {
    const result = check({
      [PRIVACY]: plist(entry('NSPrivacyAccessedAPICategoryFileTimestamp', ['C617.1']) + entry(USER_DEFAULTS, ['CA92.1'])),
    });
    expect(result.violations).toEqual([]);
    expect(result.details).toEqual([expect.stringContaining(`${USER_DEFAULTS} declared with CA92.1 (reason not judged)`)]);
  });

  it('control: a manifest elsewhere under ios/App (another group) is found; one under Pods is not the app\'s', () => {
    const elsewhere = check({ 'ios/App/Resources/PrivacyInfo.xcprivacy': plist(entry(USER_DEFAULTS, ['CA92.1'])) });
    expect(elsewhere.violations).toEqual([]);

    const pods = check({ 'ios/App/Pods/Some/PrivacyInfo.xcprivacy': plist(entry(USER_DEFAULTS, ['CA92.1'])) });
    expect(pods.violations).toEqual([expect.stringContaining('does not exist')]);
  });

  it('red: a manifest git ignores is not in a clean checkout', () => {
    const root = capacitorProject(
      { ...shell, [PRIVACY]: plist(entry(USER_DEFAULTS, ['CA92.1'])), '.gitignore': 'PrivacyInfo.xcprivacy\n' },
      {},
      IOS_PREFERENCES
    );
    track(root, '.gitignore');
    expect(run(root).violations).toEqual([expect.stringContaining('exists here but git ignores it')]);
  });

  it('cannot read: @capacitor/ios declared but no ios/ shell fails, saying so', () => {
    const root = capacitorProject({}, {}, IOS_PREFERENCES);
    expect(fs.existsSync(path.join(root, 'ios'))).toBe(false);
    expect(run(root).violations).toEqual([expect.stringContaining('@capacitor/ios is declared but no ios/ shell exists')]);
  });
});

describe('selection (#264 requires @capacitor/ios AND a table plugin)', () => {
  const card = CAPACITOR_NATIVE_LAWS.find(law => law.title === 'Capacitor iOS Privacy Manifest Declared')!;

  it('selected with iOS and @capacitor/preferences', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, IOS_PREFERENCES))).toBe(true);
  });

  it('not selected without the iOS platform, nor without a table plugin', () => {
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, { '@capacitor/preferences': '8.0.1' }))).toBe(false);
    expect(lawRequirementsMet(card.requires, capacitorProject({}, {}, { '@capacitor/ios': '8.5.1' }))).toBe(false);
  });
});
