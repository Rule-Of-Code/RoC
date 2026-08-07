/**
 * Shared base class for security configuration utilities
 * Consolidates common patterns between environment-files-configuration and secret-management-configuration
 */

/**
 * Generic result type for configuration checks
 */
export interface ConfigCheckResult<T> {
  violations: T[];
  suggestions: string[];
}

/**
 * Creates an empty configuration check result
 */
export function createEmptyConfigResult<T>(): ConfigCheckResult<T> {
  return { violations: [], suggestions: [] };
}

/**
 * Merges multiple configuration check results into a single result
 */
export function mergeConfigResults<T>(
  ...results: Array<ConfigCheckResult<T>>
): ConfigCheckResult<T> {
  return results.reduce(
    (acc, result) => ({
      violations: [...acc.violations, ...result.violations],
      suggestions: [...acc.suggestions, ...result.suggestions],
    }),
    createEmptyConfigResult<T>()
  );
}
