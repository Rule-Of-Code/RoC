import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';
import { ciConfigContent } from './project-discovery';
import { ProjectTypeDetectorValidation } from './config/project-type-detector/project-type-detector-validation';
import type { RuleOfCodeConfig } from '../config/types';

/**
 * Is a Lighthouse performance gate actually WIRED, or is there merely a file?
 *
 * The check this replaces returned satisfied as soon as one of four paths
 * existed, and tested its contents with a substring search for `performance`,
 * `90` or `0.9`. So this was enough to turn a law from a violation into a pass:
 *
 *     echo '{"performance":1}' > .lighthouserc.json
 *
 * Eighteen bytes that nothing executes. No Lighthouse installed, no script
 * referencing the file, the shipped artefact byte-identical — and a law green.
 *
 * This tool ships a documented list of ways to disarm it, on purpose: pareto
 * mode in a gate, fast mode in a hook, a low floor, wide ignores, an
 * unjustified waiver, `--no-verify`. Every one is a deliberate act a reader can
 * see in the config. This was the same power in one `echo`, appearing nowhere
 * as a decision — and it moved a law the wrong way, towards green.
 */

/** Where a Lighthouse configuration is conventionally kept. */
export const LIGHTHOUSE_CONFIG_PATHS = [
  '.lighthouserc.json',
  '.lighthouserc.js',
  '.lighthouserc.yml',
  '.lighthouserc.yaml',
  'lighthouse.config.js',
  'lighthouserc.json',
  'lighthouse-budget.json',
];

/** The tool being invoked, rather than the word appearing somewhere. */
const RUNS_LIGHTHOUSE = /\b(?:lhci|lighthouse(?:-ci)?)\b/i;

/**
 * A performance threshold that is actually declared as one: an assertion on
 * `categories:performance`, or an `assert` block. A bare `90` in a JSON file is
 * a port, a width or a percentage far more often than it is a budget.
 */
const DECLARES_THRESHOLD =
  /categories:performance|"assert(?:ions)?"\s*:|minScore|"performance"\s*:\s*(?:0?\.\d+|\d{2,3})/i;

export interface LighthouseGate {
  /** A configuration file exists somewhere among the conventional paths. */
  hasConfig: boolean;
  /** Something actually runs Lighthouse: a script, a CI step, a dependency. */
  isWired: boolean;
  /** The configuration declares a performance threshold, not just a number. */
  declaresThreshold: boolean;
  /** Where the wiring was found, for a message that can be acted on. */
  evidence: string[];
  /** The configuration files that actually exist, by basename. */
  configFiles: string[];
}

function findConfigs(projectRoot: string): { names: string[]; content: string } {
  const names: string[] = [];
  let content = '';

  for (const rel of LIGHTHOUSE_CONFIG_PATHS) {
    const full = PathOperations.join(projectRoot, rel);
    if (!FileUtils.exists(full)) continue;
    names.push(rel);
    try {
      content += FileUtils.readFile(full, { encoding: 'utf8' });
    } catch {
      // An unreadable config tells us nothing; its existence is still recorded.
    }
  }

  return { names, content };
}

export function inspectLighthouseGate(
  projectRoot: string,
  config?: RuleOfCodeConfig
): LighthouseGate {
  const { names, content } = findConfigs(projectRoot);
  const evidence: string[] = [];

  const scripts =
    ProjectTypeDetectorValidation.getPackageScripts(projectRoot) ?? {};
  if (Object.values(scripts).some(cmd => RUNS_LIGHTHOUSE.test(String(cmd)))) {
    evidence.push('a package script runs it');
  }

  const deps =
    ProjectTypeDetectorValidation.getProjectDependencies(projectRoot) ?? {};
  if (Object.keys(deps).some(name => RUNS_LIGHTHOUSE.test(name))) {
    evidence.push('it is a declared dependency');
  }

  const ci = ciConfigContent(projectRoot, config);
  if (ci && RUNS_LIGHTHOUSE.test(ci)) {
    evidence.push('a CI step runs it');
  }

  return {
    hasConfig: names.length > 0,
    isWired: evidence.length > 0,
    declaresThreshold: names.length > 0 && DECLARES_THRESHOLD.test(content),
    evidence,
    configFiles: names,
  };
}
