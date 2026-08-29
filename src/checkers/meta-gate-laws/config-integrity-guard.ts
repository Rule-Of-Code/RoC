/**
 * Config Integrity Guard
 * Born from the v7.5.0/v7.5.1 incidents: a typo'd or stale key in
 * laws.severity / laws.notApplicable / laws.enabled silently gates nothing —
 * the config looks strict while the gate is disarmed. The engine already warns
 * at audit start; this law makes an unknown key a FINDING with a regression
 * test, so the behavior cannot silently regress again (it did, twice).
 * Stack-gated laws (present in the registry but not applicable to this project
 * type) are NOT findings — they are legitimate in shared configs.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../data/enhanced-laws';
import { lawIdentityKeys, isNonLawConfigKey } from '../../utils/law-identity';
import { LawBase } from '../law-base';

export class ConfigIntegrityGuardLaw extends LawBase {
  private static readonly LAW_NAME = 'Config Integrity Guard';
  private static readonly SECTIONS = [
    'severity',
    'notApplicable',
    'enabled',
  ] as const;

  /**
   * How many laws each public identity spelling resolves to.
   *
   * A key that resolves to MORE THAN ONE law is not a shortcut — it is a hidden
   * waiver. `legacyId` is not unique: 25 values are shared by 51 laws (20 = "No
   * Explicit Any" AND "Branch Governance Standards"). So
   * `notApplicable: { "20": "…" }` silences TWO laws while the team believes it
   * has silenced one — a hidden waiver produced BY US, which is the exact class
   * this tool exists to destroy (a downstream consumer).
   */
  private static identityKeyCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const law of ALL_ENHANCED_CONSTITUTIONAL_LAWS) {
      for (const key of lawIdentityKeys({
        name: law.title,
        id: law.id,
        legacyId: law.legacyId,
      })) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return counts;
  }

  /** Keys that resolve to more than one law — refused, never applied. */
  static ambiguousIdentityKeys(): Set<string> {
    const ambiguous = new Set<string>();
    for (const [key, count] of this.identityKeyCounts()) {
      if (count > 1) ambiguous.add(key);
    }
    return ambiguous;
  }

  static check(context: LawCheckContext): LawResult {
    const { config } = context;
    const counts = this.identityKeyCounts();
    const violations: string[] = [];

    const lawsConfig = config.laws as Record<string, unknown>;
    for (const section of this.SECTIONS) {
      const map = lawsConfig[section] as Record<string, unknown> | undefined;
      if (!map) continue;
      for (const key of Object.keys(map)) {
        if (isNonLawConfigKey(key)) continue; // annotation or legacy map
        const resolves = counts.get(key) ?? 0;

        if (resolves === 0) {
          violations.push(
            `laws.${section}: unknown law '${key}' — this entry gates nothing; check the name with 'roc laws --list'`
          );
        } else if (resolves > 1) {
          violations.push(
            `laws.${section}: AMBIGUOUS key '${key}' — it resolves to ${resolves} laws, so this entry silently affects all of them. Name the law explicitly (canonical name or slug); the engine refuses to apply ambiguous keys.`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Fix the key: canonical name, printed slug and law id resolve to exactly one law',
        'Never key a law by legacyId: 25 legacyIds are shared by 51 laws',
        'Remove entries for laws that no longer exist',
      ],
      context
    );
  }
}
