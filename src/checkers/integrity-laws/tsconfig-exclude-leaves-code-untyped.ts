/**
 * Tsconfig Exclude Leaves Code Untyped
 *
 * `"exclude": ["node_modules", "e2e"]` is a common setup, and a runner that
 * strips types at runtime does not check them. The excluded specs are then in
 * no compilation at all: `tsc --noEmit` is green, and an undefined identifier
 * reaches CI as a runtime failure — or never, if that line is not reached. The
 * gate reports a pass over a subset without saying so.
 *
 * Every tsconfig git tracks is resolved with the project's own TypeScript
 * (`extends`, `include`, `files`, `exclude` — the compiler's algorithm, not an
 * imitation), and every project reference is followed. For each `exclude`
 * entry other than a dependency or build folder, the tracked .ts/.tsx/.mts/.cts files it
 * matches must each be included by some tsconfig. A config, reference or
 * `extends` that cannot be resolved is reported, never skipped: the files it
 * would have covered are unknown.
 *
 * A config that sets neither `include` nor `files` (in itself or anything it
 * extends) and is itself extended by another tsconfig is a shared base: its
 * implicit "everything under me" is a default nobody compiles, so it does not
 * count as covering a file.
 */

import * as fs from 'fs';
import { minimatch } from 'minimatch';
import * as path from 'path';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { relativePath, trackedFiles } from '../../utils/integrity/tracked-files';
import { loadTypeScript, type TypeScriptModule } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** Exclude entries naming one of these are dependency or build output, not code. */
export const DEPENDENCY_AND_BUILD_FOLDERS = [
  'node_modules', 'bower_components', 'jspm_packages', 'dist', 'build', 'out', 'tmp', 'temp',
  '.next', '.nuxt', '.output', '.svelte-kit', '.angular', '.nx', '.turbo', '.vercel', '.expo',
  'coverage', 'www', 'android', 'ios',
];

/** TS18003 "No inputs were found": an empty config is not unresolvable. */
const NO_INPUTS = 18003;
const MAX_EXTENDS_DEPTH = 16;
const SAMPLE = 3;

interface ResolvedConfig {
  file: string;
  raw: { include?: unknown; files?: unknown; exclude?: unknown; extends?: unknown };
  fileNames: string[];
  outDirs: string[];
}

const key = (file: string): string => {
  const normal = path.resolve(file).replace(/\\/g, '/');
  return process.platform === 'win32' ? normal.toLowerCase() : normal;
};

export class TsconfigExcludeLeavesCodeUntypedLaw extends LawBase {
  static readonly LAW_NAME = 'Tsconfig Exclude Leaves Code Untyped';

