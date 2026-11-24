import chalk from 'chalk';
import type { Command } from 'commander';
import { ConfigLoader } from '../config/loader';
import { ModularLawsRegistry } from '../registry/modular-laws-registry';
import type { ConstitutionalLaw } from '../types/law.types';
import { TOTAL_LAWS_COUNT, getVersion } from './utils';
import { buildLawsJson, categoryOf, populatedCategories } from './laws-json';

export {
  type LawsJson,
  SATISFIED_BY_KEYS,
  type SerializedLaw,
  buildLawsJson,
  categoryOf,
  populatedCategories,
  serializeLaw,
} from './laws-json';

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
  category?: string | undefined;
  json?: boolean;
  config?: string;
}

/** Whether `category` names one of LAW_CATEGORIES, ignoring case. */
export function isKnownCategory(category: string): category is LawCategory {
  return (LAW_CATEGORIES as readonly string[]).includes(
    category.toUpperCase() as LawCategory
  );
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

/**
 * Narrows `laws` by the `--pareto` and `--category` options. The category
 * is matched against the law's AUTHORED category (case-insensitive), not the
 * derived tier.
 */
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
      "   This does NOT mean no such law exists — a law's concern may be filed\n" +
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
