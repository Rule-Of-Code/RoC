/**
 * Capacitor Deep Link Contract
 *
 * An https link opening the app is a contract between three files no tool
 * reads together: an Android intent-filter (VIEW, BROWSABLE, https, the host),
 * an iOS `applinks:` associated-domains entitlement, and an
 * App.addListener('appUrlOpen') that maps the URL to a route. Any side without
 * the others fails without an error: the app opens at the launcher and the
 * path is gone, or the listener never fires on one platform.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relative } from '../../utils/capacitor/capacitor-law-support';
import { type CapacitorProject, CapacitorProjects } from '../../utils/capacitor/capacitor-project';
import { FileUtils } from '../../utils/file-utils';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

const INTENT_FILTER = /<intent-filter\b[\s\S]*?<\/intent-filter>/g;
const LISTENER = /\baddListener\s*\(\s*['"`]appUrlOpen['"`]/;

export interface DeepLinkSides {
  /** https hosts of the Android VIEW filters; null when android/ is absent. */
  androidHosts: string[] | null;
  /** applinks: hosts of the iOS entitlements; null when ios/ is absent. */
  iosHosts: string[] | null;
  listener: boolean;
}

export class CapacitorDeepLinkContractLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Deep Link Contract';

  static check(context: LawCheckContext): LawResult {
    const listener = this.hasListener(context);
    const violations: string[] = [];
    for (const project of CapacitorProjects.find(context.projectRoot)) {
      const sides = this.sides(context, project, listener);
      violations.push(...this.judge(relative(context, project.root) || '.', sides));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        'Declare the host in the Android intent-filter (VIEW, BROWSABLE, https, autoVerify) and in the iOS applinks entitlement',
        'Handle App.addListener("appUrlOpen") to route it — keep the three in one commit',
      ],
      context
    );
  }

  static judge(where: string, { androidHosts, iosHosts, listener }: DeepLinkSides): string[] {
    const declared = [...(androidHosts ?? []), ...(iosHosts ?? [])];
    if (!listener && declared.length === 0) return []; // no deep links at all
    const hosts = [...new Set(declared)].join(', ') || 'none declared';
    const violations: string[] = [];
    if (!listener) {
      violations.push(
        `${where}: https links are declared for ${hosts} and no App.addListener('appUrlOpen') handles them — the app opens at the launcher and the path is lost`
      );
    }
    if (listener && androidHosts !== null && androidHosts.length === 0) {
      violations.push(
        `${where}: an appUrlOpen listener exists and android/ has no VIEW + BROWSABLE + https intent-filter — the listener never fires on Android (hosts elsewhere: ${hosts})`
      );
    }
    if (listener && iosHosts !== null && iosHosts.length === 0) {
      violations.push(
        `${where}: an appUrlOpen listener exists and ios/ has no applinks: associated-domains entitlement — the listener never fires on iOS (hosts elsewhere: ${hosts})`
      );
    }
    return violations;
  }

  private static sides(
    context: LawCheckContext,
    project: CapacitorProject,
    listener: boolean
  ): DeepLinkSides {
    const native = CapacitorProjects.nativePaths(project, context.projectRoot);
    const manifest = CapacitorProjects.readNative(native.androidManifest);
    const iosPresent = CapacitorProjects.readNative(native.xcodeProjectFile) !== null;
    const entitlements = CapacitorProjects.entitlementFiles(native)
      .map(file => CapacitorProjects.readNative(file) ?? '')
      .join('\n');
    return {
      androidHosts: manifest === null ? null : this.androidHosts(manifest),
      iosHosts: iosPresent ? this.iosHosts(entitlements) : null,
      listener,
    };
  }

  /** Hosts of the intent-filters that open an https link. */
  static androidHosts(manifest: string): string[] {
    const hosts: string[] = [];
    for (const [filter] of manifest.matchAll(INTENT_FILTER)) {
      if (!/android\.intent\.action\.VIEW/.test(filter)) continue;
      if (!/android\.intent\.category\.BROWSABLE/.test(filter)) continue;
      if (!/android:scheme=["']https["']/.test(filter)) continue;
      for (const match of filter.matchAll(/android:host=["']([^"']+)["']/g)) hosts.push(match[1] ?? '');
      if (!/android:host=/.test(filter)) hosts.push('(any host)');
    }
    return hosts;
  }

  /** Hosts of `applinks:` associated domains. */
  static iosHosts(entitlements: string): string[] {
    return [...entitlements.matchAll(/<string>\s*applinks:([^<\s?]+)/g)].map(match => match[1] ?? '');
  }

  private static hasListener(context: LawCheckContext): boolean {
    return FileUtils.scanForFiles(context.projectRoot, context.config, ['.ts', '.tsx', '.js', '.jsx', '.vue'], context.lawId, false).some(
      file => LISTENER.test(TsClasses.mask(FileUtils.readFileContentSync(file) ?? ''))
    );
  }
}
