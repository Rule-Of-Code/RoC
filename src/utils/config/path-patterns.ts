/**
 * One form for every path pattern a config gives (#414).
 *
 * Patterns are matched against project-relative paths with forward slashes.
 * An `ignores.*` entry written another way matched nothing, and said nothing:
 * minimatch reads `\` as an escape, so `vendor\**` never matched
 * `vendor/lib.js`; `./vendor/**` and `vendor/` never matched it either; and an
 * absolute path never matched a relative one. The include side already
 * normalised slashes, so the same pattern worked there and was dead here.
 *
 * Every pattern is brought to the one form here, once, when the config is
 * loaded — so every reader of `ignores.*` and `includes.*` (the scanners, the
 * glob `ignore` option, the law gates) sees the same thing:
 *   `\` → `/` · a leading `./` dropped · `dir/` → `dir/**` · an absolute path
 *   inside the project → relative to it (the root itself → `**`).
 * A leading `!` is kept. An absolute path OUTSIDE the project cannot match a
 * project file in any form; it is left as written, and the audit names it
 * (see `absolutePatternsIn`) instead of ignoring it in silence.
 */
import fs from 'fs';
import { minimatch } from 'minimatch';

import type { RuleOfCodeConfig } from '../../config/types';
import { PathOperations } from '../path-operations';

const isAbsolutePattern = (pattern: string): boolean =>
  /^[A-Za-z]:\//.test(pattern) || pattern.startsWith('/');

/** The root with forward slashes and no trailing slash. */
const rootOf = (projectRoot: string): string =>
  PathOperations.normalize(projectRoot).replace(/\\/g, '/').replace(/\/+$/, '');

const CLOSER_OF: Record<string, string> = { '[': ']', '{': '}', '(': ')' };

/**
 * `\` is both the Windows separator and the glob escape. A separator unless it
 * escapes: always before a closing `]`, `}` or `)` (no path segment starts
 * with one), before an opening `[`, `{` or `(` only when the matching closer
 * is escaped later in the pattern, and before `!`, `+` or `@`. So
 * `weird\[1\]/**` keeps its escapes (the literal directory `weird[1]`), while
 * `vendor\**`, `vendor\lib.js` and `app\[slug]\page.tsx` are Windows paths.
 */
export function backslashesToSlashes(pattern: string): string {
  let out = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char !== '\\') {
      out += char;
      continue;
    }
    const next = pattern[i + 1] ?? '';
    const closer = CLOSER_OF[next];
    const escapes =
      next === ']' ||
      next === '}' ||
      next === ')' ||
      next === '!' ||
      next === '+' ||
      next === '@' ||
      (closer !== undefined && pattern.includes(`\\${closer}`, i + 2));
    if (escapes) {
      out += `\\${next}`;
      i++;
    } else {
      out += '/';
    }
  }
  return out;
}

/** `pattern` in the one form; an absolute path outside the project as written. */
export function normalizePathPattern(
  pattern: string,
  projectRoot: string
): string {
  if (typeof pattern !== 'string') return pattern;
  const negated = pattern.startsWith('!');
  let body = backslashesToSlashes(negated ? pattern.slice(1) : pattern);
  if (isAbsolutePattern(body)) {
    const root = rootOf(projectRoot);
    const caseInsensitive = process.platform === 'win32';
    const same = (a: string, b: string): boolean =>
      caseInsensitive ? a.toLowerCase() === b.toLowerCase() : a === b;
    const head = body.slice(0, root.length);
    const rest = body.slice(root.length);
    if (!root || !same(head, root) || (rest !== '' && !rest.startsWith('/'))) {
      return pattern; // outside the project: reported by the audit
    }
    body = rest.replace(/^\/+/, '') || '**';
  }
  body = body.replace(/^(?:\.\/)+/, '');
  if (body.endsWith('/')) body = `${body.replace(/\/+$/, '')}/**`;
  return negated ? `!${body}` : body;
}

const normalizeList = (
  list: unknown,
  projectRoot: string
): string[] | undefined => {
  if (!Array.isArray(list)) return undefined;
  const out: string[] = [];
  for (const item of list) {
    const normal = normalizePathPattern(item as string, projectRoot);
    if (!out.includes(normal)) out.push(normal);
  }
  return out;
};

const normalizeByRule = (
  section: unknown,
  projectRoot: string
): Record<string, string[]> | undefined => {
  if (!section || typeof section !== 'object') return undefined;
  const out: Record<string, string[]> = {};
  for (const [key, list] of Object.entries(section)) {
    // a non-list value (an annotation) is kept as it is
    out[key] = normalizeList(list, projectRoot) ?? (list as string[]);
  }
  return out;
};

const PATTERN_LISTS = ['global', 'tests', 'build', 'design'] as const;

