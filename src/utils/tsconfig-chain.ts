/**
 * A tsconfig.json's compiler options with its `extends` chain merged, read as
 * JSONC — without the TypeScript compiler.
 *
 * Shared by the laws that judge strict mode, so a project whose strict flags
 * live in a base config (an Nx tsconfig.base.json, @tsconfig/strictest) is
 * judged by what it inherits, and a config that cannot be read is said so.
 */

import fs from 'fs';
import path from 'path';

import { readJsonManifest } from './json-manifest';
import { typeScriptSource } from './react/tsx-source';

const TSCONFIG = 'tsconfig.json';

const isFile = (file: string): boolean => {
  try {
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
};

export interface TsconfigChain {
  /** Compiler options, base first, later `extends` entries over earlier ones, the file's own last. */
  options: Record<string, unknown>;
  /** Every `extends` link that could not be found or parsed: options it may set are unknown. */
  unread: string[];
  /** For each option, the file of the chain that set the value in `options`. */
  origins?: Record<string, string>;
  /** The file the chain ends at: the base with no `extends` of its own (#640). */
  end?: string;
  /** The last file of the chain outside node_modules: where a project can change it. */
  ownEnd?: string;
}

/** A file inside an installed package. */
const inPackage = (file: string): boolean =>
  /[\\/]node_modules[\\/]/.test(file);

/** An `extends` entry as a file: a relative path, or a package in node_modules. */
function resolveExtends(dir: string, link: string): string | null {
  const candidates = (base: string): string[] =>
    base.endsWith('.json')
      ? [base]
      : [base, `${base}.json`, path.join(base, TSCONFIG)];
  if (link.startsWith('.') || path.isAbsolute(link)) {
    return candidates(path.resolve(dir, link)).find(isFile) ?? null;
  }
  for (let at = dir; ; at = path.dirname(at)) {
    const found = candidates(path.join(at, 'node_modules', link)).find(isFile);
    if (found) return found;
    if (path.dirname(at) === at) return null;
  }
}

function chainOf(
  config: Record<string, unknown>,
  file: string,
  seen: Set<string>
): TsconfigChain {
  seen.add(file);
  let options: Record<string, unknown> = {};
  let origins: Record<string, string> = {};
  let end = file;
  let ownEnd: string | undefined = inPackage(file) ? undefined : file;
  const unread: string[] = [];
  const links = ([] as unknown[]).concat(config.extends ?? []);
  for (const link of links) {
    if (typeof link !== 'string') continue;
    const base = resolveExtends(path.dirname(file), link);
    if (!base || seen.has(base)) {
      if (!base) unread.push(link);
      continue;
    }
    const read = readJsonManifest(base, { jsonc: true });
    if (read.notRead !== undefined) {
      unread.push(link);
      continue;
    }
    const inherited = chainOf(read.data, base, seen);
    options = { ...options, ...inherited.options };
    origins = { ...origins, ...inherited.origins };
    end = inherited.end ?? base;
    ownEnd = inherited.ownEnd ?? ownEnd;
    unread.push(...inherited.unread);
  }
  const own = config.compilerOptions;
  const ownOptions =
    own && typeof own === 'object' ? (own as Record<string, unknown>) : {};
  for (const key of Object.keys(ownOptions)) origins[key] = file;
  return {
    options: { ...options, ...ownOptions },
    unread,
    origins,
    end,
    ...(ownEnd ? { ownEnd } : {}),
  };
}

/**
 * The merged compiler options of the tsconfig at `file`, or why the file
 * itself could not be read. An unreadable link of its `extends` chain does
 * not fail the read; it is named in `unread`.
 */
export function readTsconfigChain(
  file: string
): (TsconfigChain & { notRead?: undefined }) | { notRead: string } {
  const read = readJsonManifest(file, { jsonc: true });
  if (read.notRead !== undefined) return { notRead: read.notRead };
  return chainOf(read.data, file, new Set());
}

/**
 * Whether the merged options switch strict type checking on: `strict: true`,
 * or — without a `strict` setting — both `noImplicitAny` and
 * `strictNullChecks`. `null` when the read files leave it unset and a link of
 * the chain was not read: the unread base may set it.
 */
export function strictModeOf(chain: TsconfigChain): boolean | null {
  const { options } = chain;
  if (options.strict !== undefined) return options.strict === true;
  if (options.noImplicitAny === true && options.strictNullChecks === true) {
    return true;
  }
  return chain.unread.length > 0 ? null : false;
}

/**
 * What a tsconfig is for in a project-references build: the root itself, a
 * production project, or a project that compiles tests only.
 */
export type TsconfigRole = 'root' | 'production' | 'test';

/** One tsconfig a law judges, its `extends` chain merged. */
export interface TsconfigProject {
  file: string;
  /** Relative to the project root, with forward slashes. */
  rel: string;
  role: TsconfigRole;
  chain: TsconfigChain;
}

export interface TsconfigProjects {
  /** The project root the paths are relative to. */
  projectRoot: string;
  /** The root first (unless it is solution-style), then the references, depth first. */
  projects: TsconfigProject[];
  /** A reference that could not be found or parsed: its options were not read. */
  notRead: string[];
}

/**
 * A solution-style tsconfig compiles nothing itself: `files: []` and no
 * `include` (or `include: []`) — the shape Vite templates and Nx workspaces
 * use. It is followed, not judged, whatever it extends.
 */
function isSolutionStyle(data: Record<string, unknown>): boolean {
  // `files: []` with no `include` (or `include: []`) compiles nothing,
  // whatever it extends: it is followed, not judged (#640).
  return (
    Array.isArray(data.files) &&
    data.files.length === 0 &&
    (data.include === undefined ||
      (Array.isArray(data.include) && data.include.length === 0))
  );
}

/** A file name that says the config is for tests: tsconfig.spec.json, tsconfig.test.json, tsconfig.e2e.json. */
const TEST_CONFIG_NAME = /\.(?:spec|test|tests|e2e)\.json$/i;
/** An `include` entry that matches test files only. */
const TEST_GLOB =
  /\.(?:spec|test|e2e-spec|cy)\.\*|\.(?:spec|test|e2e-spec|cy)\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|tests?|e2e|cypress|spec)(?:\/|$)/i;
