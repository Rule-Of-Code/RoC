/**
 * CapacitorDeepLinkContract (#159): opens the native shell by fixed path,
 * although every fixture here excludes android/ and ios/ from the scan.
 */
import { CapacitorDeepLinkContractLaw } from '../../../src/checkers/capacitor-laws/capacitor-deep-link-contract';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, MANIFEST, androidManifest, capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

describe('CapacitorDeepLinkContractLaw (#159)', () => {
  const FILTER = [
    '<intent-filter android:autoVerify="true">',
    '  <action android:name="android.intent.action.VIEW" />',
    '  <category android:name="android.intent.category.DEFAULT" />',
    '  <category android:name="android.intent.category.BROWSABLE" />',
    '  <data android:scheme="https" android:host="app.example" android:pathPrefix="/i/" />',
    '</intent-filter>',
  ].join('\n');
  const LISTENER = "App.addListener('appUrlOpen', ({ url }) => this.router.navigateByUrl(new URL(url).pathname));";
  const ENTITLEMENTS =
    '<plist><dict><key>com.apple.developer.associated-domains</key><array><string>applinks:app.example</string></array></dict></plist>';
  const IOS = { 'ios/App/App.xcodeproj/project.pbxproj': '// pbx' };
  const run = (files: Record<string, string>) =>
    CapacitorDeepLinkContractLaw.check(ctx(capacitorProject(files), IGNORING_SHELLS));

  it('red: Android filter and iOS project, listener present, no entitlements (the measured state)', () => {
    const result = run({ [MANIFEST]: androidManifest(FILTER), ...IOS, 'src/app/links.ts': LISTENER });
    expect(result.violations).toEqual([
      expect.stringMatching(/no applinks: associated-domains entitlement — the listener never fires on iOS \(hosts elsewhere: app\.example\)/),
    ]);
  });

  it('red: a filter with no listener', () => {
    const result = run({ [MANIFEST]: androidManifest(FILTER) });
    expect(result.violations).toEqual([
      expect.stringMatching(/https links are declared for app\.example and no App\.addListener\('appUrlOpen'\)/),
    ]);
  });

  it('red: a listener with no Android filter', () => {
    const result = run({ [MANIFEST]: androidManifest(), 'src/app/links.ts': LISTENER });
    expect(result.violations).toEqual([expect.stringContaining('the listener never fires on Android')]);
  });

  it('green: all three agree', () => {
    const result = run({
      [MANIFEST]: androidManifest(FILTER),
      ...IOS,
      'ios/App/App/App.entitlements': ENTITLEMENTS,
      'src/app/links.ts': LISTENER,
    });
    expect(result.violations).toEqual([]);
  });

  it('green: no deep links anywhere; a custom scheme is not an https link', () => {
    const custom = FILTER.replace('android:scheme="https"', 'android:scheme="myapp"');
    expect(run({ [MANIFEST]: androidManifest(custom), ...IOS }).violations).toEqual([]);
  });
});
