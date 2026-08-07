import chalk from 'chalk';
import type { Command } from 'commander';
import { ConfigLoader } from '../config/loader';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import { ModularLawsRegistry } from '../registry/modular-laws-registry';
import type { ConstitutionalLaw } from '../types/law.types';
import { TOTAL_LAWS_COUNT, getToolName, getVersion } from './utils';

/**
 * The only values `--category` accepts. An unknown category FAILS the command
 * instead of returning the whole registry: a filter that silently matches
 * everything reports success while answering a different question than the one
 * asked, and that is the defect class this tool exists to kill.
 */
export const LAW_CATEGORIES = [
  'ACCESSIBILITY',
  'CODE_QUALITY',
  'DEPLOYMENT',
  'DOCUMENTATION',
  'FRAMEWORK',
  'PERFORMANCE',
  'PYTHON',
  'SACRED_LAW',
  'SECURITY',
  'TESTING',
  'VERSION_CONTROL',
] as const;

export type LawCategory = (typeof LAW_CATEGORIES)[number];

export interface LawsOptions {
  list?: boolean;
  enabled?: boolean;
  pareto?: boolean;
  category?: string;
  json?: boolean;
  config?: string;
}

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
  satisfiedBy: {
    typescript?: string;
    angular?: string;
    python?: string;
  } | null;
}

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
   */
  satisfiedByStacks: {
    keys: string[];
    stackToKey: Record<string, string>;
  };
  laws: SerializedLaw[];
}

export function isKnownCategory(category: string): category is LawCategory {
  return (LAW_CATEGORIES as readonly string[]).includes(
    category.toUpperCase() as LawCategory
  );
}

/** The authored category of a law, or null when the registry carries none. */
export function categoryOf(law: ConstitutionalLaw): string | null {
  AUTHORED ??= authoredByTitle(law => law.category);
  const stripped = law.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return AUTHORED.get(law.name) ?? AUTHORED.get(stripped) ?? null;
}

/**
 * Base set: the whole registry, or only what the project's config leaves
 * enabled (`--enabled`).
 */
export function resolveBaseLaws(options: LawsOptions): ConstitutionalLaw[] {
  if (!options.enabled) return ModularLawsRegistry.getAll();

  const config = ConfigLoader.load(process.cwd(), options.config);
  return ModularLawsRegistry.getEnabled(config);
}

