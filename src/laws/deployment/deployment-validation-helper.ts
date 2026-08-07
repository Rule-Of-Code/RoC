/**
 * Deployment Validation Helper
 * Consolidates the common initialization pattern for deployment validators
 * Eliminates 12-line duplicate across launch-preparation-protocol and pre-deployment-checklist
 */

/**
 * Initialize deployment validation result structure
 * @returns Object with empty violations, suggestions, and zero scoreDeduction
 */
export function initializeDeploymentValidation() {
  return {
    violations: [] as string[],
    suggestions: [] as string[],
    scoreDeduction: 0,
  };
}
