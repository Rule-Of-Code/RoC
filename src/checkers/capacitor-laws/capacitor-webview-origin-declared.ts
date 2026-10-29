/**
 * Capacitor WebView Origin Declared
 *
 * The origin a Capacitor WebView presents is <scheme>://<hostname>, from three
 * keys that all have defaults, and the defaults differ per platform:
 * https://localhost on Android, capacitor://localhost on iOS. Every backend
 * CORS allowlist and every byte of origin-scoped storage hang off that value,
 * and changing it after a release orphans the storage on every device. The
 * law asks that it be DECLARED — not what it is: keeping `localhost`, as
 * Capacitor recommends, is a legitimate decision.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { configValue, resolvedProjects } from '../../utils/capacitor/capacitor-law-support';
import { LawBase } from '../law-base';

const ORIGIN_KEYS = ['server.hostname', 'server.androidScheme', 'server.iosScheme'];

export class CapacitorWebviewOriginDeclaredLaw extends LawBase {
  static readonly LAW_NAME = 'Capacitor WebView Origin Declared';

  static check(context: LawCheckContext): LawResult {
    const { resolved, unresolved } = resolvedProjects(context);
    const violations = [...unresolved];
    for (const { where, config } of resolved) {
      const missing = ORIGIN_KEYS.filter(key => configValue(config, key) === undefined);
      if (missing.length === 0) continue;
      violations.push(
        `${where}: ${missing.join(', ')} not stated — the WebView origin defaults to https://localhost on Android and capacitor://localhost on iOS. The backend CORS allowlist and all origin-scoped storage depend on it, and changing it after a release orphans that storage on every device`
      );
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'State server.hostname, server.androidScheme and server.iosScheme explicitly, even when the value is the default',
        'Treat the value as permanent once a build has shipped',
      ],
      context
    );
  }
}
