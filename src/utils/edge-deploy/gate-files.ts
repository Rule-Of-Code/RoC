/**
 * The files an edge/deploy law reads: the set its `requires` gate matched,
 * read through the gate's own reader (what git publishes — tracked files
 * from the index when the working copy differs, untracked files that are not
 * ignored; the disk outside git), less `ignores.global`. A law reads exactly
 * what selected it; evidence it compares against (a deploy script, a Gradle
 * file) is read through the same reader, so a git-ignored draft is never
 * evidence either.
 */

import type { FileContaining, LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext } from '../../types/law.types';
import { type ContainingFile, readFilesContaining } from '../law-requirements';

/** Test and fixture trees: a fixture of a config is not the project's config. */
export const TEST_TREES: readonly string[] = [
  '**/test/**',
  '**/tests/**',
  '**/__tests__/**',
  '**/e2e/**',
  '**/__fixtures__/**',
  '**/fixtures/**',
];

/** Files whose text is read for shell commands: CI YAML, scripts, Makefiles, package.json. */
export const COMMAND_FILES: readonly string[] = [
  '**/*.{yml,yaml,sh,bash,ps1,mk}',
  '**/{Makefile,makefile,GNUmakefile}',
  '**/package.json',
];

/** Every `anyFileContaining` entry of a requirement, through `anyOf`. */
export function entriesOf(requires: LawRequirement): FileContaining[] {
  return [...(requires.anyFileContaining ?? []), ...(requires.anyOf ?? []).flatMap(entriesOf)];
}

const ignoresOf = (context: LawCheckContext): readonly string[] => context.config.ignores?.global ?? [];

/** The files a gate entry matches, read the gate's way. */
export function filesFor(context: LawCheckContext, entry: FileContaining): ContainingFile[] {
  return readFilesContaining(context.projectRoot, entry, ignoresOf(context));
}

/** The files that selected the law, one per path, sorted. */
export function gateFiles(context: LawCheckContext, requires: LawRequirement): ContainingFile[] {
  const byRel = new Map<string, ContainingFile>();
  for (const entry of entriesOf(requires)) {
    for (const found of filesFor(context, entry)) byRel.set(found.rel, found);
  }
  return [...byRel.values()].sort((a, b) => a.rel.localeCompare(b.rel));
}

/** 1-based line of a character offset. */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** The base name of a forward-slash path. */
export const baseName = (rel: string): string => rel.slice(rel.lastIndexOf('/') + 1);

/** The directory of a forward-slash path ('' at the root). */
export const dirName = (rel: string): string => (rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '');
