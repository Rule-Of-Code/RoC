/**
 * The Pareto core: the laws a `paretoMode: true` / `--mode=fast` run checks.
 *
 * It is DERIVED from each law's own fields, never listed. A list of arrays
 * (the core until 7.27.0) can only hold the laws that existed when it was
 * written: no law added later — a whole stack of them — could enter it, and
 * a Python project in Pareto mode ran no Python law at all (#383).
 *
 * The rule, per group. A group is a stack scope (each `stack` value, and
 * the universal laws as one more) split by `requires` gate: the ungated
 * laws of the scope are one group, and the gated ones are grouped by their
 * exact gate. A project then gets the share of every group that applies to
 * it, and a gated law counts only where its gate is met — on both sides of
 * the share. Taking the quota over a whole stack scope let gated laws that
 * do not apply to a project raise the quota and pull one more ungated law
 * into its core: nine universal laws added in 7.28.0, mostly gated, put a
 * plain TypeScript project at 26%.
 *
 * 1. Candidates: the laws that run by default. The always-on meta-gates run
 *    in every mode and are not part of any core; an opt-in law
 *    (`defaultEnabled: false`) needs something a default project does not
 *    have, so it is never a core law.
 * 2. Rank: default severity first (an `error` law is one that fails the build
 *    today; `warning` and `info` are a warn cycle), then priority (CRITICAL,
 *    HIGH, MEDIUM, LOW), then the tier: a SACRED_LAW (the constitution's own
 *    top tier), then a SECURITY law at `error`, then the rest; then a law
 *    with no `requires` gate before a gated one (it applies to every project
 *    of the stack, a gated one to the projects of one toolkit), then
 *    registry order.
 * 3. Take the top {@link PARETO_CORE_RATIO} of the group's candidates,
 *    rounded (a gate with one or two laws gets none by quota).
 * 4. The protected tier is never cut by that quota: every SACRED law,
 *    every CRITICAL SECURITY law at `error`, and every CRITICAL `error`
 *    law that every project selects (no stack, no `requires`) is a core
 *    law — the last so that gating other laws to their subject cannot
 *    push a universal critical check out of the core (#428).
 *
 * Why the protected tier stops there. The ungated typescript laws hold
 * seven CRITICAL `error` laws and their quota is three: the four SACRED
 * laws and API Security Standards (step 4) make five — with the twelve
 * ungated universal ones, 17 of the 76 laws a plain TypeScript (node)
 * project selects, 22.4%. All seven would be 19 of 76, at the edge of the
 * band; protecting every SECURITY `error` law at any priority would add two
 * universal ones and push node over it.
 * Absolute Zero Tolerance Doctrine (its concern overlaps the SACRED Zero
 * Tolerance Doctrine) and Jest Unit Test 100% Coverage Mandate run in a
 * full audit, not in the fast one. A new law that enters by step 4 and
 * pushes a profile out of the band fails the ratchet: the rule is revisited
 * then, the band is not widened.
 *
 * A project gets its universal share plus the share of each stack group
 * that applies to it, so the core is about 20% of what it selects. A
 * ratchet test measures exactly that on the release canary's project
 * profiles (python, angular, ngrx, ionic, react, node), core selected / laws
 * selected, in [15%, 25%], and adds laws to the registry (ungated, and
 * gated several at once) to show they pass through the rule with no list
 * edited and that a gated law moves no project it does not apply to. The run itself stays PARTIAL: a
 * subset never yields a compliance verdict.
 */
import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';

/** The share of each stack group's laws that the core holds. */
export const PARETO_CORE_RATIO = 0.2;

const SEVERITY_RANK: Record<string, number> = { error: 3, warning: 2, info: 1 };
const PRIORITY_RANK: Record<string, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

type CoreFields = Pick<
  EnhancedConstitutionalLaw,
  | 'id'
  | 'priority'
  | 'defaultSeverity'
  | 'category'
  | 'stack'
  | 'requires'
  | 'defaultEnabled'
  | 'alwaysEnabled'
>;

/** A law that runs by default and is not a meta-gate. */
export function isParetoCandidate(law: CoreFields): boolean {
  return law.alwaysEnabled !== true && law.defaultEnabled !== false;
}

/** A value with its object keys sorted, so equal gates compare equal however they were written. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)])
    );
  }
  return value;
}

/**
 * The group a law's share is taken from: its stack scope (the universal laws
 * are one more), and within it its `requires` gate. Ungated laws are one
 * group; gated laws are grouped by the exact gate, because they apply only
 * to the projects that meet it.
 */
const groupOf = (law: CoreFields): string =>
  `${law.stack ?? 'universal'}|${law.requires ? JSON.stringify(canonical(law.requires)) : ''}`;

interface Ranked {
  law: CoreFields;
  index: number;
}

/** 2 for a SACRED law, 1 for a SECURITY law at `error`, 0 for the rest. */
function tierOf(law: CoreFields): number {
  if (law.category === 'SACRED_LAW') return 2;
  return law.category === 'SECURITY' && law.defaultSeverity === 'error' ? 1 : 0;
}

/**
 * A CRITICAL `error` law that every project selects: no stack, no
 * `requires`. A quota is a share of a group, so it moves whenever laws
 * leave the group — gated to their subject, or made opt-in — and the law
 * at its edge falls out of the core of every project as a side effect,
 * not by a decision about that law. Gating CDN, monitoring, incident and
 * launch laws to their subject (#428) took CI/CD Constitutional Tribunal
 * out of every fast run that way. A critical, blocking check that applies
 * to every project is not the edge of a share; it is always in the core.
 * Derived from the law's own fields, like the rest of the rule — no list —
 * and it adds nothing a stack scope's quota did not already hold except
 * the law such a move would cut.
 */
function isUniversalCritical(law: CoreFields): boolean {
  return (
    law.stack === undefined &&
    law.requires === undefined &&
    law.priority === 'CRITICAL' &&
    law.defaultSeverity === 'error'
  );
}

/** Step 4: a law the quota never cuts. */
function isProtected(law: CoreFields): boolean {
  return (
    tierOf(law) === 2 ||
    (tierOf(law) === 1 && law.priority === 'CRITICAL') ||
    isUniversalCritical(law)
  );
}

/** Higher first: severity, priority, tier, ungated, then registry order. */
function byRank(a: Ranked, b: Ranked): number {
  return (
    (SEVERITY_RANK[b.law.defaultSeverity] ?? 0) -
      (SEVERITY_RANK[a.law.defaultSeverity] ?? 0) ||
    (PRIORITY_RANK[b.law.priority] ?? 0) -
      (PRIORITY_RANK[a.law.priority] ?? 0) ||
    tierOf(b.law) - tierOf(a.law) ||
    Number(a.law.requires !== undefined) -
      Number(b.law.requires !== undefined) ||
    a.index - b.index
  );
}

/** The ids of the core laws of `laws`, by the rule above. */
export function paretoCoreIds(laws: readonly CoreFields[]): Set<string> {
  const groups = new Map<string, Ranked[]>();
  laws.forEach((law, index) => {
    if (!isParetoCandidate(law)) return;
    const group = groups.get(groupOf(law)) ?? [];
    group.push({ law, index });
    groups.set(groupOf(law), group);
  });
  const core = new Set<string>();
  for (const group of groups.values()) {
    const quota = Math.round(PARETO_CORE_RATIO * group.length);
    for (const { law } of [...group].sort(byRank).slice(0, quota))
      core.add(law.id);
    for (const { law } of group) if (isProtected(law)) core.add(law.id);
  }
  return core;
}
