/**
 * Performance budgets that are ENFORCED, and the gates that enforce them —
 * one reader for every performance law, so two laws cannot disagree about the
 * same repository.
 *
 * A budget is a number a regression cannot cross without something failing.
 * The laws knew two kinds, Angular `budgets` and webpack `performance`, so a
 * project on any other toolchain could only satisfy them by adding an unused
 * `webpack.config.js` — teaching people to fake a gate. This adds the two
 * toolchain-neutral kinds:
 *
 * - **size-limit** (14.x, read from its `get-config.js`): a check with a
 *   `limit`, in package.json's `"size-limit"` key or one of `.size-limit.json`,
 *   `.size-limit.jsonc`, `.size-limit`, `.size-limit.{js,mjs,cjs,ts,mts,cts}`;
 *   the CLI exits 1 when a check fails. It counts only when something RUNS it
 *   (a package script or a CI step): an unrun config gates nothing.
 * - **Lighthouse assertions**, through the shared Lighthouse reader, which
 *   already insists the config is wired and declares a threshold.
 *
 * And the gate: a CI step — or, where the project has no hosted CI, a git hook
 * — that runs a budget tool, directly or through package scripts. Comments are
 * removed and step names are skipped first: a gate is a command, not the word
 * `performance` in a comment.
 */

import { AngularBundleConfig } from './angular-bundle-config';
import { commandText } from './ci-command-text';
import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { inspectLighthouseGate } from './lighthouse-gate';
import { NxWorkspace } from './nx-workspace';
import { PathOperations } from './path-operations';
import { ciConfigPaths } from './project-discovery';
import { JsConfigSource } from './react/js-config-source';
import { WorkspaceManifests } from './workspace-manifests';
import type { RuleOfCodeConfig } from '../config/types';

type CiConfig = { pathMappings?: { cicdConfig?: string | string[] } } | RuleOfCodeConfig;

const SIZE_LIMIT_JSON_FILES = ['.size-limit.json', '.size-limit.jsonc', '.size-limit'];
const SIZE_LIMIT_CODE_FILES = [
  '.size-limit.js',
  '.size-limit.mjs',
  '.size-limit.cjs',
  '.size-limit.ts',
  '.size-limit.mts',
  '.size-limit.cts',
];
const SIZE_LIMIT_KEY = 'size-limit';
const RUNS_SIZE_LIMIT = /\bsize-limit\b/;

/** A command that runs a budget tool. */
const RUNS_BUDGET_TOOL = /\blhci\b|lighthouse-ci|\bsize-limit\b|\bbundlesize\b|\bbundlewatch\b/i;

/** A command that runs the Angular production build (which fails on `maximumError`). */
const RUNS_ANGULAR_BUILD =
  /\bng\s+build\b|\bnx\s+build\b|\bnx\s+run\s+\S+:build\b|\bnx\s+(?:run-many|affected)\b[^\n]*\bbuild\b/;

/** `npm run x`, `npm test`, `yarn x`, `pnpm x`, `bun run x` → the script name. */
const SCRIPT_REFERENCE = /\b(?:npm\s+run|npm|yarn(?:\s+run)?|pnpm(?:\s+run)?|bun\s+run)\s+([\w:.-]+)/g;

const SCRIPT_DEPTH = 5;

const LOCAL_HOOK_FILES = [
  '.husky/pre-commit',
  '.husky/pre-push',
  'lefthook.yml',
  '.lefthook.yml',
  'lefthook.yaml',
  '.lefthook.yaml',
];

export interface SizeLimitStatus {
  /** Where a check with a `limit` is declared. */
  declaredIn: string[];
  /** What runs size-limit. */
  runBy: string[];
  /** Config files that exist but could not be read. */
  unread: string[];
}

export interface BudgetGateStatus {
  /** The project has hosted CI configuration. */
  hostedCi: boolean;
  /** Each gate found: `CI ci.yml runs size-limit`, `.husky/pre-push runs lhci`. */
  gates: string[];
}

