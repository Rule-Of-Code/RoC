/**
 * Health Check File Search Helper
 * Consolidates the file searching and pattern matching for health check monitoring
 * Eliminates 8-line duplicate within health-check-monitoring.ts
 */

import { DeploymentValidationUtilities } from './shared-deployment-utilities';

/**
 * Search for files and check if they match patterns
 * @param projectRoot - Project root directory
 * @param searchFiles - Array of file paths to search for
 * @param patterns - Array of regex patterns to match
 * @returns true if any file matching search paths contains any of the patterns
 */
export function searchFilesForPatterns(
  projectRoot: string,
  searchFiles: string[],
  patterns: RegExp[]
): boolean {
  const result = DeploymentValidationUtilities.searchFilesWithPatterns(
    projectRoot,
    searchFiles,
    patterns
  );
  return result.found;
}
