/**
 * Capacitor Plugin Platform Declarations
 *
 * A plugin's bundled AndroidManifest.xml declares what the plugin's native
 * code needs, not the permission or usage string for the feature the APP
 * turned on — and cap sync adds nothing. All of it is static, and all of it
 * lives in files most projects exclude from the scan (android/, ios/), so the
 * law opens them by their fixed paths.
 *
 * Table-driven, and each row carries the version and the file it was read
 * from. A row is only as right as its source; extend it one plugin per change.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorProject, CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { FileUtils } from '../../utils/file-utils';
import { declaredDependencies } from '../../utils/law-requirements';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

interface Declaration {
  /** What the app must contain, in words the message can quote. */
  needs: string;
  platform: 'android' | 'ios' | 'source';
  present: (text: string, source: string) => boolean;
  source: string;
}

const androidPermission = (name: string) => (manifest: string) =>
  new RegExp(`<uses-permission[^>]*android:name=["']android\\.permission\\.${name}["']`).test(manifest);
const metaData = (name: string) => (manifest: string) =>
  new RegExp(`<meta-data[^>]*android:name=["']${name.replace(/\./g, '\\.')}["']`).test(manifest);
const plistKey = (name: string) => (plist: string) => new RegExp(`<key>\\s*${name}\\s*</key>`).test(plist);

export const PLUGIN_DECLARATIONS: Readonly<Record<string, Declaration[]>> = {
  '@capacitor/push-notifications': [
    {
      needs: '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
      platform: 'android',
      present: androidPermission('POST_NOTIFICATIONS'),
      source: 'PushNotificationsPlugin.java:39 requests it via @Permission (8.1.3); an undeclared permission is never granted',
    },
    {
      needs: '<meta-data android:name="com.google.firebase.messaging.default_notification_channel_id" …/>',
      platform: 'android',
      present: metaData('com.google.firebase.messaging.default_notification_channel_id'),
      source: 'README 8.1.3 :69-74',
    },
    {
      needs: 'a createChannel(…) call matching that channel id',
      platform: 'source',
      present: (_text, source) => /\bcreateChannel\s*\(/.test(source),
      source: 'README 8.1.3 :81 — without it the SDK falls back to its default channel',
    },
  ],
  '@capacitor/geolocation': [
    {
      needs: '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
      platform: 'android',
      present: androidPermission('ACCESS_COARSE_LOCATION'),
      source: 'README 8.2.4 :38',
    },
    {
      needs: '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" /> (coarse alone only when enableHighAccuracy is never true)',
      platform: 'android',
      present: (manifest, source) =>
        androidPermission('ACCESS_FINE_LOCATION')(manifest) || !/\benableHighAccuracy\s*:\s*true\b/.test(source),
      source: 'README 8.2.4 :39, :47',
    },
    {
      needs: '<key>NSLocationWhenInUseUsageDescription</key>',
      platform: 'ios',
      present: plistKey('NSLocationWhenInUseUsageDescription'),
      source: 'README 8.2.4 :17',
    },
  ],
};

export class CapacitorPluginPlatformDeclarationsLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Plugin Platform Declarations';

  static check(context: LawCheckContext): LawResult {
    const installed = declaredDependencies(context.projectRoot);
    const plugins = Object.keys(PLUGIN_DECLARATIONS).filter(name => installed.has(name));
    const source = plugins.length > 0 ? this.sourceText(context) : '';
    const violations = plugins.length === 0
      ? []
      : CapacitorProjects.find(context.projectRoot).flatMap(project =>
          this.checkProject(context, project, plugins, source)
        );
    return this.createResult(
      violations,
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'Add what each installed plugin lists under Android permissions / iOS usage descriptions to android/app/src/main/AndroidManifest.xml and ios/App/App/Info.plist',
      ],
      context
    );
  }

  private static checkProject(
    context: LawCheckContext,
    project: CapacitorProject,
    plugins: string[],
    source: string
  ): string[] {
    const native = CapacitorProjects.nativePaths(project, context.projectRoot);
    const files: Record<'android' | 'ios', { path: string; text: string | null }> = {
      android: { path: native.androidManifest, text: CapacitorProjects.readNative(native.androidManifest) },
      ios: { path: native.infoPlist, text: CapacitorProjects.readNative(native.infoPlist) },
    };
    const violations: string[] = [];
    for (const plugin of plugins) {
      for (const declaration of PLUGIN_DECLARATIONS[plugin] ?? []) {
        const file = declaration.platform === 'ios' ? files.ios : files.android;
        // A platform never added has nothing to declare.
        if (file.text === null || declaration.present(file.text, source)) continue;
        const where = declaration.platform === 'source' ? 'the app source' : relative(context, file.path);
        violations.push(`${where}: ${plugin} needs ${declaration.needs} and it is absent (${declaration.source})`);
      }
    }
    return violations;
  }

  private static sourceText(context: LawCheckContext): string {
    return FileUtils.scanForFiles(context.projectRoot, context.config, ['.ts', '.tsx', '.js', '.jsx', '.vue'], context.lawId, false)
      .map(file => TsClasses.mask(FileUtils.readFileContentSync(file) ?? ''))
      .join('\n');
  }
}
