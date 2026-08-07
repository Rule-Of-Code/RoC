import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';

/**
 * Shared Deployment Validation Utilities
 * Common patterns and operations for deployment laws
 */
export class DeploymentValidationUtilities {
  /**
   * Initialize deployment validation with standard structure
   */
  static initializeDeploymentValidation(): {
    violations: string[];
    suggestions: string[];
    scoreDeduction: number;
  } {
    return {
      violations: [],
      suggestions: [],
      scoreDeduction: 0,
    };
  }

  /**
   * Standard checklist validation pattern
   */
  static validateChecklistDocument(options: {
    checklistName: string;
    checklistStatus: {
      exists: boolean;
      isComplete?: boolean;
    };
    missingMessage: string;
    missingScore: number;
    incompleteMessage?: string;
    incompleteScore?: number;
  }): {
    violations: string[];
    suggestions: string[];
    scoreDeduction: number;
  } {
    const {
      checklistName,
      checklistStatus,
      missingMessage,
      missingScore,
      incompleteMessage,
      incompleteScore,
    } = options;
    const { violations, suggestions } = this.initializeDeploymentValidation();
    let scoreDeduction = 0;

    if (!checklistStatus.exists) {
      violations.push(missingMessage);
      suggestions.push(
        `Create comprehensive ${checklistName} with validation steps`
      );
      scoreDeduction = missingScore;
    } else if (
      checklistStatus.isComplete === false &&
      incompleteMessage &&
      incompleteScore
    ) {
      violations.push(incompleteMessage);
      suggestions.push('Complete all validation steps before deployment');
      scoreDeduction = incompleteScore;
    }

    return { violations, suggestions, scoreDeduction };
  }

  /**
   * Standard deployment result creation
   */
  static createDeploymentResult(
    lawName: string,
    violations: string[],
    suggestions: string[],
    score: number,
    config: RuleOfCodeConfig
  ) {
    return {
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? `${lawName} compliance verified`
          : `${lawName} violations found: ${violations.length} critical issues`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, score),
      fixable: true,
      config,
    };
  }

  /**
   * Generic checklist validation workflow
   */
  static validateChecklistGeneric<T>(
    projectRoot: string,
    config: RuleOfCodeConfig,
    checklistValidator: (projectRoot: string, config: RuleOfCodeConfig) => T,
    processChecklistStatus: (
      status: T,
      violations: string[],
      suggestions: string[]
    ) => number
  ): {
    violations: string[];
    suggestions: string[];
    scoreDeduction: number;
  } {
    const {
      violations,
      suggestions,
      scoreDeduction: _scoreDeduction,
    } = this.initializeDeploymentValidation();
    let scoreDeduction = 0;

    const checklistStatus = checklistValidator(projectRoot, config);
    scoreDeduction = processChecklistStatus(
      checklistStatus,
      violations,
      suggestions
    );

    return { violations, suggestions, scoreDeduction };
  }

  /**
   * Standard error result for deployment laws
   */
  static createDeploymentErrorResult(
    lawName: string,
    error: unknown,
    config: RuleOfCodeConfig
  ) {
    return {
      passed: false,
      message: `Error checking ${lawName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: [
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ],
      violations: [`${lawName} check failed due to error`],
      suggestions: [`Review ${lawName} implementation and fix any issues`],
      score: 0,
      fixable: false,
      config,
    };
  }

  /**
   * Standard validation method structure with common pattern
   */
  static createStandardValidation<T>(
    validatorFunction: (projectRoot: string, context: LawCheckContext) => T,
    processResults: (
      result: T,
      violations: string[],
      suggestions: string[]
    ) => number
  ) {
    return (
      projectRoot: string,
      context: LawCheckContext
    ): {
      violations: string[];
      suggestions: string[];
      scoreDeduction: number;
    } => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let scoreDeduction = 0;

      const validationResult = validatorFunction(projectRoot, context);
      scoreDeduction = processResults(
        validationResult,
        violations,
        suggestions
      );

      return { violations, suggestions, scoreDeduction };
    };
  }

  /**
   * Common pattern for checking CI/CD files with a content validator
   */
  static checkCICDFiles(
    projectRoot: string,
    cicdFiles: string[],
    contentValidator: (content: string) => boolean
  ): { found: boolean; filePath?: string } {
    for (const cicdFile of cicdFiles) {
      const filePath = PathOperations.join(projectRoot, cicdFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (contentValidator(content)) {
            return { found: true, filePath };
          }
        } catch (_error) {
          // Continue checking other files if one fails
          continue;
        }
      }
    }
    return { found: false };
  }

  /**
   * Common health check file search pattern
   */
  static findHealthCheckFiles(
    projectRoot: string,
    healthCheckPatterns: string[]
  ): string[] {
    const foundFiles: string[] = [];

    for (const pattern of healthCheckPatterns) {
      const filePath = PathOperations.join(projectRoot, pattern);
      if (FileUtils.exists(filePath)) {
        foundFiles.push(filePath);
      }
    }

    return foundFiles;
  }

  /**
   * Common pattern for searching content with regex patterns
   */
  static searchFilesWithPatterns(
    projectRoot: string,
    searchFiles: string[],
    patterns: RegExp[]
  ): { found: boolean; filePath?: string } {
    for (const searchFile of searchFiles) {
      const filePath = PathOperations.join(projectRoot, searchFile);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          if (patterns.some(pattern => pattern.test(content))) {
            return { found: true, filePath };
          }
        } catch (_error) {
          // Continue checking other files if one fails
          continue;
        }
      }
    }
    return { found: false };
  }
}