export function filterLaws(
  laws: ConstitutionalLaw[],
  options: LawsOptions
): ConstitutionalLaw[] {
  let selected = laws;

  if (options.pareto) {
    selected = selected.filter(law => law.paretoCore);
  }

  if (options.category !== undefined) {
    // The AUTHORED category, never the derived tier: filtering by a value nobody
    // wrote hands the reader an answer to a question they did not ask (a downstream consumer).
    const wanted = options.category.toUpperCase();
    selected = selected.filter(law => categoryOf(law) === wanted);
  }

  return selected;
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
  pick: (law: (typeof ALL_ENHANCED_CONSTITUTIONAL_LAWS)[number]) => T | undefined
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
  };
}

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
      keys: ['typescript', 'angular', 'python'],
      stackToKey: {
        frontend: 'angular',
        typescript: 'typescript',
        python: 'python',
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

/**
 * An empty-but-valid category is the most dangerous answer this command can
 * give: it reads as "Rule of Code has no security laws" when the truth is
 * "no law carries that label". Say which it is.
 */
export function warnEmptyCategory(
  category: string | undefined,
  matched: number,
  options: LawsOptions = {}
): void {
  if (category === undefined || matched > 0) return;

  const wanted = category.toUpperCase();
  const populated = populatedCategories();
  const carried = ModularLawsRegistry.getAll().filter(
    law => categoryOf(law) === wanted
  ).length;

  console.log(
    chalk.yellowBright(
      `\n⚠️  0 of ${TOTAL_LAWS_COUNT} laws matched category="${wanted}".`
    )
  );

  // A ZERO can mean two entirely different things, and the difference is the
  // whole point of this warning. The guard used to fall silent whenever the
  // category existed — so a populated category emptied by ANOTHER filter (say
  // --pareto) printed a bare "0 laws", which reads as "no such checks exist".
  // That is the lie of omission this command exists to refuse.
  if (carried > 0) {
    console.log(
      chalk.gray(
        `   ${carried} law(s) DO carry this category — the other filters removed them all` +
          `${options.pareto ? ' (--pareto)' : ''}${options.enabled ? ' (--enabled)' : ''}.`
      )
    );
  } else {
    console.log(
      chalk.gray(
        `   Categories present in the registry: ${populated.join(', ')}`
      )
    );
  }

  console.log(
    chalk.gray(
      '   This does NOT mean no such law exists — a law\'s concern may be filed\n' +
        '   under another category. Do not read this as absence of coverage.'
    )
  );
}

/**
 * Human-readable listing. Renders the set it is given — the header states which
 * filters produced it, so the printed count and the printed scope always agree.
 */
export function displayLaws(
  laws: ConstitutionalLaw[],
  options: LawsOptions = {}
): void {
  console.log(
    chalk.cyan(
      `🏛️ RuleOfCode v${getVersion()} - ${TOTAL_LAWS_COUNT} Constitutional Laws\n`
    )
  );

  if (options.pareto) {
    console.log(
      chalk.magentaBright('🎯 PARETO HIGH-IMPACT LAWS - MEGA PRO OPTIMIZATION!')
    );
    console.log(
      chalk.yellowBright('⚡ 20% rules, 80% impact - Maximum efficiency focus:')
    );
  } else {
    console.log(
      chalk.greenBright(
        `📚 COMPLETE CONSTITUTIONAL REGISTRY - ${TOTAL_LAWS_COUNT} TOTAL LAWS!`
      )
    );
    console.log(chalk.cyanBright('🏛️ Full Constitutional Coverage:'));
  }

  const applied: string[] = [];
  if (options.enabled) applied.push('enabled by this project config');
  if (options.pareto) applied.push('Pareto core');
  if (options.category !== undefined)
    applied.push(`category=${options.category}`);

  if (applied.length > 0) {
    console.log(
      chalk.yellowBright(
        `\n🔎 Showing ${laws.length} of ${TOTAL_LAWS_COUNT} laws — filtered by: ${applied.join(' + ')}`
      )
    );
  }
  console.log('');

  if (laws.length === 0) {
    console.log(chalk.yellowBright('   (no law matches these filters)'));
    warnEmptyCategory(options.category, laws.length, options);
    return;
  }

  laws.forEach((law, index) => {
    console.log(chalk.blueBright(`\n🏛️ Law ${index + 1}: ${law.name}`));
    console.log(chalk.gray(`   📋 ${law.description}`));
    console.log(chalk.cyanBright(`   🏷️ Category: ${law.category}`));
    if (law.paretoCore) {
      console.log(chalk.greenBright(`   ⚡ HIGH-IMPACT PARETO CORE`));
    }
  });
}

/**
 * Runs the command and returns the process exit code. Separated from the
 * commander wiring so the contract (what an unknown category does, what
 * `--json` emits) is testable without spawning a process.
 */
export function executeLawsAction(options: LawsOptions): number {
  if (options.category !== undefined && !isKnownCategory(options.category)) {
    console.error(
      chalk.redBright(`❌ Unknown law category: "${options.category}"`)
    );
    console.error(
      chalk.gray(`   Valid categories: ${LAW_CATEGORIES.join(', ')}`)
    );
    console.error(
      chalk.gray(
        '   Refusing to list laws: returning the whole registry for a filter that matched nothing would answer a question you did not ask.'
      )
    );
    return 1;
  }

  const laws = filterLaws(resolveBaseLaws(options), options);

  if (options.json) {
    // stdout carries JSON and nothing else, so `laws --json | jq` works.
    console.log(JSON.stringify(buildLawsJson(laws, options), null, 2));
    return 0;
  }

  displayLaws(laws, options);
  return 0;
}

/**
 * Configure laws command
 */
export function lawsCommand(program: Command): void {
  program
    .command('laws')
    .description(
      `🏛️ View all ${TOTAL_LAWS_COUNT} Constitutional Laws with their details`
    )
    .option('-l, --list', 'list all laws with descriptions (default)')
    .option('-e, --enabled', 'show only laws enabled by this project config')
    .option('-p, --pareto', 'show only Pareto high-impact laws')
    .option(
      '-c, --category <category>',
      `filter by category (${LAW_CATEGORIES.join('|')})`
    )
    .option('--json', 'emit the registry as JSON on stdout (machine-readable)')
    .option('--config <path>', 'custom config file path (used by --enabled)')
    .action((options: LawsOptions) => {
      const exitCode = executeLawsAction(options);
      if (exitCode !== 0) {
        process.exit(exitCode);
      }
    });
}
