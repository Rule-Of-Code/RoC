/**
 * Base class for Naming Validation
 * Consolidates common initialization pattern for code and file naming validators
 * Eliminates 9-line duplicate across naming validation modules
 */

/**
 * Helper to initialize violations and suggestions arrays for naming validations
 * @returns Object with empty violations and suggestions arrays
 */
export function initializeNamingValidation() {
  return {
    violations: [] as string[],
    suggestions: [] as string[],
  };
}
