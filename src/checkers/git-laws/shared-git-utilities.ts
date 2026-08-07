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

  /**
   * Standard git command pattern for checking conditions
   */
  static createGitCheckPattern(
    checkName: string,
    gitCommand: string,
    successCondition: (output: string) => boolean,
    violationMessage: string,
    suggestionMessage: string
  ) {
    return (
      projectRoot: string
    ): {
      violations: string[];
      suggestions: string[];
      passed: boolean;
    } => {
      const { violations, suggestions } = this.initializeGitValidation();
      let passed = true;

      try {
        // In real implementation, this would execute git command
        // For now, we'll simulate the check
        const commandOutput = this.simulateGitCommand(gitCommand, projectRoot);

        if (!successCondition(commandOutput)) {
          violations.push(violationMessage);
          suggestions.push(suggestionMessage);
          passed = false;
        }
      } catch (error) {
        this.handleCheckError(
          checkName,
          error,
          violations,
          suggestions,
          'Ensure git is available and repository is properly configured'
        );
        passed = false;
      }

      return { violations, suggestions, passed };
    };
  }

  /**
   * Standard configuration check pattern
   */
  static checkConfiguration(
    configPath: string,
    configName: string,
    requiredFields: string[]
  ): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
  } {
    const { violations, suggestions } = this.initializeGitValidation();
    let passed = true;

    // Simulate configuration check
    try {
      // In real implementation, would check if config file exists and has required fields
      const configExists = this.simulateFileExists(configPath);

      if (!configExists) {
        violations.push(
          `${configName} configuration not found at ${configPath}`
        );
        suggestions.push(
          `Create ${configName} configuration with required fields: ${requiredFields.join(', ')}`
        );
        passed = false;
      }
    } catch (error) {
      violations.push(
        `Configuration check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      suggestions.push(`Ensure ${configName} is properly configured`);
      passed = false;
    }

    return { violations, suggestions, passed };
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

  /**
   * Simulate git command execution (placeholder)
   */
  private static simulateGitCommand(
    _command: string,
    _projectRoot: string
  ): string {
    // In real implementation, would execute actual git command
    return 'simulated output';
  }

  /**
   * Simulate file existence check (placeholder)
   */
  private static simulateFileExists(_filePath: string): boolean {
    // In real implementation, would check if file actually exists
    return Math.random() > 0.3; // Simulate some files missing
  }
}
