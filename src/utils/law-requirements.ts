/**
 * Whether a project declares what a law is about — the `requires` gate.
 *
 * `stack` answers "is this a UI project?". It cannot answer "does this project
 * ship through Ionic?", and a law about Ionic's outlet that runs in a project
 * without Ionic inspects nothing and reports green. `requires` is the finer
 * gate, and this module is its only reader: the audit's selector, the liveness
 * floor and the config-key validators all ask here, so they cannot disagree
 * about which laws apply.
 *
 * Dependencies are read from every workspace package.json, not only the root
 * one: a monorepo may declare `@capacitor/core` in the app that ships, not in
 * the workspace manifest.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LawRequirement } from '../types/enhanced-law.types';
import { minimatch } from 'minimatch';
import { FileSystemOperations } from './file-system-operations';
import { trackedFiles } from './git/git-layout';
import { NxWorkspace } from './nx-workspace';

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** Every package name declared by any workspace package.json. */
export function declaredDependencies(projectRoot: string): Set<string> {
  const names = new Set<string>();
  for (const file of NxWorkspace.resolveSourceFiles(projectRoot, 'package.json')) {
    let manifest: Manifest | null = null;
    try {
      manifest = FileSystemOperations.readJsonFile<Manifest>(file);
    } catch {
      continue; // an unreadable manifest declares nothing
    }
    for (const name of Object.keys(manifest?.dependencies ?? {})) names.add(name);
    for (const name of Object.keys(manifest?.devDependencies ?? {})) names.add(name);
  }
  return names;
}

/** Files from `anyFile` that exist at the root or in a workspace project directory. */
export function presentRequiredFiles(
  projectRoot: string,
  files: readonly string[]
): string[] {
  return files.flatMap(file => NxWorkspace.resolveSourceFiles(projectRoot, file));
}

/** True when the project declares everything `requires` asks for (or it asks for nothing). */
export function lawRequirementsMet(
  requires: LawRequirement | undefined,
  projectRoot: string
): boolean {
  if (!requires) return true;
  if (requires.anyDependency?.length || requires.allDependencies?.length) {
    const declared = declaredDependencies(projectRoot);
    if (
      requires.anyDependency?.length &&
      !requires.anyDependency.some(name => declared.has(name))
    ) {
      return false;
    }
    if (
      requires.allDependencies?.length &&
      !requires.allDependencies.every(name => declared.has(name))
    ) {
      return false;
    }
  }
  if (requires.anyFile?.length) {
    if (presentRequiredFiles(projectRoot, requires.anyFile).length === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Files a JavaScript/TypeScript toolchain leaves in a project. A tsconfig or a
 * `typescript` dependency already makes the detector answer `typescript`;
 * these are what can still be there when it answered nothing.
 */
const JS_TS_MANIFESTS = [
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  'jsconfig.json',
  'deno.json',
  'deno.jsonc',
] as const;

/** A TypeScript source file. A bare `.js` file is not a toolchain: a static site has them. */
const TS_SOURCE_NAME = /\.(?:ts|tsx|mts|cts)$/;

/** Directories that hold installed, built or vendored code, not the project's own. */
const NOT_PROJECT_SOURCE = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  'target',
  // Generated HTML reports and API docs: not the project's own pages, so a
  // Go or Python project with a coverage report is not a static site (#323).
  'htmlcov',
  'apidocs',
  'javadoc',
  'typedoc',
  // Generated static-site output (Jekyll, Storybook): built from sources the
  // walk already sees, never the pages a project authors (#326).
  '_site',
  'storybook-static',
]);

/**
 * Does the project carry any JavaScript/TypeScript toolchain at all — a
 * manifest (package.json, a tsconfig, jsconfig, deno.json) at the root or in a
 * workspace project, or one TypeScript source file anywhere outside installed
 * and built code?
 *
 * This is the question `generic` cannot answer. It is the type the config
 * defaults to and the one left when the detector recognised nothing, so a Go
 * module or a static site was given every `stack: typescript` law — and
 * failed Test Isolation Enforcement for having no TypeScript tests (#303).
 *
 * A directory that cannot be read is not evidence of absence: the walk
 * answers yes rather than drop laws on a guess.
 */
export function hasJsTsToolchain(projectRoot: string): boolean {
  if (presentRequiredFiles(projectRoot, JS_TS_MANIFESTS).length > 0) return true;
  return walkFinds(projectRoot, relative => TS_SOURCE_NAME.test(relative));
}

/** An HTML document — not `coverage.html`, which `go tool cover -html` writes. */
const HTML_DOCUMENT_NAME = /^(?!coverage\.html?$).+\.html?$/i;

/**
 * Does the project hold an HTML document of its own? A static site — HTML
 * pages, a hosting config, no framework — is typed `generic`, and the laws
 * that read HTML and the hosting headers apply to it (#323).
 *
 * "Of its own" (#326): in a git working tree only TRACKED files count — a
 * git-ignored build output (MkDocs `site/`) is on the disk here and absent on
 * CI, so it must not decide which laws run. A path under installed, built,
 * generated or hidden directories, or matched by `ignores` (the project's
 * `ignores.global`), does not count either: ignoring the pages and then being
 * judged on them is the one outcome a user cannot clear. Outside git, the
 * disk is walked; an unreadable directory answers yes, as for the toolchain.
 */
export function hasHtmlDocument(projectRoot: string, ignores: readonly string[] = []): boolean {
  const ownPage = (relative: string): boolean => {
    const segments = relative.split('/');
    const name = segments[segments.length - 1] ?? '';
    if (!HTML_DOCUMENT_NAME.test(name)) return false;
    if (segments.slice(0, -1).some(s => s.startsWith('.') || NOT_PROJECT_SOURCE.has(s))) return false;
    return !ignores.some(pattern => minimatch(relative, pattern, { dot: true }));
  };
  const tracked = trackedFiles(projectRoot, ['*.html', '*.htm']);
  if (tracked) return [...tracked].some(ownPage);
  return walkFinds(projectRoot, ownPage);
}

/**
 * Walk the disk (not installed, built or hidden directories) for a file whose
 * project-relative path `accept`s. An unreadable directory answers yes.
 */
function walkFinds(projectRoot: string, accept: (relative: string) => boolean): boolean {
  const pending = [projectRoot];
  for (let dir = pending.pop(); dir !== undefined; dir = pending.pop()) {
    if (directoryHolds(projectRoot, dir, accept, pending)) return true;
  }
  return false;
}

/**
 * One step of the walk: true when `dir` holds an accepted file or cannot be
 * read; its own subdirectories are queued on `pending`.
 */
function directoryHolds(
  projectRoot: string,
  dir: string,
  accept: (relative: string) => boolean,
  pending: string[]
): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return true;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) {
      if (accept(path.relative(projectRoot, full).split(path.sep).join('/'))) return true;
    } else if (!NOT_PROJECT_SOURCE.has(entry.name)) {
      pending.push(full);
    }
  }
  return false;
}

/** A requirement in words, for messages: "@ionic/angular or @ionic/react, and capacitor.config.ts". */
export function describeRequirement(requires: LawRequirement): string {
  const parts: string[] = [];
  if (requires.anyDependency?.length) {
    parts.push(`a dependency on ${requires.anyDependency.join(' or ')}`);
  }
  if (requires.allDependencies?.length) {
    parts.push(`dependencies on ${requires.allDependencies.join(' and ')}`);
  }
  if (requires.anyFile?.length) {
    parts.push(requires.anyFile.join(' or '));
  }
  return parts.join(', and ');
}
