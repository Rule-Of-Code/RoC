/**
 * Common File Extensions Constants
 * REFACTORED: Extracted to break circular dependency chain
 *
 * Previously in checker-utils.ts, but this caused:
 * config-file-utils → checker-utils → file-utils → config-file-utils (cycle!)
 *
 * Now this file has ZERO internal dependencies, breaking the cycle.
 */

/**
 * Interface for common file extensions
 */
export interface CommonExtensions {
  TYPESCRIPT: string[];
  JAVASCRIPT: string[];
  CONFIG: string[];
  ANGULAR: string[];
  TESTS: string[];
  ALL_CODE: string[];
  DOCUMENTATION: string[];
}

/**
 * Common file extensions used across law checkers
 * Centralized to avoid duplication
 */
export const COMMON_EXTENSIONS: CommonExtensions = {
  TYPESCRIPT: ['.ts', '.tsx'],
  JAVASCRIPT: ['.js', '.jsx'],
  CONFIG: [
    '.json',
    '.yaml',
    '.yml',
    '.config.js',
    '.config.ts',
    '.config.mjs',
    '.mjs',
  ],
  ANGULAR: ['.ts', '.html', '.scss', '.css'],
  TESTS: ['.spec.ts', '.test.ts', '.spec.js', '.test.js'],
  ALL_CODE: ['.ts', '.tsx', '.js', '.jsx'],
  DOCUMENTATION: ['.md', '.txt', '.rst'],
};

/**
 * Get common extensions (function wrapper for backwards compatibility)
 */
export function getCommonExtensions(): CommonExtensions {
  return COMMON_EXTENSIONS;
}