const TYPES_GLOB = /\.d\.ts$/i;
/** The directory of an end-to-end test project. */
const E2E_PROJECT_DIR = /^(?:e2e|cypress|playwright)$|-e2e$/i;

/**
 * A config for tests: named so, or whose own `include` lists only test globs
 * (a `.d.ts` entry aside). An inherited `include` is not looked at.
 */
function isTestConfig(file: string, data: Record<string, unknown>): boolean {
  if (TEST_CONFIG_NAME.test(path.basename(file))) return true;
  // An end-to-end project: its directory is `e2e`, `cypress`, `playwright`
  // or ends in `-e2e` (an Nx `<app>-e2e`).
  if (E2E_PROJECT_DIR.test(path.basename(path.dirname(file)))) return true;
  const include = Array.isArray(data.include)
    ? data.include.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const sources = include.filter(entry => !TYPES_GLOB.test(entry));
  return sources.length > 0 && sources.every(entry => TEST_GLOB.test(entry));
}

/** The `path` of every `references` entry, as written. */
function referencePaths(data: Record<string, unknown>): string[] {
  const references = Array.isArray(data.references) ? data.references : [];
  return references
    .map(reference =>
      reference && typeof reference === 'object'
        ? (reference as { path?: unknown }).path
        : undefined
    )
    .filter((target): target is string => typeof target === 'string');
}

/** A `references` entry as a file: a tsconfig file, or a directory's tsconfig.json. */
function referencedFile(dir: string, target: string): string | null {
  const at = path.resolve(dir, target);
  if (isFile(at)) return at;
  const inside = path.join(at, TSCONFIG);
  return isFile(inside) ? inside : null;
}

/**
 * The tsconfigs a project-references build compiles from the root at `file`
 * (#640): the root unless it is solution-style, and every project it lists in
 * `references`, followed through their own `references` as `tsc -b` does.
 * Each file is judged once, so a cycle ends at the file seen before. A
 * reference that is missing or does not parse is named in `notRead`. null
 * when the root itself cannot be read: the caller says so as before.
 */
