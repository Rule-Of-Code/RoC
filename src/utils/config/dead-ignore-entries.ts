/**
 * An `ignores.global` entry that matches no file excludes nothing (#414).
 *
 * The forms of a pattern are normalised when the config is loaded
 * (path-patterns.ts), so a Windows path, `./`, a trailing slash and an
 * absolute path inside the project all match. What is left is an entry that
 * is written correctly and still points nowhere: a typo (`vendr/**`), a
 * directory that was renamed or removed. The user believes the code is
 * excluded; it is judged, and nothing in the output hints that the entry is
 * dead. The audit names it.
 *
 * Only what the project wrote is judged:
 *   - the defaults the tool adds itself (`**\/dist/**`, `**\/node_modules/**`,
 *     the framework lists) match nothing in many projects and are not the
 *     user's mistake;
 *   - an entry that the project's .gitignore also ignores names generated
 *     output (`coverage/**`, `dist/**`), which is absent from a fresh clone
 *     or a CI checkout and is still the right thing to ignore;
 *   - an absolute path outside the project is named by its own warning.
 * The files are the ones git would show (tracked, and untracked but not
 * ignored); outside a git repository, the files on disk.
 */
import fs from 'fs';
import { Minimatch } from 'minimatch';

import type { RuleOfCodeConfig } from '../../config/types';
import {
  ANGULAR_CONFIG,
  DEFAULT_CONFIG,
  REACT_CONFIG,
} from '../../config/types';
import { spawnSync } from '../child-process';
import { PathOperations } from '../path-operations';
import { ConfigurationMergerConfiguration } from './configuration-merger/configuration-merger-configuration';
import { normalizePathPattern } from './path-patterns';

/** Directories never walked when git cannot list the files. */
const NOT_WALKED = new Set(['node_modules', '.git']);

/** A git command (no shell) in the project; null when git cannot answer. */
function git(
  args: string[],
  projectRoot: string,
  input?: string
): { status: number; stdout: string } | null {
  const result = spawnSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true,
    input,
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.error || result.status === null) return null;
  return { status: result.status, stdout: String(result.stdout ?? '') };
}

/** The ignore patterns the tool brings itself, in the loaded form. */
function builtInEntries(projectRoot: string): Set<string> {
  const lists: ReadonlyArray<readonly string[] | undefined> = [
    DEFAULT_CONFIG.ignores.global,
    ANGULAR_CONFIG.ignores?.global,
    REACT_CONFIG.ignores?.global,
    ConfigurationMergerConfiguration.DEFAULT_IGNORE_PATTERNS,
    ConfigurationMergerConfiguration.OPTIMIZED_IGNORE_PATTERNS,
  ];
  return new Set(
    lists.flatMap(list =>
      (list ?? []).map(pattern => normalizePathPattern(pattern, projectRoot))
    )
  );
}

/** Project files relative to the root, forward slashes; walked without git. */
function projectFiles(projectRoot: string): string[] {
  const listed = git(
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    projectRoot
  );
  if (listed && listed.status === 0)
    return listed.stdout.split('\0').filter(Boolean);
  const files: string[] = [];
  const walk = (dir: string, rel: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!NOT_WALKED.has(entry.name))
          walk(PathOperations.join(dir, entry.name), childRel);
      } else {
        files.push(childRel);
      }
    }
  };
  walk(projectRoot, '');
  return files;
}

/** An unescaped glob character; a segment without one is a plain name. */
const GLOB_MAGIC = /(?<!\\)[*?[\]{}()!+@]/;

/**
 * A path git can be asked about for this entry: its plain leading segments,
 * with a child added when the entry goes on below them (`coverage/**` →
 * `coverage/x`, so a directory-only line `coverage/` matches). Null when the
 * entry starts with a wildcard (`**\/vendor/**`): there is no one path.
 */
function probeFor(entry: string): string | null {
  const segments = entry.split('/');
  const plain: string[] = [];
  for (const segment of segments) {
    if (GLOB_MAGIC.test(segment)) break;
    plain.push(segment.replace(/\\(.)/g, '$1'));
  }
  if (plain.length === 0) return null;
  return plain.length === segments.length
    ? plain.join('/')
    : `${plain.join('/')}/x`;
}

/** The entries whose probe path the project's ignore files ignore. */
function gitignored(projectRoot: string, entries: string[]): Set<string> {
  const probes = new Map<string, string>();
  for (const entry of entries) {
    const probe = probeFor(entry);
    if (probe) probes.set(probe, entry);
  }
  const ignored = new Set<string>();
  if (probes.size === 0) return ignored;
  const checked = git(
    ['check-ignore', '--no-index', '-z', '--stdin'],
    projectRoot,
    [...probes.keys()].map(p => `${p}\0`).join('')
  );
  // 1 = none ignored; 128 = not a repository / error: nothing is skipped.
  if (!checked || checked.status !== 0) return ignored;
  for (const probe of checked.stdout.split('\0')) {
    const entry = probes.get(probe);
    if (entry) ignored.add(entry);
  }
  return ignored;
}

/** The file, or a directory above it, matches the entry. */
function matchesFileOrParent(matcher: Minimatch, file: string): boolean {
  if (matcher.match(file)) return true;
  let dir = file;
  for (let cut = dir.lastIndexOf('/'); cut > 0; cut = dir.lastIndexOf('/')) {
    dir = dir.slice(0, cut);
    if (matcher.match(dir)) return true;
  }
  return false;
}

/**
 * The `ignores.global` entries the project wrote that match no file of the
 * project and are not gitignored output, in the order written.
 */
export function ignoreEntriesMatchingNothing(
  config: RuleOfCodeConfig,
  projectRoot: string
): string[] {
  const list = config.ignores?.global;
  if (!Array.isArray(list) || list.length === 0) return [];
  const builtIn = builtInEntries(projectRoot);
  const own = list.filter(
    (entry): entry is string =>
      typeof entry === 'string' &&
      entry.length > 0 &&
      !entry.startsWith('!') &&
      !/^(?:[A-Za-z]:)?[\\/]/.test(entry) && // absolute: its own warning
      !builtIn.has(entry)
  );
  if (own.length === 0) return [];
  const files = projectFiles(projectRoot);
  const dead = own.filter(entry => {
    const matcher = new Minimatch(entry, { dot: true });
    return !files.some(file => matchesFileOrParent(matcher, file));
  });
  if (dead.length === 0) return [];
  const generated = gitignored(projectRoot, dead);
  return dead.filter(entry => !generated.has(entry));
}
