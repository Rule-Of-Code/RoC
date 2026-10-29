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
  if (requires.anyDependency?.length) {
    const declared = declaredDependencies(projectRoot);
    if (!requires.anyDependency.some(name => declared.has(name))) return false;
  }
  if (requires.anyFile?.length) {
    if (presentRequiredFiles(projectRoot, requires.anyFile).length === 0) {
      return false;
    }
  }
  return true;
}

/** A requirement in words, for messages: "@ionic/angular or @ionic/react, and capacitor.config.ts". */
export function describeRequirement(requires: LawRequirement): string {
  const parts: string[] = [];
  if (requires.anyDependency?.length) {
    parts.push(`a dependency on ${requires.anyDependency.join(' or ')}`);
  }
  if (requires.anyFile?.length) {
    parts.push(requires.anyFile.join(' or '));
  }
  return parts.join(', and ');
}
