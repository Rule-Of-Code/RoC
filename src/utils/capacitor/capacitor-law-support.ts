/**
 * What every Capacitor law shares: the requirement that gates it, reading a
 * key from the resolved config, and the one verdict a law gives when it could
 * not look.
 *
 * "Could not look" is a violation, never a pass. A Capacitor law that cannot
 * run the project's CLI, or cannot find node_modules, has inspected nothing,
 * and a green from it would be the green this tool exists to refuse.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';
import type { LawCheckContext } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import {
  CAPACITOR_CONFIG_FILES,
  type CapacitorNativePaths,
  type CapacitorProject,
  CapacitorProjects,
} from './capacitor-project';

const CAPACITOR_CORE = '@capacitor/core';

/** @capacitor/core declared, and a Capacitor config present. */
export const REQUIRES_CAPACITOR: LawRequirement = {
  anyDependency: [CAPACITOR_CORE],
  anyFile: CAPACITOR_CONFIG_FILES,
};

export interface ResolvedProject {
  project: CapacitorProject;
  /** The config file, relative to the workspace root, for messages. */
  where: string;
  config: Record<string, unknown>;
}

/** The value at a dotted path of the resolved config, or undefined. */
export function configValue(config: Record<string, unknown>, path: string): unknown {
  let value: unknown = config;
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[key];
  }
  return value;
}

/** A project file's path relative to the workspace root, forward slashes. */
export function relative(context: LawCheckContext, file: string): string {
  return PathOperations.getRelative(context.projectRoot, file).replace(/\\/g, '/');
}

/**
 * Every Capacitor project of the workspace, resolved. Projects whose config
 * could not be resolved come back as violations, so the caller reports them
 * next to its own findings instead of passing over them.
 */
export function resolvedProjects(context: LawCheckContext): {
  resolved: ResolvedProject[];
  unresolved: string[];
} {
  const resolved: ResolvedProject[] = [];
  const unresolved: string[] = [];
  for (const project of CapacitorProjects.find(context.projectRoot)) {
    const where = relative(context, project.configFile);
    const resolution = CapacitorProjects.resolve(project, context.projectRoot);
    if (resolution.ok) {
      resolved.push({ project, where, config: resolution.config });
    } else {
      unresolved.push(
        `${where}: could not resolve the Capacitor config — ${resolution.reason}. This law reads the config the way Capacitor does and does not pass on a guess`
      );
    }
  }
  return { resolved, unresolved };
}

/** Capacitor and its Android platform: the laws that read the Android shell. */
export const REQUIRES_CAPACITOR_ANDROID: LawRequirement = {
  ...REQUIRES_CAPACITOR,
  allDependencies: [CAPACITOR_CORE, '@capacitor/android'],
};

/** Capacitor and its iOS platform: the laws that read the iOS shell. */
export const REQUIRES_CAPACITOR_IOS: LawRequirement = {
  ...REQUIRES_CAPACITOR,
  allDependencies: [CAPACITOR_CORE, '@capacitor/ios'],
};

export interface PlatformProject {
  project: CapacitorProject;
  native: CapacitorNativePaths;
}

/**
 * The Capacitor projects that have the platform's shell on disk.
 *
 * The law is selected because the platform package is declared; a workspace
 * where NO project has the shell has nothing the law can read, and says so
 * as a violation rather than passing. A project without the shell next to
 * one that has it is another app of the monorepo, not a gap.
 */
export function projectsWithPlatform(
  context: LawCheckContext,
  platform: 'android' | 'ios'
): { projects: PlatformProject[]; notRead: string[] } {
  const shellOf = (native: CapacitorNativePaths) =>
    platform === 'android' ? native.androidDir : native.iosDir;
  const all = CapacitorProjects.find(context.projectRoot).map(project => ({
    project,
    native: CapacitorProjects.nativePaths(project, context.projectRoot),
  }));
  const projects = all.filter(({ native }) => FileUtils.isDirectory(shellOf(native)));
  if (projects.length > 0 || all.length === 0) return { projects, notRead: [] };
  const looked = all.map(({ native }) => relative(context, shellOf(native))).join(', ');
  return {
    projects,
    notRead: [
      `@capacitor/${platform} is declared but no ${platform}/ shell exists (looked for ${looked}) — this law reads the committed native shell and does not pass without it; run \`npx cap add ${platform}\` and commit the shell, or remove the platform package`,
    ],
  };
}
