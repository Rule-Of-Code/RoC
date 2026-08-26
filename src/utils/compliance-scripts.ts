/**
 * Does this project RUN a compliance audit, whatever it calls the script?
 *
 * Two laws decided this by looking up a key — `check:laws`,
 * `audit:constitutional`, `compliance:check` — and never reading its value. A
 * project whose `audit` script runs this very CLI, and whose pre-push hook runs
 * it inside a full gate on every push, was told it had no constitutional
 * enforcement.
 *
 * The remedy that finding invites is the one this tool exists to argue against:
 * adding `"check:laws": "npm run audit"` clears both findings in ten seconds
 * and changes nothing about what runs. A number moves; a gate does not appear.
 *
 * It also taught a convention only this tool knows. An adopter with `audit`,
 * `lint`, `test` and `verify` was being asked for a seventh alias whose only
 * reader was the checker.
 */

/**
 * The audit being invoked: `ruleofcode audit`, `roc audit`, with or without a
 * runner in front. `[^&|]*` keeps the match inside ONE command of a chain, so
 * `lint && roc audit` matches on its second command rather than by accident
 * across the whole line.
 */
const RUNS_AUDIT = /\b(?:ruleofcode|roc)\b[^&|]*\baudit\b/i;

/** Other compliance runners a project may gate on instead. */
const RUNS_OTHER_COMPLIANCE = [
  /\bnpm\s+audit\b/i,
  /\bpip-audit\b/i,
  /\bsafety\s+check\b/i,
  /\bsnyk\s+(?:test|monitor)\b/i,
];

/** Script names that have historically signalled this, kept as a fallback. */
export const COMPLIANCE_SCRIPT_NAMES = [
  'check:laws',
  'audit:constitutional',
  'compliance:check',
  'quality:gate',
  'report:compliance',
  'report:quality',
];

/** Does any script actually invoke this tool's audit? */
export function runsConstitutionalAudit(
  scripts: Record<string, string> | undefined
): boolean {
  if (!scripts) return false;

  return (
    Object.values(scripts).some(command => RUNS_AUDIT.test(String(command))) ||
    COMPLIANCE_SCRIPT_NAMES.some(name => Boolean(scripts[name]))
  );
}

/**
 * Does any script run a compliance check of any kind — this tool's audit, or a
 * recognised third-party scanner?
 */
export function runsComplianceCheck(
  scripts: Record<string, string> | undefined
): boolean {
  if (!scripts) return false;
  if (runsConstitutionalAudit(scripts)) return true;

  return Object.values(scripts).some(command =>
    RUNS_OTHER_COMPLIANCE.some(pattern => pattern.test(String(command)))
  );
}

/**
 * The advice, generated from what would satisfy the check rather than written
 * beside it — so the two cannot drift apart, as the branch-name advice did.
 */
export function complianceScriptSuggestion(): string {
  return `Run the audit from a script — any name will do, the command is what is read (e.g. "audit": "ruleofcode audit --mode=full"). These names are also accepted on their own: ${COMPLIANCE_SCRIPT_NAMES.join(', ')}`;
}
