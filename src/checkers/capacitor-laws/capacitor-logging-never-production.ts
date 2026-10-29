/**
 * Capacitor Logging Never Production
 *
 * `loggingBehavior: 'production'` keeps the bridge logger on in release
 * builds, and the bridge Capacitor injects into the WebView logs
 * JSON.stringify(result.data) of every plugin response — tokens, profiles —
 * into the device log. The leak is not in the app's code, so no search of the
 * repository finds it. The native side lower-cases the value and reads the
 * platform key before the top-level one, so the config is read resolved and
 * compared case-insensitively, at every level.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { configValue, resolvedProjects } from '../../utils/capacitor/capacitor-law-support';
import { LawBase } from '../law-base';

const LOGGING_KEYS = ['loggingBehavior', 'android.loggingBehavior', 'ios.loggingBehavior'];

export class CapacitorLoggingNeverProductionLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor Logging Never Production';

  static check(context: LawCheckContext): LawResult {
    const { resolved, unresolved } = resolvedProjects(context);
    const violations = [...unresolved];
    for (const { where, config } of resolved) {
      for (const key of LOGGING_KEYS) {
        const value = configValue(config, key);
        if (typeof value === 'string' && value.toLowerCase() === 'production') {
          violations.push(
            `${where}: ${key} is '${value}' — the bridge logs every plugin response (tokens, profiles) to the device log in release builds. Use 'debug' or 'none'`
          );
        }
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        "Set loggingBehavior: 'debug' (or 'none') at the top level and under android/ios",
        'Show the failure reason you wanted to see on screen instead of in the device log',
      ],
      context
    );
  }
}
