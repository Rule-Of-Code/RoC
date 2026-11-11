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
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import {
  CAPACITOR_CONFIG_FILES,
  type CapacitorProject,
  CapacitorProjects,
} from './capacitor-project';

/** @capacitor/core declared, and a Capacitor config present. */
export const REQUIRES_CAPACITOR: LawRequirement = {
  anyDependency: ['@capacitor/core'],
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

/**
 * A result with advisory notes: findings a law reports without failing on
 * them (a PARTIAL sub-rule, an info-level observation). They go first in the
 * suggestions and in the details, and the message says how many there are,
 * so a passing law still tells the reader what it noticed.
 */
export function withNotes(result: LawResult, notes: readonly string[]): LawResult {
  if (notes.length === 0) return result;
  return {
    ...result,
    message: `${result.message} (${notes.length} note${notes.length === 1 ? '' : 's'})`,
    suggestions: [...notes, ...(result.suggestions ?? [])],
    details: [...(result.details ?? []), ...notes],
  };
}
