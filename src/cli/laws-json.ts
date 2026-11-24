/**
 * The `ruleofcode laws --json` contract: the document and each law in it, and
 * the satisfiedBy stack keys, and the serializer that builds it from the
 * registry. Moved out of laws-command unchanged (#559); laws-command
 * re-exports every name.
 */

import type {
  LawRequirement,
  SatisfiedByGuidance,
} from '../types/enhanced-law.types';
import type { ConstitutionalLaw } from '../types/law.types';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import { ModularLawsRegistry } from '../registry/modular-laws-registry';
import type { LawsOptions } from './laws-command';
import { TOTAL_LAWS_COUNT, getToolName, getVersion } from './utils';

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

/** The authored category of a law, or null when the registry carries none. */
export function categoryOf(law: ConstitutionalLaw): string | null {
  AUTHORED ??= authoredByTitle(law => law.category);
  const stripped = law.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return AUTHORED.get(law.name) ?? AUTHORED.get(stripped) ?? null;
}

/**
 * Index an authored field by law title, skipping laws that do not carry it.
 *
 * The AUTHORED fields (category, detectionLimits) live next to each law in
 * `src/data/*.ts`. They are NOT the runtime `ConstitutionalLaw` fields: e.g.
 * `ConstitutionalLaw.category` is a DERIVED tier (foundational / maintainability /
 * …) computed from priority, while the authored category is one of eleven concern
 * labels (SECURITY, PYTHON, SACRED_LAW…). Serialising the derived value as
 * "category" would hand a consumer a filter over a value nobody wrote (a downstream consumer), so
 * both travel, each under its own name, neither pretending to be the other.
 */
function authoredByTitle<T>(
  pick: (
    law: (typeof ALL_ENHANCED_CONSTITUTIONAL_LAWS)[number]
  ) => T | undefined
): Map<string, T> {
  const byName = new Map<string, T>();
  for (const law of ALL_ENHANCED_CONSTITUTIONAL_LAWS) {
    const value = law.title ? pick(law) : undefined;
    if (value !== undefined) byName.set(law.title, value);
  }
  return byName;
}

type SatisfiedBy = NonNullable<SerializedLaw['satisfiedBy']>;

let AUTHORED: Map<string, string> | undefined;
let LIMITS: Map<string, string[]> | undefined;
let RATIONALE: Map<string, string> | undefined;
let SATISFIED: Map<string, SatisfiedBy> | undefined;

/**
 * One law as `ruleofcode laws --json` prints it: its identity (id, legacyId,
 * name, slugs, identity keys and the unambiguous config keys), the derived
 * tier and severity, and the authored card fields (category,
 * detectionLimits, rationale, satisfiedBy) looked up by title, `null` when
 * the card does not declare them.
 */
export function serializeLaw(law: ConstitutionalLaw): SerializedLaw {
  AUTHORED ??= authoredByTitle(law => law.category);
  LIMITS ??= authoredByTitle(law =>
    law.detectionLimits?.length ? law.detectionLimits : undefined
  );
  RATIONALE ??= authoredByTitle(law => law.rationale);
  SATISFIED ??= authoredByTitle(law => law.satisfiedBy);
  const stripped = law.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const authored = <T>(map: Map<string, T>): T | null =>
    map.get(law.name) ?? map.get(stripped) ?? null;

  return {
    id: law.id,
    legacyId: law.legacyId ?? null,
    name: law.name,
    slug: ModularLawsRegistry.slugifyLawName(law.name),
    /** URL-safe, registry-unique — route `/laws/:slug` by THIS, not `slug`. */
    urlSlug: ModularLawsRegistry.urlSlugForLawName(law.name),
    identityKeys: ModularLawsRegistry.lawIdentityKeys(law),
    /**
     * The keys a config may actually use. `legacyId` is NOT unique (25 values are
     * shared by 51 laws), so keying a config by it silently affects several laws.
     * A consumer generating config from this JSON must use these.
     */
    configKeys: ModularLawsRegistry.unambiguousIdentityKeys(law),
    description: law.description,
    category: authored(AUTHORED),
    tier: law.category,
    severity: law.severity,
    impact: law.impact,
    paretoCore: law.paretoCore,
    alwaysEnabled: law.alwaysEnabled ?? false,
    stack: law.stack ?? null,
    applicableFrameworks: law.applicableFrameworks,
    /**
     * The authored Law-Card fields. All declared next to the law, in code,
     * reviewed as code — never prose on a website that drifts from the detector.
     * `null` = not declared yet (honest debt); the declared counts are published
     * on /dogfood and are meant to grow in public.
     */
    detectionLimits: authored(LIMITS),
    rationale: authored(RATIONALE),
    satisfiedBy: authored(SATISFIED),
    requires: law.requires ?? null,
  };
}

/**
 * The whole `ruleofcode laws --json` document (schemaVersion 2): tool and
 * version, registry total and how many laws are returned, the filters used,
 * the categories laws actually carry, the satisfiedBy stack keys with their
 * stack/project-type mappings, and the serialized laws.
 */
export function buildLawsJson(
  laws: ConstitutionalLaw[],
  options: LawsOptions
): LawsJson {
  return {
    schemaVersion: 2,
    tool: getToolName(),
    version: getVersion(),
    registryTotal: TOTAL_LAWS_COUNT,
    returned: laws.length,
    filters: {
      enabled: options.enabled === true,
      pareto: options.pareto === true,
      category: options.category ?? null,
    },
    registryCategories: populatedCategories(),
    satisfiedByStacks: {
      keys: [...SATISFIED_BY_KEYS],
      stackToKey: {
        frontend: 'angular',
        typescript: 'typescript',
        python: 'python',
      },
      projectTypeToKey: {
        angular: 'angular',
        react: 'react',
        ionic: 'ionic',
        python: 'python',
        typescript: 'typescript',
        node: 'typescript',
      },
    },
    laws: laws.map(serializeLaw),
  };
}

/**
 * Categories the registry actually assigns to at least one law.
 *
 * This is NOT the same as LAW_CATEGORIES: `category` is currently derived from
 * a law's priority/automation rather than its concern, so declared categories
 * exist that no law ever carries. An empty result must therefore never be read
 * as "this tool has no such checks".
 */
export function populatedCategories(): string[] {
  return [
    ...new Set(
      ModularLawsRegistry.getAll()
        .map(law => categoryOf(law))
        .filter((category): category is string => category !== null)
    ),
  ].sort();
}