  static check(context: LawCheckContext): LawResult {
    return this.createResult(
      this.findings(context.projectRoot),
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Give the excluded directory its own tsconfig that includes it (e2e/tsconfig.json), and run it in the typecheck',
        'Or stop excluding it from the main tsconfig',
      ],
      context
    );
  }

  private static findings(root: string): string[] {
    const ts = loadTypeScript(root);
    if (!ts) return [`could not load the 'typescript' package from ${root} — no tsconfig was resolved`];
    const listed = trackedFiles(root, ['*tsconfig*.json', '*.ts', '*.tsx', '*.mts', '*.cts']);
    if (!listed.ok) return [`${listed.reason} — no tsconfig was resolved`];
    const configFiles = listed.files.filter(file => /tsconfig[^/\\]*\.json$/.test(path.basename(file)));
    if (configFiles.length === 0) return ['no tracked tsconfig*.json — nothing says what is type-checked'];
    const sources = listed.files.filter(file => /\.(?:ts|tsx|mts|cts)$/.test(file) && !/\.d\.[cm]?ts$/.test(file));

    const findings: string[] = [];
    const resolved = this.resolveAll(ts, root, configFiles, findings);
    const covered = this.covered(ts, resolved);
    for (const config of resolved) {
      findings.push(...this.uncovered(root, config, sources, covered));
    }
    return findings;
  }

  /** Resolve every tracked config and every config a reference names. */
  private static resolveAll(
    ts: TypeScriptModule,
    root: string,
    configFiles: string[],
    findings: string[]
  ): ResolvedConfig[] {
    const queue = [...configFiles];
    const seen = new Set<string>();
    const resolved: ResolvedConfig[] = [];
    while (queue.length > 0) {
      const file = queue.shift() ?? '';
      if (seen.has(key(file))) continue;
      seen.add(key(file));
      const result = this.resolve(ts, file);
      const where = relativePath(root, file);
      if (typeof result === 'string') {
        findings.push(`${where}: cannot resolve — ${result}; the files it would include are unknown, so nothing it excludes is passed`);
        continue;
      }
      resolved.push(result.config);
      for (const reference of result.references) {
        if (fs.existsSync(reference)) queue.push(reference);
        else findings.push(`${where}: references ${relativePath(root, reference)}, which does not exist`);
      }
    }
    return resolved;
  }

  private static resolve(
    ts: TypeScriptModule,
    file: string
  ): { config: ResolvedConfig; references: string[] } | string {
    const read = ts.readConfigFile(file, ts.sys.readFile);
    if (read.error) return this.message(ts, read.error);
    const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(file), undefined, file);
    const errors = parsed.errors.filter(error => error.code !== NO_INPUTS);
    if (errors.length > 0) return errors.map(error => this.message(ts, error)).join('; ');
    const outDirs = [parsed.options.outDir, parsed.options.declarationDir].filter(
      (dir): dir is string => typeof dir === 'string'
    );
    const references = (parsed.projectReferences ?? []).map(reference =>
      path.extname(reference.path) === '.json' ? reference.path : path.join(reference.path, 'tsconfig.json')
    );
    return {
      config: { file, raw: read.config as ResolvedConfig['raw'], fileNames: parsed.fileNames, outDirs },
      references,
    };
  }

  private static message(ts: TypeScriptModule, diagnostic: TS.Diagnostic): string {
    return ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');
  }

  /** Files some config includes, shared bases (implicit include, extended by another) left out. */
  private static covered(ts: TypeScriptModule, configs: ResolvedConfig[]): Set<string> {
    const extended = new Set<string>();
    for (const config of configs) {
      for (const target of this.extendsTargets(config.file, config.raw.extends)) extended.add(key(target));
    }
    const covered = new Set<string>();
    for (const config of configs) {
      const sharedBase = extended.has(key(config.file)) && !this.setsInputs(ts, config.file, 0);
      if (sharedBase) continue;
      for (const file of config.fileNames) covered.add(key(file));
    }
    return covered;
  }

  /** Relative `extends` targets (a package base lives in node_modules, outside the repository). */
  private static extendsTargets(file: string, value: unknown): string[] {
    const list = Array.isArray(value) ? value : [value];
    return list
      .filter((target): target is string => typeof target === 'string' && /^\.{0,2}[/\\]|^[A-Za-z]:/.test(target))
      .map(target => {
        const full = path.resolve(path.dirname(file), target);
        return full.endsWith('.json') ? full : `${full}.json`;
      });
  }

  /** Whether a config, or anything it extends, says `include` or `files`. */
  private static setsInputs(ts: TypeScriptModule, file: string, depth: number): boolean {
    if (depth > MAX_EXTENDS_DEPTH) return true; // a cycle: do not call it a base
    const read = ts.readConfigFile(file, ts.sys.readFile);
    if (read.error) return true;
    const raw = read.config as ResolvedConfig['raw'];
    if (raw.include !== undefined || raw.files !== undefined) return true;
    return this.extendsTargets(file, raw.extends).some(target => this.setsInputs(ts, target, depth + 1));
  }

  /** Each own `exclude` entry of `config` whose tracked files no config includes. */
  private static uncovered(
    root: string,
    config: ResolvedConfig,
    sources: string[],
    covered: Set<string>
  ): string[] {
    const exclude = config.raw.exclude;
    if (exclude === undefined) return [];
    const where = relativePath(root, config.file);
    if (!Array.isArray(exclude) || !exclude.every(entry => typeof entry === 'string')) {
      return [`${where}: cannot read — "exclude" is not a list of strings`];
    }
    const dir = path.dirname(config.file);
    const findings: string[] = [];
    for (const entry of exclude as string[]) {
      if (this.isDependencyOrBuild(entry, dir, config.outDirs)) continue;
      const missing = this.matching(entry, dir, sources).filter(file => !covered.has(key(file)));
      if (missing.length === 0) continue;
      const sample = missing.slice(0, SAMPLE).map(file => relativePath(root, file));
      findings.push(
        `${where}: exclude "${entry}" leaves ${missing.length} TypeScript file(s) in no tsconfig (${sample.join(', ')}${missing.length > SAMPLE ? ', …' : ''}) — a green tsc says nothing about them`
      );
    }
    return findings;
  }

  private static isDependencyOrBuild(entry: string, dir: string, outDirs: string[]): boolean {
    const segments = entry.replace(/\\/g, '/').split('/');
    if (segments.some(segment => DEPENDENCY_AND_BUILD_FOLDERS.includes(segment))) return true;
    const literal = path.resolve(dir, entry.replace(/\/\*\*.*$/, ''));
    return outDirs.some(out => key(out) === key(literal));
  }

  /** Tracked sources under `dir` that the exclude entry matches (the entry, or anything beneath it). */
  private static matching(entry: string, dir: string, sources: string[]): string[] {
    const pattern = entry.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
    return sources.filter(file => {
      const rel = path.relative(dir, file).replace(/\\/g, '/');
      if (rel.startsWith('../') || path.isAbsolute(rel)) return false;
      return minimatch(rel, pattern, { dot: true }) || minimatch(rel, `${pattern}/**`, { dot: true });
    });
  }
}
