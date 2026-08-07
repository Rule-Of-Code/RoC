/**
 * Result Merging Helper for Security Configuration
 * Consolidates the mergeResults pattern used across security modules
 * Eliminates 11-line duplicate across multiple security configuration modules
 */

/**
 * Generic result merging helper for security validations
 * Merges multiple result objects by combining violations and suggestions
 * @param createEmptyResult - Callback to create empty result
 * @param results - Array of results to merge
 * @returns Merged result with combined violations and suggestions
 */
export function mergeSecurityResults<
  T extends { violations: string[]; suggestions: string[] },
>(createEmptyResult: () => T, ...results: T[]): T {
  return results.reduce(
    (acc, result) => ({
      ...acc,
      violations: [...acc.violations, ...result.violations],
      suggestions: [...acc.suggestions, ...result.suggestions],
    }),
    createEmptyResult()
  );
}