function readJsonc(file: string): unknown {
  try {
    return FileSystemOperations.readJsoncFile<unknown>(file);
  } catch {
    return undefined;
  }
}

function checksDeclareLimit(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.some(
      check =>
        check !== null &&
        typeof check === 'object' &&
        typeof (check as { limit?: unknown }).limit === 'string'
    )
  );
}

export class PerformanceBudgetGates {
  /** size-limit: declared checks with a limit, and what runs them. */
  static sizeLimit(projectRoot: string, config?: CiConfig): SizeLimitStatus {
    const status: SizeLimitStatus = { declaredIn: [], runBy: [], unread: [] };
    const relative = (file: string): string => PathOperations.getRelative(projectRoot, file) || '.';
    for (const manifest of WorkspaceManifests.all(projectRoot)) {
      if (checksDeclareLimit(manifest.raw[SIZE_LIMIT_KEY])) {
        status.declaredIn.push(relative(PathOperations.join(manifest.dir, 'package.json')));
      }
      this.sizeLimitFiles(projectRoot, manifest.dir, status, relative);
      for (const [name, command] of Object.entries(manifest.scripts)) {
        if (RUNS_SIZE_LIMIT.test(command)) status.runBy.push(`script "${name}"`);
      }
    }
    for (const file of this.ciFiles(projectRoot, config)) {
      if (RUNS_SIZE_LIMIT.test(commandText(this.read(file)))) status.runBy.push(`CI ${relative(file)}`);
    }
    return status;
  }

  private static sizeLimitFiles(
    projectRoot: string,
    dir: string,
    status: SizeLimitStatus,
    relative: (file: string) => string
  ): void {
    for (const name of SIZE_LIMIT_JSON_FILES) {
      const file = PathOperations.join(dir, name);
      if (!FileUtils.exists(file)) continue;
      const parsed = readJsonc(file);
      if (parsed === undefined) status.unread.push(`${relative(file)}: not valid JSON`);
      else if (checksDeclareLimit(parsed)) status.declaredIn.push(relative(file));
    }
    for (const name of SIZE_LIMIT_CODE_FILES) {
      const file = PathOperations.join(dir, name);
      if (!FileUtils.exists(file)) continue;
      const read = JsConfigSource.read(projectRoot, file);
      if (!read.source) status.unread.push(read.unread);
      else if (JsConfigSource.valuesOf(read.source, 'limit').length > 0) status.declaredIn.push(relative(file));
    }
  }

  /** A size-limit budget that something runs, described; null when there is none. */
  static enforcedSizeLimit(projectRoot: string, config?: CiConfig): string | null {
    const status = this.sizeLimit(projectRoot, config);
    if (status.declaredIn.length === 0 || status.runBy.length === 0) return null;
    return `size-limit (${status.declaredIn.join(', ')}; run by ${status.runBy.join(', ')})`;
  }

  /** Lighthouse assertions that something runs, described; null when there are none. */
  static enforcedLighthouse(projectRoot: string, config?: CiConfig): string | null {
    const gate = inspectLighthouseGate(projectRoot, config as RuleOfCodeConfig | undefined);
    if (!gate.isWired || !gate.declaresThreshold) return null;
    return `Lighthouse assertions (${gate.configFiles.join(', ')}; ${gate.evidence.join(', ')})`;
  }

  /** Every toolchain-neutral enforced budget (size-limit, Lighthouse). */
  static enforcedBudgets(projectRoot: string, config?: CiConfig): string[] {
    return [this.enforcedSizeLimit(projectRoot, config), this.enforcedLighthouse(projectRoot, config)].filter(
      (budget): budget is string => budget !== null
    );
  }