export function readTsconfigProjects(
  projectRoot: string,
  file: string
): TsconfigProjects | null {
  const root = readJsonManifest(file, { jsonc: true });
  if (root.notRead !== undefined) return null;
  const relOf = (at: string): string =>
    path.relative(projectRoot, at).replace(/\\/g, '/');
  const projects: TsconfigProject[] = [];
  const notRead: string[] = [];
  const seen = new Set<string>();
  const visit = (
    data: Record<string, unknown>,
    at: string,
    role: TsconfigRole
  ): void => {
    seen.add(at);
    const chain = chainOf(data, at, new Set());
    if (!isSolutionStyle(data)) {
      projects.push({ file: at, rel: relOf(at), role, chain });
    }
    for (const target of referencePaths(data)) {
      const found = referencedFile(path.dirname(at), target);
      if (!found) {
        notRead.push(
          `${relOf(at)} references ${JSON.stringify(target)}, which was not found — its compiler options were NOT read`
        );
        continue;
      }
      if (seen.has(found)) continue;
      const read = readJsonManifest(found, { jsonc: true });
      if (read.notRead !== undefined) {
        seen.add(found);
        notRead.push(
          `${relOf(found)} (referenced by ${relOf(at)}) ${read.notRead} — its compiler options were NOT read`
        );
        continue;
      }
      visit(
        read.data,
        found,
        isTestConfig(found, read.data) ? 'test' : 'production'
      );
    }
  };
  visit(root.data, file, 'root');
  // A solution-style root that references nothing judges as it reads.
  if (projects.length === 0 && notRead.length === 0) {
    const chain = chainOf(root.data, file, new Set());
    projects.push({ file, rel: relOf(file), role: 'root', chain });
  }
  return { projectRoot, projects, notRead };
}

/**
 * How a finding about `flags` of one project starts (#640). A tsconfig.json
 * judged alone keeps its findings as they always read. In a build with
 * references, a finding goes to the file of the `extends` chain that set the
 * flag — or, when no file sets it, the file the chain ends at — so a base
 * that thirty projects extend gives one finding, not thirty (the caller
 * drops repeats). Marked "(test config)" only when that file is a test
 * config itself: a test config's own weaker value.
 */
export function tsconfigFindingWhere(
  all: TsconfigProjects,
  project: TsconfigProject,
  flags: readonly string[]
): string {
  const judgedAlone =
    all.projects.length === 1 &&
    project.role === 'root' &&
    all.notRead.length === 0;
  if (judgedAlone) return '';
  const origins = project.chain.origins ?? {};
  const flag = flags.find(f => origins[f]);
  const setBy = flag ? origins[flag] : undefined;
  let where = setBy ?? project.chain.end ?? project.file;
  // A base in node_modules cannot be edited: the finding goes to the last
  // file of the chain outside it, where the fix belongs, and names the
  // package's value when the package set it (#640).
  let inherited = '';
  if (inPackage(where)) {
    if (setBy && flag) {
      inherited = ` (inherited from ${packageOf(setBy)}: ${JSON.stringify(project.chain.options[flag])})`;
    }
    where = project.chain.ownEnd ?? project.file;
  }
  const rel = path.relative(all.projectRoot, where).replace(/\\/g, '/');
  const marker =
    where === project.file && project.role === 'test' ? ' (test config)' : '';
  return `${rel}${marker}${inherited}: `;
}

/** The package a file in node_modules belongs to: `@vue/tsconfig`, `@tsconfig/strictest`. */
function packageOf(file: string): string {
  const after = file.replace(/\\/g, '/').split('/node_modules/').pop() ?? '';
  const parts = after.split('/');
  return (parts[0] ?? '').startsWith('@')
    ? `${parts[0]}/${parts[1] ?? ''}`
    : (parts[0] ?? '');
}

/**
 * The defaults of the TypeScript major the project builds with, for the
 * options the strict laws read (#667). From TypeScript 6.0 on, an option a
 * tsconfig leaves out has a new value:
 *
 * - "`strict` is now `true` by default … If you were relying on the previous
 *   default of `false`, you'll need to explicitly set `"strict": false`"
 * - "The new default `target` is the most recent supported ECMAScript spec
 *   version" (es2025 in 6.0)
 *
 * (https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/;
 * TypeScript 7.0 "adopts 6.0's new defaults", "`strict` is `true` by
 * default": https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
 * Before 6.0, or when the project's version is unknown, an absent option has
 * no value here: the laws judge it as absent, as before.
 */
export function absentOptionDefaults(
  projectRoot: string
): Record<string, unknown> {
  const version = typeScriptSource(projectRoot).projectVersion;
  const major = version ? Number(/^(\d+)/.exec(version)?.[1]) : NaN;
  return Number.isFinite(major) && major >= 6
    ? { strict: true, target: 'es2025' }
    : {};
}
