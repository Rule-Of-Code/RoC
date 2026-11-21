import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { BaseCheckerUtilities } from '../shared/base-checker-utilities';
import { GitLawBase } from './git-law-base';

/**
 * Shared Git Law Utilities
 * Common patterns and operations for git law checkers
 */
export class GitLawUtilities extends BaseCheckerUtilities {
  /**
   * Standard git law validation initialization
   */
  static initializeGitValidation(): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
  } {
    return {
      violations: [],
      suggestions: [],
      passed: true,
    };
  }

  /**   * Standard git repository validation with early return
   */
  static validateGitRepository(
    context: LawCheckContext,
    lawName: string
  ): LawResult | null {
    const { violations, suggestions } = this.initializeGitValidation();

    if (!GitLawBase.isGitRepository(context.projectRoot)) {
      violations.push('No Git repository found');
      suggestions.push('Initialize Git repository: git init');
      return this.createGitLawResult(
        lawName,
        violations,
        suggestions,
        context.config
      );
    }

    return null; // Continue with normal validation
  }

  /**   * Creates a git law result using base functionality
   */
  static createGitLawResult(
    lawName: string,
    violations: string[],
    suggestions: string[],
    config: RuleOfCodeConfig,
    score = 100
  ): LawResult {
    const result = this.createStandardLawResult({
      violations,
      suggestions,
      successMessage: `${lawName} compliance verified`,
      failureMessageSuffix: `${lawName} violations found`,
      baseScore: score,
      scoreDeduction: 10,
    });

    return {
      ...result,
      config,
      details: [...violations, ...suggestions],
    };
  }
}
