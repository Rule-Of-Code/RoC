/**
 * The Capacitor laws that read platform code read every module extension
 * (#645). Capacitor Single Platform Boundary, Capacitor Deep Link Contract and
 * Capacitor Plugin Platform Declarations listed `.ts .tsx .js .jsx .vue`, so a
 * module in `.mts`, `.mjs`, `.cts` or `.cjs` was not read and nothing said so.
 */
import { CapacitorDeepLinkContractLaw } from '../../../src/checkers/capacitor-laws/capacitor-deep-link-contract';
import { CapacitorPluginPlatformDeclarationsLaw } from '../../../src/checkers/capacitor-laws/capacitor-plugin-platform-declarations';
import { CapacitorSinglePlatformBoundaryLaw } from '../../../src/checkers/capacitor-laws/capacitor-single-platform-boundary';
import { ctx, removeProjects } from '../toolkit-fixture';
import {
  IGNORING_SHELLS,
  MANIFEST,
  androidManifest,
  capacitorProject,
} from './capacitor-fixture';

afterAll(removeProjects);

const MODULE_EXTENSIONS = ['.mts', '.mjs', '.cts', '.cjs'];
const CONTROL_EXTENSIONS = ['.ts', '.js'];

describe('Capacitor Single Platform Boundary reads every module extension (#645)', () => {
  const NATIVE = [
    "import { Capacitor } from '@capacitor/core';",
    'export const platform = () => Capacitor.getPlatform();',
  ].join('\n');
  const FEATURE = [
    "import { Capacitor } from '@capacitor/core';",
    "export const isIos = () => Capacitor.getPlatform() === 'ios';",
  ].join('\n');
  const run = (featureFile: string) =>
    CapacitorSinglePlatformBoundaryLaw.check(
      ctx(
        capacitorProject({
          'src/native/platform.ts': NATIVE,
          [featureFile]: FEATURE,
        }),
        { thresholds: { capacitor: { boundary: ['src/native/**'] } } }
      )
    );

  it.each([...CONTROL_EXTENSIONS, ...MODULE_EXTENSIONS])(
    'a feature file in %s outside the boundary is reported',
    extension => {
      const result = run(`src/features/feature${extension}`);
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        `src/features/feature${extension}: uses @capacitor/core, Capacitor.getPlatform() outside thresholds.capacitor.boundary — feature code that knows its platform grows a branch per target. Move it behind a port in the boundary`,
      ]);
    }
  );
});

describe('Capacitor Deep Link Contract reads every module extension (#645)', () => {
  const FILTER = [
    '<intent-filter android:autoVerify="true">',
    '  <action android:name="android.intent.action.VIEW" />',
    '  <category android:name="android.intent.category.DEFAULT" />',
    '  <category android:name="android.intent.category.BROWSABLE" />',
    '  <data android:scheme="https" android:host="app.example" android:pathPrefix="/i/" />',
    '</intent-filter>',
  ].join('\n');
  const LISTENER =
    "App.addListener('appUrlOpen', ({ url }) => router.navigateByUrl(new URL(url).pathname));";

  it.each([...CONTROL_EXTENSIONS, ...MODULE_EXTENSIONS])(
    'a listener in %s is seen: the Android filter has its listener',
    extension => {
      const result = CapacitorDeepLinkContractLaw.check(
        ctx(
          capacitorProject({
            [MANIFEST]: androidManifest(FILTER),
            [`src/app/links${extension}`]: LISTENER,
          }),
          IGNORING_SHELLS
        )
      );
      expect(result.violations).toEqual([]);
    }
  );

  it('control: without the listener the filter is reported', () => {
    const result = CapacitorDeepLinkContractLaw.check(
      ctx(
        capacitorProject({ [MANIFEST]: androidManifest(FILTER) }),
        IGNORING_SHELLS
      )
    );
    expect(result.violations).toEqual([
      expect.stringMatching(/no App\.addListener\('appUrlOpen'\)/),
    ]);
  });
});

describe('Capacitor Plugin Platform Declarations reads every module extension (#645)', () => {
  const PUSH = { '@capacitor/push-notifications': '8.1.3' };
  const MANIFEST_WITH_DECLARATIONS = androidManifest(
    '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="alerts" />'
  );
  const CREATE_CHANNEL =
    "await PushNotifications.createChannel({ id: 'alerts', name: 'Alerts', importance: 5 });";

  it.each([...CONTROL_EXTENSIONS, ...MODULE_EXTENSIONS])(
    'createChannel in %s is seen',
    extension => {
      const root = capacitorProject(
        {
          [MANIFEST]: MANIFEST_WITH_DECLARATIONS,
          [`src/app/push${extension}`]: CREATE_CHANNEL,
        },
        {},
        PUSH
      );
      expect(
        CapacitorPluginPlatformDeclarationsLaw.check(ctx(root, IGNORING_SHELLS))
          .violations
      ).toEqual([]);
    }
  );

  it('control: without createChannel the source is reported', () => {
    const root = capacitorProject(
      { [MANIFEST]: MANIFEST_WITH_DECLARATIONS },
      {},
      PUSH
    );
    expect(
      CapacitorPluginPlatformDeclarationsLaw.check(ctx(root, IGNORING_SHELLS))
        .violations
    ).toEqual([expect.stringMatching(/^the app source: .*createChannel/)]);
  });
});
