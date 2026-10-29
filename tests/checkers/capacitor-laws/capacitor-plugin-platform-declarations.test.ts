/**
 * CapacitorPluginPlatformDeclarations (#158): opens the native shell by fixed path,
 * although every fixture here excludes android/ and ios/ from the scan.
 */
import { CapacitorPluginPlatformDeclarationsLaw } from '../../../src/checkers/capacitor-laws/capacitor-plugin-platform-declarations';
import { ctx, removeProjects } from '../toolkit-fixture';
import { IGNORING_SHELLS, MANIFEST, androidManifest, capacitorProject } from './capacitor-fixture';

afterAll(removeProjects);

describe('CapacitorPluginPlatformDeclarationsLaw (#158)', () => {
  const PUSH = { '@capacitor/push-notifications': '8.1.3' };

  it('red: push installed, manifest without POST_NOTIFICATIONS, channel meta-data or createChannel', () => {
    const root = capacitorProject({ [MANIFEST]: androidManifest() }, {}, PUSH);
    const result = CapacitorPluginPlatformDeclarationsLaw.check(ctx(root, IGNORING_SHELLS));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^android\/app\/src\/main\/AndroidManifest\.xml: @capacitor\/push-notifications needs .*POST_NOTIFICATIONS/),
      expect.stringContaining('default_notification_channel_id'),
      expect.stringMatching(/^the app source: .*createChannel/),
    ]);
  });

  it('green: all three present', () => {
    const root = capacitorProject(
      {
        [MANIFEST]: androidManifest(
          '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
          '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" android:value="alerts" />'
        ),
        'src/app/push.ts': "await PushNotifications.createChannel({ id: 'alerts', name: 'Alerts', importance: 5 });",
      },
      {},
      PUSH
    );
    expect(CapacitorPluginPlatformDeclarationsLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([]);
  });

  it('a platform that was never added is not judged', () => {
    const root = capacitorProject({}, {}, PUSH);
    expect(CapacitorPluginPlatformDeclarationsLaw.check(ctx(root)).violations).toEqual([]);
  });

  it('geolocation: coarse alone is enough unless high accuracy is requested; iOS needs the usage string', () => {
    const coarse = '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />';
    const files = {
      [MANIFEST]: androidManifest(coarse),
      'ios/App/App/Info.plist': '<plist><dict><key>CFBundleName</key><string>x</string></dict></plist>',
      'src/app/where.ts': 'Geolocation.getCurrentPosition({ enableHighAccuracy: false });',
    };
    const root = capacitorProject(files, {}, { '@capacitor/geolocation': '8.2.4' });
    expect(CapacitorPluginPlatformDeclarationsLaw.check(ctx(root, IGNORING_SHELLS)).violations).toEqual([
      expect.stringMatching(/^ios\/App\/App\/Info\.plist: .*NSLocationWhenInUseUsageDescription/),
    ]);

    const precise = capacitorProject(
      { ...files, 'src/app/where.ts': 'Geolocation.getCurrentPosition({ enableHighAccuracy: true });' },
      {},
      { '@capacitor/geolocation': '8.2.4' }
    );
    expect(CapacitorPluginPlatformDeclarationsLaw.check(ctx(precise, IGNORING_SHELLS)).violations).toEqual([
      expect.stringContaining('ACCESS_FINE_LOCATION'),
      expect.stringContaining('NSLocationWhenInUseUsageDescription'),
    ]);
  });
});
