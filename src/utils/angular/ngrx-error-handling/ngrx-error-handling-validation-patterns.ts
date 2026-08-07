import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { ANGULAR_CONSTANTS, FILE_EXTENSIONS } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { AnalysisResult } from '../rxjs-operator-usage';
import { NgRxErrorHandlingConfiguration } from './ngrx-error-handling-configuration';

/**
 * NgRx Error Handling Validation Patterns
 * Centralized validation methods for NgRx error handling analysis
 */
export class NgRxErrorHandlingValidationPatterns {
  private static readonly Config = NgRxErrorHandlingConfiguration;
  private static readonly ErrorAnalysis = Object.create(null) as Record<string, unknown>;
  /**
   * Validate all NgRx error handling patterns in a project
   */
  static validateAllErrorHandlingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AnalysisResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const ngrxFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      [FILE_EXTENSIONS.EFFECTS_TS, FILE_EXTENSIONS.EFFECT_TS],
      config
    ).filter(file => {
      const fileName = PathOperations.getBasename(file);
      return this.Config.isEffectsFile(fileName);
    });

    for (const file of ngrxFiles) {
      this.analyzeErrorHandlingFile(file, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Analyze a single NgRx effects file for error handling patterns
   */
  static analyzeErrorHandlingFile(
    file: string,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(file, {
        encoding: ANGULAR_CONSTANTS.ENCODING_UTF8,
      });
      const fileName = PathOperations.getBasename(file);
      const patterns: typeof this.ErrorAnalysis =
        this.Config.analyzeErrorHandlingPatterns(content);

      this.validateCatchErrorUsage(patterns, fileName, violations, suggestions);
      this.validateErrorActionDispatch(
        patterns,
        fileName,
        violations,
        suggestions
      );
      this.validateHttpPatterns(patterns, suggestions);
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  /**
   * Validate catchError usage in content
   */
  private static validateCatchErrorUsage(
    patterns: typeof this.ErrorAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const messages = this.Config.getValidationMessages();
    if (!patterns.hasCatchError) {
      violations.push(messages.MISSING_CATCH_ERROR_VIOLATION(fileName));
      suggestions.push(messages.MISSING_CATCH_ERROR_SUGGESTION);
    }
  }

  /**
   * Validate proper error action dispatch patterns
   */
  private static validateErrorActionDispatch(
    patterns: typeof this.ErrorAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const messages = this.Config.getValidationMessages();
    if (patterns.hasCatchError && !patterns.hasRxOf) {
      violations.push(messages.MISSING_OBSERVABLE_RETURN_VIOLATION(fileName));
      suggestions.push(messages.MISSING_OBSERVABLE_RETURN_SUGGESTION);
    }
  }

  /**
   * Validate HTTP-related patterns (retry and timeout)
   */
  private static validateHttpPatterns(
    patterns: typeof this.ErrorAnalysis,
    suggestions: string[]
  ): void {
    const messages = this.Config.getValidationMessages();
    if (patterns.hasHttpContent && !patterns.hasRetryLogic) {
      suggestions.push(messages.RETRY_LOGIC_SUGGESTION);
    }

    if (patterns.hasHttpContent && !patterns.hasTimeout) {
      suggestions.push(messages.TIMEOUT_SUGGESTION);
    }
  }
}
