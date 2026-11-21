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
