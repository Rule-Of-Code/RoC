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
    const reason = honouredWaiverReason(notApplicable[key]);
    if (reason !== null) return reason;
  }

  return null;
}

/**
 * The reason of a `laws.notApplicable` entry when the entry IS a waiver, else
 * null: a string with something in it besides whitespace, trimmed.
 *
 * One rule for every reader. The registry used to waive on any truthy value
 * (`' '` waived, `''` did not) while this file trimmed, so a whitespace-only
 * entry removed the law from the audit and was "no waiver" to the laws that
 * defer to waivers — and the audit could not name the reason it acted on.
 * A waiver without a reason is not one: the law runs, and the engine warns.
 */
export function honouredWaiverReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Has this project declared the law that owns this concern inapplicable? */
export function concernIsWaived(
  config: RuleOfCodeConfig,
  lawName: string
): boolean {
  return waiverReasonFor(config, lawName) !== null;
}
