/**
 * Recursive Directory Scanning Helper for Angular Utils
 * Consolidates the recursive directory search pattern for NgRx validators
 * Eliminates 8-line duplicate across ngrx-feature-store and ngrx-file-organization
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

/**
 * Generic recursive directory finder with optional filtering
 * @param basePath - Base path to start searching from
 * @param config - RuleOfCode configuration
 * @param shouldInclude - Optional filter function to determine if directory should be included
 * @returns Array of directory paths matching the filter (or all if no filter)
 */
export function findDirectoriesRecursively(
  basePath: string,
  config: RuleOfCodeConfig,
  shouldInclude?: (dirName: string) => boolean
): string[] {
  const directories: string[] = [];

  try {
    const entries = FileUtils.safeReadDirectory(basePath, config);

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = PathOperations.join(basePath, entry.name);

        // Check if directory should be included
        if (!shouldInclude || shouldInclude(entry.name)) {
          directories.push(dirPath);
        }

        // Recurse into subdirectories
        const subdirectories = findDirectoriesRecursively(
          dirPath,
          config,
          shouldInclude
        );
        directories.push(...subdirectories);
      }
    }
  } catch (_error) {
    // Silently handle errors for inaccessible directories
  }

  return directories;
}
