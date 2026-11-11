/**
 * React Hooks Lint Enforced
 *
 * eslint-plugin-react-hooks is the one tool that checks the rules React's
 * runtime assumes and does not enforce: hooks called in the same order on
 * every render (rules-of-hooks), effects that list what they read
 * (exhaustive-deps), and — in its React Compiler rules — pure render,
 * immutable props and state, no setState straight inside an effect. A green
 * lint run proves none of it when the plugin is not configured, and RoC does
 * not duplicate those rules as laws because this one checks they are on.
 *
 * For every workspace package that declares react, the law finds the ESLint
 * config ESLint would use (the nearest flat eslint.config.* up to the
 * workspace root, else the .eslintrc cascade), parses it, and asks for the
 * plugin's recommended preset, a shared preset known to carry it, or both core
 * rules enabled — and for none of the core or relied-on compiler rules to be
 * turned off.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { NxWorkspace } from '../../utils/nx-workspace';
import { PathOperations } from '../../utils/path-operations';
import {
  CORE_HOOK_RULES,
  ESLINTRC_FILES,
  EslintHooksConfigReader,
  FLAT_CONFIG_FILES,
  HOOKS_PLUGIN,
  type HooksConfigEvidence,
  RELIED_COMPILER_RULES,
} from '../../utils/react/eslint-hooks-config';
import { loadTypeScript, parserUnavailable } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  eslintConfig?: unknown;
};

/** The config files ESLint would read for one package. */
interface ResolvedConfig {
  files: string[];
}

const PRESET_KEY = 'thresholds.react.hooksLintPresets';
const MANIFEST = 'package.json';

export class ReactHooksLintEnforcedLaw extends LawBase {
  static readonly LAW_NAME = 'React Hooks Lint Enforced';

  static check(context: LawCheckContext): LawResult {
    const violations = this.findViolations(context);
    return this.createResult(
      violations,
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        `Add ${HOOKS_PLUGIN} and spread reactHooks.configs.flat.recommended (or use eslint-config-next, which carries it)`,
        'Do not turn off rules-of-hooks, exhaustive-deps, set-state-in-effect, immutability, purity or static-components — disable a single line with a reason instead',
        `If a shared preset of your own enables the rules, name it in ${PRESET_KEY}`,
      ],
      context
    );
  }

  private static findViolations(context: LawCheckContext): string[] {
    const { projectRoot } = context;
    const ts = loadTypeScript(projectRoot);
    if (!ts) {
      return [`ESLint config: ${parserUnavailable(projectRoot)}`];
    }
    const named = context.config.thresholds?.react?.hooksLintPresets ?? [];
    const violations: string[] = [];
    const judged = new Set<string>();
    const dirs = this.reactPackageDirs(projectRoot);
    if (dirs.length === 0) {
      return [
        `no workspace package.json declaring react was found — ${this.LAW_NAME} did not find a config to inspect and does not pass on nothing`,
      ];
    }
    for (const dir of dirs) {
      const resolved = this.resolveConfig(dir, projectRoot);
      if (!resolved) {
        violations.push(
          `${this.relative(projectRoot, PathOperations.join(dir, MANIFEST))}: declares react but no ESLint config was found from its directory up to the workspace root — ${HOOKS_PLUGIN} cannot be enforced. Add an eslint.config.mjs with its recommended preset`
        );
        continue;
      }
      const key = resolved.files.join('|');
      if (judged.has(key)) continue;
      judged.add(key);
      const reader = new EslintHooksConfigReader(ts, projectRoot, named);
      for (const file of resolved.files) reader.read(file);
      const shown = this.relative(projectRoot, resolved.files[0] as string);
      violations.push(...this.verdict(reader.evidence, shown));
    }
    return violations;
  }

  private static verdict(evidence: HooksConfigEvidence, shown: string): string[] {
    const violations = [...evidence.unread];
    const relied = new Set([...CORE_HOOK_RULES, ...RELIED_COMPILER_RULES]);
    for (const { rule, at } of evidence.disabled) {
      if (!relied.has(rule)) continue;
      violations.push(
        `${at}: react-hooks/${rule} is turned off — the plugin stops checking what React assumes and RoC does not check it either. Re-enable it and disable single lines with a reason`
      );
    }
    const missing = CORE_HOOK_RULES.filter(rule => !evidence.enabled.has(rule));
    if (evidence.preset || missing.length === 0) return violations;
    const unknown = [...evidence.unknownModules];
    const hint =
      unknown.length > 0
        ? ` It imports ${unknown.join(', ')}, which this law cannot read: if one of them enables the hooks rules, name it in ${PRESET_KEY}.`
        : '';
    violations.push(
      `${shown}: ESLint does not enforce ${HOOKS_PLUGIN} — no recommended preset is used and ${missing.map(rule => `react-hooks/${rule}`).join(', ')} ${missing.length === 1 ? 'is' : 'are'} not enabled.${hint}`
    );
    return violations;
  }

  /** Directories of the workspace packages that declare react. */
  private static reactPackageDirs(projectRoot: string): string[] {
    const dirs: string[] = [];
    for (const file of NxWorkspace.resolveSourceFiles(projectRoot, MANIFEST)) {
      const manifest = this.manifest(file);
      if (manifest?.dependencies?.react || manifest?.devDependencies?.react) {
        dirs.push(PathOperations.getDirectory(file));
      }
    }
    return dirs;
  }

  private static manifest(file: string): Manifest | null {
    try {
      return FileSystemOperations.readJsonFile<Manifest>(file);
    } catch {
      return null;
    }
  }

  /**
   * The nearest flat config from `dir` up to the root; failing that, every
   * .eslintrc (and package.json `eslintConfig`) on the way — ESLint merges
   * that cascade.
   */
  private static resolveConfig(dir: string, projectRoot: string): ResolvedConfig | null {
    const chain = this.ancestors(dir, projectRoot);
    for (const current of chain) {
      const flat = FLAT_CONFIG_FILES.map(name => PathOperations.join(current, name)).find(file =>
        FileSystemOperations.exists(file)
      );
      if (flat) return { files: [flat] };
    }
    const files: string[] = [];
    for (const current of chain) {
      for (const name of ESLINTRC_FILES) {
        const file = PathOperations.join(current, name);
        if (FileSystemOperations.exists(file)) files.push(file);
      }
      const manifestFile = PathOperations.join(current, MANIFEST);
      if (this.manifest(manifestFile)?.eslintConfig !== undefined) files.push(manifestFile);
    }
    return files.length > 0 ? { files } : null;
  }

  /** `dir`, its parent, … up to and including the workspace root. */
  private static ancestors(dir: string, projectRoot: string): string[] {
    const chain: string[] = [];
    let current = PathOperations.resolve(dir);
    const root = PathOperations.resolve(projectRoot);
    for (;;) {
      chain.push(current);
      const parent = PathOperations.getDirectory(current);
      if (!PathOperations.isInDirectory(current, root) || current === root || parent === current) {
        break;
      }
      current = parent;
    }
    return chain;
  }

  private static relative(projectRoot: string, file: string): string {
    return PathOperations.getRelative(projectRoot, file);
  }
}
