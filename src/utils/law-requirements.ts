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
import { FileSystemOperations } from './file-system-operations';
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
  const pending = [projectRoot];
  for (let dir = pending.pop(); dir !== undefined; dir = pending.pop()) {
    if (directoryHoldsTypeScript(dir, pending)) return true;
  }
  return false;
}

/**
 * One step of the walk: true when `dir` holds a TypeScript file or cannot be
 * read; its own subdirectories are queued on `pending`.
 */
function directoryHoldsTypeScript(dir: string, pending: string[]): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return true;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    if (!entry.isDirectory()) {
      if (TS_SOURCE_NAME.test(entry.name)) return true;
    } else if (!NOT_PROJECT_SOURCE.has(entry.name)) {
      pending.push(path.join(dir, entry.name));
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
