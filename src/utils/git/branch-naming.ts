import type { RuleOfCodeConfig } from '../../config/types';

/**
 * What counts as a conventional branch name — decided ONCE.
 *
 * Two laws validated branch names independently and disagreed three ways. The
 * sharpest disagreement was self-contradiction rather than strictness: one law
 * listed `chore/` as valid AND printed "Use branch prefixes: feature/, bugfix/,
 * hotfix/, release/, chore/" as its advice, while the other rejected `chore/`
 * outright. Following the tool's own suggestion produced the tool's own
 * violation.
 *
 * The other two were accidents of implementation rather than decisions: a
 * character class of `[a-z0-9.-]` rejected the uppercase of `feature/ABC-123`
 * and the underscore of `feature/add_auth`, and excluded `/` so a nested scope
 * like `feature/api/pagination` failed. A prefix test had no opinion on either.
 *
 * Each is now a choice, in one place: the prefix set is configurable, and the
 * name segment accepts what git accepts and teams actually use.
 */

/** Prefixes accepted unless the project names its own. */
export const DEFAULT_BRANCH_PREFIXES: readonly string[] = [
  'feature',
  'bugfix',
  'hotfix',
  'release',
  'chore',
];

/**
 * Branches that are the trunk rather than work on it. They carry no prefix by
 * definition, and judging them against a prefix convention reports the
 * repository's own main line as misnamed.
 */
export const TRUNK_BRANCHES: readonly string[] = [
  'main',
  'master',
  'develop',
  'development',
];

/** The prefix set this project accepts. */
export function branchPrefixes(config?: RuleOfCodeConfig): string[] {
  const declared = config?.thresholds?.git?.branchPrefixes;
  return declared && declared.length > 0
    ? [...declared]
    : [...DEFAULT_BRANCH_PREFIXES];
}

/**
 * Does this branch follow the convention?
 *
 * The name segment accepts letters in either case, digits, `.`, `_`, `-` and
 * `/` — an issue key (`feature/ABC-123`), a semver release (`release/v1.4.0`)
 * and a nested scope (`feature/api/pagination`) are all names a team writes on
 * purpose, not mistakes for a law to correct.
 */
export function followsBranchConvention(
  branch: string,
  config?: RuleOfCodeConfig
): boolean {
  if (TRUNK_BRANCHES.includes(branch)) {
    return true;
  }

  const prefixes = branchPrefixes(config)
    .map(prefix => prefix.replace(/\/+$/, ''))
    .filter(prefix => prefix.length > 0)
    .map(prefix => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (prefixes.length === 0) {
    return true;
  }

  return new RegExp(`^(?:${prefixes.join('|')})/[A-Za-z0-9._/-]+$`).test(
    branch
  );
}

/** The advice to print, naming exactly the prefixes that are accepted. */
export function branchConventionSuggestion(config?: RuleOfCodeConfig): string {
  const prefixes = branchPrefixes(config)
    .map(prefix => `${prefix.replace(/\/+$/, '')}/`)
    .join(', ');
  return `Use branch prefixes: ${prefixes}`;
}