/**
 * The config with every `ignores.*` and `includes.*` pattern in the one form.
 * Returns new objects and arrays: the merged config may share arrays with
 * DEFAULT_CONFIG, which must never be changed in place.
 */
export function normalizeConfigPatterns(
  config: RuleOfCodeConfig,
  projectRoot: string
): RuleOfCodeConfig {
  const normalizeSection = <T extends object>(
    section: T | undefined
  ): T | undefined => {
    if (!section || typeof section !== 'object') return section;
    const fields = section as Record<string, unknown>;
    const copy: Record<string, unknown> = { ...fields };
    for (const name of PATTERN_LISTS) {
      const list = normalizeList(fields[name], projectRoot);
      if (list) copy[name] = list;
    }
    const byRule = normalizeByRule(fields.byRule, projectRoot);
    if (byRule) copy.byRule = byRule;
    return copy as T;
  };
  return {
    ...config,
    ignores: normalizeSection(config.ignores) ?? config.ignores,
    includes: normalizeSection(config.includes),
  };
}

/** Every pattern list of the ignores/includes sections, with where it is written. */
function patternListsOf(config: RuleOfCodeConfig): Array<[string, unknown]> {
  const lists: Array<[string, unknown]> = [];
  for (const sectionName of ['ignores', 'includes'] as const) {
    const section = config[sectionName] as Record<string, unknown> | undefined;
    if (!section || typeof section !== 'object') continue;
    for (const name of PATTERN_LISTS)
      lists.push([`${sectionName}.${name}`, section[name]]);
    const byRule = section.byRule as Record<string, unknown> | undefined;
    for (const [key, list] of Object.entries(byRule ?? {}))
      lists.push([`${sectionName}.byRule['${key}']`, list]);
  }
  return lists;
}

/**
 * Every pattern left absolute after normalisation — a path outside the
 * project, which matches nothing — as [where it is written, the pattern].
 */
export function absolutePatternsIn(
  config: RuleOfCodeConfig
): Array<[string, string]> {
  const found: Array<[string, string]> = [];
  for (const [where, list] of patternListsOf(config)) {
    if (!Array.isArray(list)) continue;
    for (const pattern of list) {
      if (
        typeof pattern === 'string' &&
        isAbsolutePattern(pattern.replace(/^!/, '').replace(/\\/g, '/'))
      )
        found.push([where, pattern]);
    }
  }
  return found;
}

/** An unescaped glob character; a segment without one is a plain name. */
const GLOB_MAGIC = /(?<!\\)[*?[\]{}()!+@]/;
const unescapeSegment = (segment: string): string =>
  segment.replace(/\\(.)/g, '$1');

/**
 * A literal name read as a character class. `[slug]` in a glob is a class of
 * one character — it matches `s`, never the directory `[slug]` — so
 * `app/[slug]/page.tsx` ignores `app/s/page.tsx` and not the Next route,
 * in silence (#414). The glob semantics stay standard, for `/` and `\`
 * alike; when a segment with a class names a directory or file that exists
 * literally where the pattern points, the audit says so. The pattern is
 * followed from the project root through its plain segments; a segment after
 * a wildcard (`*`, `**`) cannot be located and is not judged.
 * Returns [where it is written, the pattern, the segment, 'directory'|'file'].
 */
export function literalNamesReadAsClassesIn(
  config: RuleOfCodeConfig,
  projectRoot: string
): Array<[string, string, string, 'directory' | 'file']> {
  const found: Array<[string, string, string, 'directory' | 'file']> = [];
  for (const [where, list] of patternListsOf(config)) {
    if (!Array.isArray(list)) continue;
    for (const pattern of list) {
      if (typeof pattern !== 'string') continue;
      for (const [segment, kind] of classesNamingLiterals(pattern, projectRoot))
        found.push([where, pattern, segment, kind]);
    }
  }
  return found;
}

/** The class segments of one pattern that name an existing path literally. */
function classesNamingLiterals(
  pattern: string,
  projectRoot: string
): Array<[string, 'directory' | 'file']> {
  const found: Array<[string, 'directory' | 'file']> = [];
  let dir = projectRoot;
  for (const segment of pattern.replace(/^!/, '').split('/')) {
    if (segment === '') continue;
    const name = unescapeSegment(segment);
    const hasClass = /(?<!\\)\[/.test(segment);
    if (!hasClass && GLOB_MAGIC.test(segment)) break; // cannot be located
    dir = PathOperations.join(dir, name);
    if (!hasClass) continue;
    const kind = kindOf(dir);
    if (!kind) break;
    if (!minimatch(name, segment, { dot: true })) found.push([segment, kind]);
  }
  return found;
}

const kindOf = (file: string): 'directory' | 'file' | undefined => {
  const stat = fs.statSync(file, { throwIfNoEntry: false });
  if (!stat) return undefined;
  return stat.isDirectory() ? 'directory' : 'file';
};
