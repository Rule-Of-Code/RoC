/**
 * The files an `anyFileContaining` entry matches, read where git would
 * publish them from (the index for tracked files, the disk otherwise), with
 * the walk, size and cache limits that keep one audit from reading a tree
 * twice. Moved out of law-requirements unchanged (#559); law-requirements
 * re-exports readFilesContaining, filesContaining and ContainingFile.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import type { FileContaining } from '../types/enhanced-law.types';
import { CodeText } from './code-text';
import { publishedListing, readFromIndex } from './git/git-layout';
import { NxWorkspace } from './nx-workspace';
import { lexPython } from './request-path/python-source';
import { noteScriptGlob } from './vue/vue-read-tracker';

/** Trees that hold installed, built, generated or virtualenv files, not the project's own. */
const CONTAINING_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/coverage/**',
  '**/.venv/**',
  '**/venv/**',
  '**/vendor/**',
  '**/.angular/**',
  '**/.nx/**',
  '**/cdk.out/**',
  '**/.aws-sam/**',
  '**/.serverless/**',
  '**/.terraform/**',
];
const CONTAINING_MAX_DEPTH = 8;
const CONTAINING_MAX_BYTES = 2 * 1024 * 1024;
export const CONTAINING_CACHE_LIMIT = 256;

/**
 * Answers by project root and entry. The selector, the liveness floor and
 * the config-key validators each ask the same question in one audit, and
 * the answer means walking and reading files; a later audit of the same
 * root in the same process gets the first answer.
 */
const containingCache = new Map<string, boolean>();

/** One candidate file of an `anyFileContaining` entry, read where git would publish it from. */
interface Candidate {
  file: string;
  rel: string;
  read: () => string | null;
}

/** A file whose content a law's gate matched — what the law then reads. */
export interface ContainingFile {
  /** Absolute path. */
  file: string;
  /** Relative to the project root, forward slashes. */
  rel: string;
  content: string;
}

/** A glob, widened to the workspace project directories when it has no `**`. */
const widened = (pattern: string): string =>
  pattern.includes('**') ? pattern : `${NxWorkspace.PROJECT_DIRS}${pattern}`;

/**
 * A file's text from the disk, or null when it is unreadable or larger than
 * the read limit — a file too big to read contains nothing for a gate.
 */
export function readDisk(file: string): string | null {
  try {
    return fs.statSync(file).size > CONTAINING_MAX_BYTES
      ? null
      : fs.readFileSync(file, 'utf8');
  } catch {
    return null; // an unreadable file contains nothing
  }
}

/** Outside a git work tree: the disk, walked. */
function diskCandidates(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[]
): Candidate[] {
  const files = glob.sync(entry.files.map(widened), {
    cwd: projectRoot,
    absolute: true,
    dot: true,
    nodir: true,
    maxDepth: CONTAINING_MAX_DEPTH,
    ignore: [...CONTAINING_IGNORE, ...(entry.exclude ?? []), ...ignores],
  });
  return [...new Set(files)].map(file => ({
    file,
    rel: path.relative(projectRoot, file).split(path.sep).join('/'),
    read: () => readDisk(file),
  }));
}

/**
 * Inside a git work tree: the files git publishes — tracked (read from the
 * index when the working copy differs, so a draft on disk is not judged) and
 * untracked but not ignored. A git-ignored file never selects a law: it is
 * generated output or a local note, and the project cannot act on it.
 */
function publishedCandidates(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[]
): Candidate[] | null {
  const listing = publishedListing(projectRoot);
  if (!listing) return null;
  const globs = entry.files.map(widened);
  const skip = [...CONTAINING_IGNORE, ...(entry.exclude ?? []), ...ignores];
  const wanted = (rel: string): boolean =>
    rel.split('/').length <= CONTAINING_MAX_DEPTH + 1 &&
    globs.some(pattern => minimatch(rel, pattern, { dot: true })) &&
    !skip.some(pattern => minimatch(rel, pattern, { dot: true }));
  return [...listing.tracked, ...listing.unignored].filter(wanted).map(rel => {
    const file = path.join(projectRoot, rel);
    const fromIndex = listing.tracked.has(rel) && listing.changed.has(rel);
    return {
      file,
      rel,
      read: () => {
        const text = fromIndex
          ? readFromIndex(projectRoot, rel)
          : readDisk(file);
        return text !== null && text.length <= CONTAINING_MAX_BYTES
          ? text
          : null;
      },
    };
  });
}

/** The entry's candidate files: what git publishes, or the disk outside git. */
/**
 * The entry's candidate files: what git publishes, or the disk outside git,
 * less what the project says is not its own code (`ignores.global`, #326) —
 * the selector and the law pass the same list, so the set stays one.
 */
function containingCandidates(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[]
): Candidate[] {
  return (
    publishedCandidates(projectRoot, entry, ignores) ??
    diskCandidates(projectRoot, entry, ignores)
  );
}

/**
 * The text an entry's pattern is matched against: the file as it is, or —
 * for an entry that reads code (#437) — its code with comments and string
 * contents blanked.
 */
function matchedText(entry: FileContaining, rel: string, text: string): string {
  if (!entry.readsCode) return text;
  if (/\.py$/.test(rel)) return lexPython(text).code;
  return /\.[cm]?[jt]sx?$/.test(rel)
    ? CodeText.stripCommentsAndStrings(text)
    : text;
}

/** One `anyFileContaining` entry: a file it names contains its pattern. Reads until the first match. */
export function fileContains(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[]
): boolean {
  const key = `${projectRoot}|${JSON.stringify(entry)}|${JSON.stringify(ignores)}`;
  const cached = containingCache.get(key);
  if (cached !== undefined) return cached;
  const pattern = new RegExp(entry.pattern, 'm');
  const found = containingCandidates(projectRoot, entry, ignores).some(
    candidate => {
      const text = candidate.read();
      return (
        text !== null && pattern.test(matchedText(entry, candidate.rel, text))
      );
    }
  );
  if (containingCache.size >= CONTAINING_CACHE_LIMIT) containingCache.clear();
  containingCache.set(key, found);
  return found;
}

/**
 * The files an `anyFileContaining` entry matched, with the content it
 * matched, sorted by path — the gate's own set, read the gate's own way, for
 * a law that must judge exactly the files that selected it.
 */
export function readFilesContaining(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[] = []
): ContainingFile[] {
  const pattern = new RegExp(entry.pattern, 'm');
  const candidates = containingCandidates(projectRoot, entry, ignores);
  // A law that judges script files by its gate's globs and leaves .vue out
  // is said, as a shared scan is (#607). Selection runs outside a law: no-op.
  noteScriptGlob(
    entry.files,
    candidates.map(candidate => candidate.rel)
  );
  return candidates
    .sort((a, b) => a.rel.localeCompare(b.rel))
    .flatMap(candidate => {
      const content = candidate.read();
      return content !== null &&
        pattern.test(matchedText(entry, candidate.rel, content))
        ? [{ file: candidate.file, rel: candidate.rel, content }]
        : [];
    });
}

/** The absolute paths of {@link readFilesContaining}. */
export function filesContaining(
  projectRoot: string,
  entry: FileContaining,
  ignores: readonly string[] = []
): string[] {
  return readFilesContaining(projectRoot, entry, ignores).map(
    found => found.file
  );
}
