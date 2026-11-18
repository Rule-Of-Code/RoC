/**
 * The Pareto core: the laws a `paretoMode: true` / `--mode=fast` run checks.
 *
 * It is DERIVED from each law's own fields, never listed. A list of arrays
 * (the core until 7.27.0) can only hold the laws that existed when it was
 * written: no law added later — a whole stack of them — could enter it, and
 * a Python project in Pareto mode ran no Python law at all (#383).
 *
 * The rule, per stack scope (each `stack` value, and the universal laws as
 * one more group, so every project type gets its share of each group that
 * applies to it):
 *
 * 1. Candidates: the laws that run by default. The always-on meta-gates run
 *    in every mode and are not part of any core; an opt-in law
 *    (`defaultEnabled: false`) needs something a default project does not
 *    have, so it is never a core law.
 * 2. Rank: default severity first (an `error` law is one that fails the build
 *    today; `warning` and `info` are a warn cycle), then priority (CRITICAL,
 *    HIGH, MEDIUM, LOW), then a SACRED_LAW before any other category (the
 *    constitution's own top tier), then a law with no `requires` gate before
 *    a gated one (it applies to every project of the stack, a gated one to
 *    the projects of one toolkit), then registry order.
 * 3. Take the top {@link PARETO_CORE_RATIO} of the group's candidates,
 *    rounded, at least one.
 *
 * Not every CRITICAL `error` law fits. The typescript group holds seven
 * and gets four; with the universal group's thirteen, all seven would make
 * the core 20 of the 76 laws a plain TypeScript (node) project selects —
 * 26%, outside the band. The four SACRED laws stay; Absolute Zero Tolerance
 * Doctrine, API Security Standards and Jest Unit Test 100% Coverage
 * Mandate run in a full audit, not in the fast one.
 *
 * A project gets its universal share plus the share of each stack group
 * that applies to it, so the core is about 20% of what it selects. A
 * ratchet test measures exactly that on the release canary's five project
 * profiles (python, angular, ionic, react, node), core selected / laws
 * selected, in [15%, 25%], and adds a law to the registry to show it passes
 * through the rule with no list edited. The run itself stays PARTIAL: a
 * subset never yields a compliance verdict.
 */
import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';

/** The share of each stack group's laws that the core holds. */
export const PARETO_CORE_RATIO = 0.2;

const SEVERITY_RANK: Record<string, number> = { error: 3, warning: 2, info: 1 };
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

type CoreFields = Pick<
  EnhancedConstitutionalLaw,
  'id' | 'priority' | 'defaultSeverity' | 'category' | 'stack' | 'requires' | 'defaultEnabled' | 'alwaysEnabled'
>;

/** A law that runs by default and is not a meta-gate. */
export function isParetoCandidate(law: CoreFields): boolean {
  return law.alwaysEnabled !== true && law.defaultEnabled !== false;
}

/** The stack group a law's share is taken from; the universal laws are one group. */
const groupOf = (law: CoreFields): string => law.stack ?? 'universal';

interface Ranked {
  law: CoreFields;
  index: number;
}

const isSacred = (law: CoreFields): number => Number(law.category === 'SACRED_LAW');

/** Higher first: severity, priority, SACRED, ungated, then registry order. */
function byRank(a: Ranked, b: Ranked): number {
  return (
    (SEVERITY_RANK[b.law.defaultSeverity] ?? 0) - (SEVERITY_RANK[a.law.defaultSeverity] ?? 0) ||
    (PRIORITY_RANK[b.law.priority] ?? 0) - (PRIORITY_RANK[a.law.priority] ?? 0) ||
    isSacred(b.law) - isSacred(a.law) ||
    Number(a.law.requires !== undefined) - Number(b.law.requires !== undefined) ||
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
    const quota = Math.max(1, Math.round(PARETO_CORE_RATIO * group.length));
    for (const { law } of [...group].sort(byRank).slice(0, quota)) core.add(law.id);
  }
  return core;
}
