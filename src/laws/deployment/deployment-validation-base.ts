/**
 * Base Deployment Validation Utilities
 * Common patterns for deployment law validation
 */

import type { RuleOfCodeConfig } from '../../types';

/**
 * Base validation result structure
 */
export interface DeploymentValidationResult {
  violations: string[];
  suggestions: string[];
  scoreDeduction: number;
}

/**
 * Validator function signature for deployment checks
 */
export type DeploymentValidator<T = unknown> = (
  projectRoot: string,
  config: RuleOfCodeConfig
) => T;

/**
 * Base class for deployment validation utilities
 */
export class DeploymentValidationBase {
  /**
   * Initialize base validation result structure
   */
  protected static initializeValidation(): DeploymentValidationResult {
    return {
      violations: [],
      suggestions: [],
      scoreDeduction: 0,
    };
  }

  /**
   * Generic checklist validation pattern
   */
  protected static validateChecklistFile<T>(
    projectRoot: string,
    config: RuleOfCodeConfig,
    validator: DeploymentValidator<T>,
    options: {
      missingFileMessage: string;
      missingFileSuggestion: string;
      criticalScoreDeduction?: number;
    }
  ): DeploymentValidationResult {
    const result = this.initializeValidation();
    const criticalScoreDeduction = options.criticalScoreDeduction ?? 50;

    const validationStatus = validator(projectRoot, config);

    // Assuming validation status has an 'exists' property
    if (
      validationStatus &&
      typeof validationStatus === 'object' &&
      'exists' in validationStatus
    ) {
      const statusWithExists = validationStatus as { exists: boolean };
      if (!statusWithExists.exists) {
        result.violations.push(options.missingFileMessage);
        result.suggestions.push(options.missingFileSuggestion);
        result.scoreDeduction += criticalScoreDeduction;
      }
    }

    return result;
  }
}
