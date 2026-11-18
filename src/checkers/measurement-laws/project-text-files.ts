/**
 * The project's own text files, read once for the measurement laws.
 *
 * These laws read what a harness, a deploy file or a test config SAYS, so
 * they walk the disk below the project root and skip installed, built,
 * generated and virtual-environment directories — code the project did not
 * write. A file larger than {@link MAX_BYTES} is not a hand-written script or
 * config and is not read; an unreadable file reads as absent.
 */

import * as fs from 'fs';
import { glob } from 'glob';

export interface TextFile {
  /** Path relative to the project root, forward slashes. */
  rel: string;
  content: string;
}

const MAX_BYTES = 512 * 1024;

const NOT_OWN_CODE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.venv/**',
  '**/venv/**',
  '**/.tox/**',
  '**/.nox/**',
  '**/site-packages/**',
  '**/__pycache__/**',
  '**/.angular/**',
  '**/.nx/**',
  '**/.next/**',
  '**/www/**',
  '**/android/**',
  '**/ios/**',
];

/** Every own file matching one of `patterns` (globs relative to the root), with its text. */
export function readProjectFiles(
  projectRoot: string,
  patterns: readonly string[]
): TextFile[] {
  const rels = new Set<string>();
  for (const pattern of patterns) {
    for (const rel of glob.sync(pattern, {
      cwd: projectRoot,
      nodir: true,
      dot: true,
      ignore: NOT_OWN_CODE,
    })) {
      rels.add(rel.replace(/\\/g, '/'));
    }
  }
  return [...rels].sort().flatMap(rel => {
    const content = readSmallText(`${projectRoot}/${rel}`);
    return content === null ? [] : [{ rel, content }];
  });
}

function readSmallText(file: string): string | null {
  try {
    if (fs.statSync(file).size > MAX_BYTES) return null;
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

/** 1-based line number of a character offset. */
export function lineAt(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

/** The first match of any pattern in the file: the pattern's text and its line, or null. */
export function firstMatch(
  content: string,
  patterns: readonly RegExp[]
): { text: string; line: number } | null {
  let best: { text: string; index: number } | null = null;
  for (const pattern of patterns) {
    const match = new RegExp(
      pattern.source,
      pattern.flags.replace('g', '')
    ).exec(content);
    if (match && (best === null || match.index < best.index))
      best = { text: match[0], index: match.index };
  }
  return best === null
    ? null
    : { text: best.text, line: lineAt(content, best.index) };
}

/** A test file by its name or directory (test_x.py, x_test.py, x.spec.ts, x.test.js, tests/, __tests__/, conftest.py). */
export function isTestFile(rel: string): boolean {
  return (
    /(?:^|\/)(?:tests?|__tests__|spec|specs)\//.test(rel) ||
    /(?:^|\/)(?:test_[^/]*|[^/]*_test|conftest)\.py$/.test(rel) ||
    /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(rel)
  );
}
