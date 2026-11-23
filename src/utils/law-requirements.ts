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
 *
 * Every condition reads what git publishes (#381, as `anyFileContaining`
 * since 7.27.0): inside a git work tree a manifest counts when it is tracked
 * (read from the index when the working copy differs) or untracked and not
 * ignored. A git-ignored manifest (generated, vendored, a scratch copy)
 * selects no law, because the project does not declare that dependency in
 * anything it ships. Outside a git work tree the disk is read, as before.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type {
  JsonFileWithKey,
  LawRequirement,
} from '../types/enhanced-law.types';
import { minimatch } from 'minimatch';
import {
  CONTAINING_CACHE_LIMIT,
  fileContains,
  readDisk,
} from './files-containing';
import { FileSystemOperations } from './file-system-operations';
import {
  type PublishedListing,
  publishedListing,
  readFromIndex,
  trackedFiles,
} from './git/git-layout';
import { NxWorkspace } from './nx-workspace';
import {
  PYTHON_MANIFEST_GLOB,
  PYTHON_MANIFEST_IGNORE,
  normalizePythonName,
  pythonManifestFiles,
  pythonNamesIn,
} from './python-dependencies';

export {
  type ContainingFile,
  filesContaining,
  readFilesContaining,
} from './files-containing';

type Manifest = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const PACKAGE_MANIFEST = 'package.json';

/** Every package name declared by any workspace package.json. */
export function declaredDependencies(projectRoot: string): Set<string> {
  const names = new Set<string>();
  for (const file of NxWorkspace.resolveSourceFiles(
    projectRoot,
    PACKAGE_MANIFEST
  )) {
    let manifest: Manifest | null = null;
    try {
      manifest = FileSystemOperations.readJsonFile<Manifest>(file);
    } catch {
      continue; // an unreadable manifest declares nothing
    }
    addManifestNames(names, manifest);
  }
  return names;
}

function addManifestNames(names: Set<string>, manifest: Manifest | null): void {
  for (const name of Object.keys(manifest?.dependencies ?? {})) names.add(name);
  for (const name of Object.keys(manifest?.devDependencies ?? {}))
    names.add(name);
}

/** A dependency manifest and its text, read where git publishes it from. */
interface ManifestText {
  rel: string;
  content: string;
}

/** One kind of dependency manifest: how it is found, and the files found on disk. */
interface ManifestKind {
  pattern: string;
  ignore: readonly string[];
  disk: readonly string[];
}

/**
 * Answers by project root, manifest kind and the manifests' text on disk.
 * Asking git costs processes, and the selector, the liveness floor and the
 * validators ask once per gated law; the text on disk is read on every call
 * (as before), so an edited manifest is a new key. What the key does not
 * see (a change of ignore rules, or of the index alone) is answered from the
 * first call in this process.
 */
const manifestCache = new Map<string, ManifestText[]>();

/**
 * The manifests of one kind as git publishes them (#381): from the published
 * listing, matched by the kind's own glob and ignore list, tracked ones read
 * from the index when the working copy differs. Outside a git work tree, the
 * disk files the kind's own discovery found.
 */
function publishedManifests(
  projectRoot: string,
  kind: ManifestKind
): ManifestText[] {
  const onDisk = kind.disk.flatMap(file => {
    const content = readDisk(file);
    return content === null
      ? []
      : [
          {
            rel: path.relative(projectRoot, file).split(path.sep).join('/'),
            content,
          },
        ];
  });
  const digest = createHash('sha256');
  for (const { rel, content } of onDisk) digest.update(`${rel}\0${content}\0`);
  const key = `${projectRoot}|${kind.pattern}|${digest.digest('hex')}`;
  const cached = manifestCache.get(key);
  if (cached) return cached;

  const listing = publishedListing(projectRoot);
  const texts = listing
    ? manifestsInListing(projectRoot, listing, kind, onDisk)
    : onDisk;
  if (manifestCache.size >= CONTAINING_CACHE_LIMIT) manifestCache.clear();
  manifestCache.set(key, texts);
  return texts;
}