  /**
   * CI steps — or git hooks, where the project has no hosted CI — that run a
   * budget tool, directly or through package scripts. An Angular build counts
   * as a budget gate when the build config declares a `maximumError` budget,
   * because that build fails when the budget is crossed.
   */
  static budgetGates(projectRoot: string, config?: CiConfig): BudgetGateStatus {
    const ciFiles = this.ciFiles(projectRoot, config);
    if (ciFiles.length > 0) {
      const gates: string[] = [];
      for (const file of ciFiles) {
        const how = this.runsBudget(projectRoot, commandText(this.read(file)));
        if (how) gates.push(`CI ${PathOperations.getRelative(projectRoot, file)} runs ${how}`);
      }
      return { hostedCi: true, gates };
    }
    return { hostedCi: false, gates: this.localGates(projectRoot) };
  }

  /** Git hooks (husky, lefthook, simple-git-hooks) that run a budget tool. */
  private static localGates(projectRoot: string): string[] {
    const hooks: Array<[string, string]> = [];
    for (const name of LOCAL_HOOK_FILES) {
      const file = PathOperations.join(projectRoot, name);
      if (FileUtils.exists(file)) hooks.push([name, commandText(this.read(file))]);
    }
    const rootManifest = WorkspaceManifests.all(projectRoot).find(
      manifest => PathOperations.getRelative(projectRoot, manifest.dir) === ''
    );
    const simpleGitHooks = rootManifest?.raw['simple-git-hooks'];
    if (simpleGitHooks && typeof simpleGitHooks === 'object') {
      for (const [hook, command] of Object.entries(simpleGitHooks as Record<string, unknown>)) {
        if (typeof command === 'string') hooks.push([`simple-git-hooks ${hook}`, command]);
      }
    }
    const gates: string[] = [];
    for (const [where, commands] of hooks) {
      const how = this.runsBudget(projectRoot, commands);
      if (how) gates.push(`${where} runs ${how}`);
    }
    return gates;
  }

  /** What budget tool `commands` runs (following package scripts), or null. */
  static runsBudget(projectRoot: string, commands: string): string | null {
    const scripts: Record<string, string> = {};
    for (const manifest of WorkspaceManifests.all(projectRoot)) Object.assign(scripts, manifest.scripts);
    const angularBudgets = this.angularBuildEnforcesBudgets(projectRoot);
    return this.resolve(commands, scripts, angularBudgets, SCRIPT_DEPTH);
  }

  private static resolve(
    commands: string,
    scripts: Record<string, string>,
    angularBudgets: boolean,
    depth: number
  ): string | null {
    const tool = RUNS_BUDGET_TOOL.exec(commands);
    if (tool) return tool[0];
    if (angularBudgets && RUNS_ANGULAR_BUILD.test(commands)) return 'the Angular build (maximumError budgets)';
    if (depth === 0) return null;
    for (const match of commands.matchAll(SCRIPT_REFERENCE)) {
      const name = match[1];
      const script = name !== undefined ? scripts[name] : undefined;
      if (script === undefined) continue;
      const found = this.resolve(script, scripts, angularBudgets, depth - 1);
      if (found) return `${found} (via script "${name}")`;
    }
    return null;
  }

  private static angularBuildEnforcesBudgets(projectRoot: string): boolean {
    return (
      AngularBundleConfig.hasBudgets(projectRoot) &&
      /"maximumError"\s*:/.test(NxWorkspace.getBuildConfigContent(projectRoot))
    );
  }

  /** CI configuration files; a workflows directory contributes each file in it. */
  private static ciFiles(projectRoot: string, config?: CiConfig): string[] {
    const files: string[] = [];
    for (const entry of ciConfigPaths(projectRoot, config as Parameters<typeof ciConfigPaths>[1])) {
      if (!FileUtils.isDirectory(entry)) {
        files.push(entry);
        continue;
      }
      for (const child of FileSystemOperations.readDirectory(entry)) {
        if (child.isFile()) files.push(PathOperations.join(entry, child.name));
      }
    }
    return files;
  }

  private static read(file: string): string {
    try {
      return FileUtils.readFile(file, { encoding: 'utf8' });
    } catch {
      return '';
    }
  }
}
