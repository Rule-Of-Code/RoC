/**
 * Capacitor No Dev-Only Server Keys
 *
 * Capacitor documents five config keys as not intended for production:
 * server.url (a live-reload server), server.cleartext, server.allowNavigation,
 * android.allowMixedContent, and webContentsDebuggingEnabled ("automatically
 * enabled during development"). The committed config is one file for every
 * build type and `cap sync` copies it into both shells as-is, so a key left in
 * it ships in the release build.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { configValue, resolvedProjects } from '../../utils/capacitor/capacitor-law-support';
import { LawBase } from '../law-base';

/** Key → what in its value makes it a development setting. */
const DEV_ONLY: ReadonlyArray<[string, (value: unknown) => boolean, string]> = [
  ['server.url', v => typeof v === 'string' && v.trim() !== '', 'points the app at a live-reload server'],
  ['server.cleartext', v => v === true, 'allows plain HTTP in the WebView'],
  ['server.allowNavigation', v => Array.isArray(v) && v.length > 0, 'lets the WebView navigate to other origins'],
  ['android.allowMixedContent', v => v === true, 'allows HTTP content on an HTTPS page'],
  ['android.webContentsDebuggingEnabled', v => v === true, 'lets any desktop attach a debugger to the WebView'],
  ['ios.webContentsDebuggingEnabled', v => v === true, 'lets any Mac attach a debugger to the WebView'],
];

export class CapacitorNoDevOnlyServerKeysLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor No Dev-Only Server Keys';

  static check(context: LawCheckContext): LawResult {
    const { resolved, unresolved } = resolvedProjects(context);
    const violations = [...unresolved];
    for (const { where, config } of resolved) {
      for (const [key, isSet, effect] of DEV_ONLY) {
        if (!isSet(configValue(config, key))) continue;
        violations.push(
          `${where}: ${key} is set — it ${effect}, and Capacitor documents it as not intended for production. cap sync ships the committed config to every build type`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Keep the committed config production-shaped',
        'Put cleartext to a dev server in android/app/src/debug/ (a networkSecurityConfig for localhost); pass live-reload by `cap run --livereload`',
      ],
      context
    );
  }
}