function manifestsInListing(
  projectRoot: string,
  listing: PublishedListing,
  kind: ManifestKind,
  onDisk: readonly ManifestText[]
): ManifestText[] {
  const disk = new Map(onDisk.map(text => [text.rel, text.content]));
  return [...listing.tracked, ...listing.unignored]
    .filter(
      rel =>
        minimatch(rel, kind.pattern) &&
        !kind.ignore.some(pattern => minimatch(rel, pattern))
    )
    .flatMap(rel => {
      const fromIndex = listing.tracked.has(rel) && listing.changed.has(rel);
      const content = fromIndex
        ? readFromIndex(projectRoot, rel)
        : (disk.get(rel) ?? readDisk(path.join(projectRoot, rel)));
      return content === null ? [] : [{ rel, content }];
    });
}

/**
 * Every package name declared by a workspace package.json that git publishes
 * (the disk outside git): what `anyDependency` and `allDependencies` read.
 */
export function publishedDependencies(projectRoot: string): Set<string> {
  const names = new Set<string>();
  const manifests = publishedManifests(projectRoot, {
    pattern: `${NxWorkspace.PROJECT_DIRS}${PACKAGE_MANIFEST}`,
    ignore: NxWorkspace.IGNORE,
    disk: NxWorkspace.resolveSourceFiles(projectRoot, PACKAGE_MANIFEST),
  });
  for (const { content } of manifests) {
    try {
      addManifestNames(names, JSON.parse(content) as Manifest);
    } catch {
      // an unreadable manifest declares nothing
    }
  }
  return names;
}

/**
 * Every Python distribution declared by a manifest that git publishes (the
 * disk outside git): what `anyPythonDependency` reads.
 */
export function publishedPythonDependencies(projectRoot: string): Set<string> {
  const names = new Set<string>();
  const manifests = publishedManifests(projectRoot, {
    pattern: PYTHON_MANIFEST_GLOB,
    ignore: PYTHON_MANIFEST_IGNORE,
    disk: pythonManifestFiles(projectRoot),
  });
  for (const { rel, content } of manifests) {
    for (const name of pythonNamesIn(rel, content)) names.add(name);
  }
  return names;
}

/** Files from `anyFile` that exist at the root or in a workspace project directory. */
export function presentRequiredFiles(
  projectRoot: string,
  files: readonly string[]
): string[] {
  return files.flatMap(file =>
    NxWorkspace.resolveSourceFiles(projectRoot, file)
  );
}

/** True when the project declares everything `requires` asks for (or it asks for nothing). */
/**
 * `ignores` is the project's `ignores.global` (#326): files it names select
 * no law through `anyFileContaining`, as the laws do not read them either.
 */
export function lawRequirementsMet(
  requires: LawRequirement | undefined,
  projectRoot: string,
  ignores: readonly string[] = []
): boolean {
  if (!requires) return true;
  if (!packageRequirementsMet(requires, projectRoot)) return false;
  if (requires.anyFile?.length) {
    if (presentRequiredFiles(projectRoot, requires.anyFile).length === 0) {
      return false;
    }
  }
  if (requires.anyPythonDependency?.length) {
    const declared = publishedPythonDependencies(projectRoot);
    if (
      !requires.anyPythonDependency.some(name =>
        declared.has(normalizePythonName(name))
      )
    ) {
      return false;
    }
  }
  if (requires.anyOf?.length) {
    if (
      !requires.anyOf.some(alternative =>
        lawRequirementsMet(alternative, projectRoot, ignores)
      )
    ) {
      return false;
    }
  }
  return contentRequirementsMet(requires, projectRoot, ignores);
}

/** The conditions that read file contents: `anyFileContaining`, `anyJsonFileWithKey`. */
function contentRequirementsMet(
  requires: LawRequirement,
  projectRoot: string,
  ignores: readonly string[]
): boolean {
  if (
    requires.anyFileContaining?.length &&
    !requires.anyFileContaining.some(entry =>
      fileContains(projectRoot, entry, ignores)
    )
  ) {
    return false;
  }
  return !(
    requires.anyJsonFileWithKey?.length &&
    !requires.anyJsonFileWithKey.some(entry => {
      const found = jsonFilesWithKey(projectRoot, entry);
      // Fail-closed: a file that was not read may hold the key (#547).
      return found.matched.length > 0 || found.unreadable.length > 0;
    })
  );
}

