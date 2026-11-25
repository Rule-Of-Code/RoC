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
}

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
    unread.push(...inherited.unread);
  }
  const own = config.compilerOptions;
  const ownOptions =
    own && typeof own === 'object' ? (own as Record<string, unknown>) : {};
  return { options: { ...options, ...ownOptions }, unread };
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
  /** The root first (unless it is solution-style), then the references, depth first. */
  projects: TsconfigProject[];
  /** A reference that could not be found or parsed: its options were not read. */
  notRead: string[];
}

/**
 * A solution-style tsconfig compiles nothing itself: `files: []`, no
 * `include`, and no compiler option of its own or inherited (the shape Vite
 * templates use). It is followed, not judged.
 */
function isSolutionStyle(
  data: Record<string, unknown>,
  chain: TsconfigChain
): boolean {
  return (
    Array.isArray(data.files) &&
    data.files.length === 0 &&
    data.include === undefined &&
    chain.unread.length === 0 &&
    Object.keys(chain.options).length === 0
  );
}

/** A file name that says the config is for tests: tsconfig.spec.json, tsconfig.test.json, tsconfig.e2e.json. */
const TEST_CONFIG_NAME = /\.(?:spec|test|tests|e2e)\.json$/i;
/** An `include` entry that matches test files only. */
const TEST_GLOB =
  /\.(?:spec|test|e2e-spec|cy)\.\*|\.(?:spec|test|e2e-spec|cy)\.[cm]?[jt]sx?$|(?:^|\/)(?:__tests__|tests?|e2e|cypress|spec)(?:\/|$)/i;
const TYPES_GLOB = /\.d\.ts$/i;

/**
 * A config for tests: named so, or whose own `include` lists only test globs
 * (a `.d.ts` entry aside). An inherited `include` is not looked at.
 */
function isTestConfig(file: string, data: Record<string, unknown>): boolean {
  if (TEST_CONFIG_NAME.test(path.basename(file))) return true;
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
    if (!isSolutionStyle(data, chain)) {
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
  return { projects, notRead };
}

/**
 * How a finding about one tsconfig starts: nothing for the root (its findings
 * read as they always did), the file for a referenced project, and the file
 * marked as a test config for one that compiles tests only.
 */
export function tsconfigFindingPrefix(project: TsconfigProject): string {
  if (project.role === 'root') return '';
  return project.role === 'test'
    ? `${project.rel} (test config): `
    : `${project.rel}: `;
}
