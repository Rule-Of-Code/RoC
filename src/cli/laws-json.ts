/**
 * The `ruleofcode laws --json` contract: the document and each law in it, and
 * the satisfiedBy stack keys. Moved out of laws-command unchanged (#559);
 * laws-command re-exports every name.
 */

import type {
  LawRequirement,
  SatisfiedByGuidance,
} from '../types/enhanced-law.types';
import type { ConstitutionalLaw } from '../types/law.types';

/**
 * A law as machine consumers see it. Every public spelling of the law's
 * identity travels with it (`identityKeys`) — config keys (laws.enabled /
 * laws.severity / laws.notApplicable) resolve through all of them, so a
 * consumer that generates config from this JSON cannot key on a spelling the
 * engine will not recognise.
 */
export interface SerializedLaw {
  id: string;
  legacyId: number | null;
  name: string;
  slug: string;
  /** URL-safe (`^[a-z0-9-]+$`), registry-unique. Route `/laws/:slug` by this. */
  urlSlug: string;
  identityKeys: string[];
  /** Identity keys that resolve to exactly ONE law — the only ones a config may use. */
  configKeys: string[];
  description: string;
  /** The AUTHORED category (SECURITY, TESTING, PYTHON, SACRED_LAW…), or null. */
  category: string | null;
  /** The DERIVED tier (foundational / maintainability / …) — not authored by anyone. */
  tier: ConstitutionalLaw['category'];
  severity: ConstitutionalLaw['severity'];
  impact: ConstitutionalLaw['impact'];
  paretoCore: boolean;
  alwaysEnabled: boolean;
  /** Stack scope; null means the law is universal. */
  stack: ConstitutionalLaw['stack'] | null;
  applicableFrameworks: string[];
  /** What the law does NOT claim. `null` = not declared yet; never `[]`. */
  detectionLimits: string[] | null;
  /** WHY the law exists (the incident/principle). `null` = not declared yet. */
  rationale: string | null;
  /** How to satisfy it, per stack. `null` = not declared yet. */
  satisfiedBy: SatisfiedByGuidance | null;
  /**
   * What a project must declare before the law is selected (a dependency, a
   * config file). `null` = no requirement beyond `stack`. A law whose
   * requirement a project does not meet is not run there and not counted.
   */
  requires: LawRequirement | null;
}

/** Every `satisfiedBy` key, in the order a renderer should show them. */
export const SATISFIED_BY_KEYS: readonly (keyof SatisfiedByGuidance)[] = [
  'typescript',
  'angular',
  'react',
  'python',
  'ionic',
  'capacitor',
];

export interface LawsJson {
  schemaVersion: number;
  tool: string;
  version: string;
  /** Laws in the registry, always. */
  registryTotal: number;
  /** Laws this invocation actually returns. */
  returned: number;
  /**
   * The filters that were applied, echoed back. `returned` < `registryTotal`
   * must always be explainable by these — a consumer (or a test) can therefore
   * catch a filter that stopped filtering, which is how `--category` shipped
   * broken for so long.
   */
  filters: {
    enabled: boolean;
    pareto: boolean;
    category: string | null;
  };
  /**
   * Categories at least one law actually carries. A consumer rendering a
   * category filter must use THIS, not the declared enum: a declared-but-empty
   * category would otherwise render as "Security (0)" and tell the reader this
   * tool has no security laws, which is false.
   */
  registryCategories: string[];
  /**
   * The vocabulary of `satisfiedBy` keys, and how a law's `stack` maps onto it.
   *
   * `satisfiedBy` is keyed by the language/framework the how-to-pass guidance
   * targets — a FINER axis than `stack`. The mismatch that bites a naive
   * consumer: a `stack: "frontend"` law carries its guidance under the
   * `"angular"` key, so `satisfiedBy[law.stack]` misses. Read `stackToKey` to
   * resolve it instead of maintaining your own frontend→angular table (a downstream consumer).
   * `"typescript"` also appears as cross-cutting guidance on laws of other
   * stacks, so it is not a 1:1 image of `stack: "typescript"`.
   * `"ionic"` and `"capacitor"` are carried by `stack: "frontend"` laws whose
   * `requires` names those toolkits — `stackToKey` cannot point at them, which
   * is why a renderer must iterate `keys`.
   *
   * `projectTypeToKey` is the finer mapping: `stack: "frontend"` covers Angular
   * and React alike, so a React project reads `satisfiedBy.react` and an
   * Angular one `satisfiedBy.angular`. Prefer it when the project type is
   * known; `stackToKey` stays for consumers that only know the stack.
   */
  satisfiedByStacks: {
    keys: string[];
    stackToKey: Record<string, string>;
    projectTypeToKey: Record<string, string>;
  };
  laws: SerializedLaw[];
}
