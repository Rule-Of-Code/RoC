import type { RuleOfCodeConfig } from '../config/types';
import { lawIdentityKeys } from './law-identity';

/**
 * The reason a project gave for declaring a law inapplicable — readable from a
 * DIFFERENT law.
 *
 * A checklist law re-demanded concerns that three accepted waivers had already
 * answered: a prerendered static site with no authentication surface and no
 * running service was asked for authentication and health checks again, inside
 * sub-checks that `notApplicable` cannot reach. There is no
 * `laws.notApplicable` entry for "the auth clause of the checklist law", so the
 * finding was unanswerable — the concern was accepted as absent by the audit
 * and demanded by it in the same run.
 *
 * Resolution is by NAME identity only. `legacyId` is shared by 51 laws, and an
 * ambiguous key must never widen a waiver silently — the registry refuses to
 * act on one for the same reason.
 */
export function waiverReasonFor(
  config: RuleOfCodeConfig,
  lawName: string
): string | null {
  const notApplicable = (config.laws as { notApplicable?: unknown } | undefined)
    ?.notApplicable as Record<string, string> | undefined;
  if (!notApplicable) return null;

  for (const key of lawIdentityKeys({ name: lawName })) {
    const reason = notApplicable[key];
    if (typeof reason === 'string' && reason.trim().length > 0) {
      return reason.trim();
    }
  }

  return null;
}

/** Has this project declared the law that owns this concern inapplicable? */
export function concernIsWaived(
  config: RuleOfCodeConfig,
  lawName: string
): boolean {
  return waiverReasonFor(config, lawName) !== null;
}