/** The files of an `anyJsonFileWithKey` entry that hold the key, and those not read. */
export interface JsonKeyFiles {
  /** Project-relative files whose top-level object has the key. */
  matched: string[];
  /** `<file>: <reason>` for each file that could not be read or parsed. */
  unreadable: string[];
}

/**
 * Parse every `entry.file` at the workspace root and in each workspace
 * project directory, and say which have `entry.key` at the top level. The
 * shared reader of the selector and of the laws that ask the same question
 * (#547), so what selects a law is what it judges.
 */
export function jsonFilesWithKey(
  projectRoot: string,
  entry: JsonFileWithKey
): JsonKeyFiles {
  const matched: string[] = [];
  const unreadable: string[] = [];
  for (const file of NxWorkspace.resolveSourceFiles(projectRoot, entry.file)) {
    const rel = path.relative(projectRoot, file).split(path.sep).join('/');
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.prototype.hasOwnProperty.call(parsed, entry.key)
      ) {
        matched.push(rel);
      }
    } catch (error) {
      unreadable.push(
        `${rel}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
  return { matched, unreadable };
}

/** `anyDependency` and `allDependencies`, read from the workspace package.json manifests git publishes. */
function packageRequirementsMet(
  requires: LawRequirement,
  projectRoot: string
): boolean {
  if (!requires.anyDependency?.length && !requires.allDependencies?.length)
    return true;
  const declared = publishedDependencies(projectRoot);
  if (
    requires.anyDependency?.length &&
    !requires.anyDependency.some(name => declared.has(name))
  ) {
    return false;
  }
  return !(
    requires.allDependencies?.length &&
    !requires.allDependencies.every(name => declared.has(name))
  );
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
  if (presentRequiredFiles(projectRoot, JS_TS_MANIFESTS).length > 0)
    return true;
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
export function hasHtmlDocument(
  projectRoot: string,
  ignores: readonly string[] = []
): boolean {
  const ownPage = (relative: string): boolean => {
    const segments = relative.split('/');
    const name = segments[segments.length - 1] ?? '';
    if (!HTML_DOCUMENT_NAME.test(name)) return false;
    if (
      segments
        .slice(0, -1)
        .some(s => s.startsWith('.') || NOT_PROJECT_SOURCE.has(s))
    )
      return false;
    return !ignores.some(pattern =>
      minimatch(relative, pattern, { dot: true })
    );
  };
  const tracked = trackedFiles(projectRoot, ['*.html', '*.htm']);
  if (tracked) return [...tracked].some(ownPage);
  return walkFinds(projectRoot, ownPage);
}

/**
 * Walk the disk (not installed, built or hidden directories) for a file whose
 * project-relative path `accept`s. An unreadable directory answers yes.
 */
function walkFinds(
  projectRoot: string,
  accept: (relative: string) => boolean
): boolean {
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
      if (accept(path.relative(projectRoot, full).split(path.sep).join('/')))
        return true;
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
  if (requires.anyPythonDependency?.length) {
    parts.push(
      `a Python dependency on ${requires.anyPythonDependency.join(' or ')}`
    );
  }
  for (const entry of requires.anyFileContaining ?? []) {
    parts.push(
      `a file (${entry.files.join(' or ')}) containing /${entry.pattern}/`
    );
  }
  for (const entry of requires.anyJsonFileWithKey ?? []) {
    parts.push(`${entry.file} with a top-level "${entry.key}" key`);
  }
  if (requires.anyOf?.length) {
    parts.push(
      `either ${requires.anyOf.map(alternative => `(${describeRequirement(alternative)})`).join(' or ')}`
    );
  }
  return parts.join(', and ');
}
