import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { NgRxImmutabilityConfiguration } from './ngrx-immutability-configuration';

/**
 * Validation patterns utility for NgRx Immutability Compliance Analysis
 * Provides comprehensive immutability validation workflow and pattern matching
 */
export class NgRxImmutabilityValidationPatterns extends AngularConfigurationBase {
  /**
   * Class-level alias for Configuration
   */
  private static readonly Config = NgRxImmutabilityConfiguration;

  /**
   * Type alias for immutability analysis result
   */
  private static readonly ImmutabilityAnalysis = Object.create(null) as Record<string, unknown>;

  /**
   * Validate all NgRx immutability compliance patterns
   */
  static validateAllImmutabilityPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } =
      NgRxImmutabilityValidationPatterns.initializeAnalysis(
        projectRoot,
        ['.ts'],
        config
      );

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions };
    }

    // Find all reducer files using the base checker initialization pattern
    const reducerFiles = this.findReducerFilesWithChecker(srcPath, config);

    // Analyze each reducer file
    for (const reducerFile of reducerFiles) {
      this.validateSingleReducerFile(reducerFile, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Find reducer files using CheckerUtils integration
   */
  private static findReducerFilesWithChecker(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    const reducerExtensions = [
      ...this.Config.REDUCER_FILE_EXTENSIONS,
    ] as string[];
    return CheckerUtils.findFilesByExtension(
      srcPath,
      reducerExtensions,
      config
    );
  }

  /**
   * Validate a single reducer file for immutability compliance
   */
  private static validateSingleReducerFile(
    reducerFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(
      reducerFile,
      this.Config.FILE_READ_OPTIONS
    );

    if (!content) return;

    const fileName = PathOperations.getBasename(reducerFile);
    const analysis = this.Config.analyzeImmutabilityPatterns(content);

    // Apply all validation checks
    this.validateDirectStateMutation(
      analysis,
      fileName,
      violations,
      suggestions
    );
    this.validateSpreadOperatorUsage(analysis, fileName, suggestions);
    this.validateImmerUsage(analysis, fileName, suggestions);
    this.validateNestedObjectUpdates(
      analysis,
      fileName,
      violations,
      suggestions
    );
    this.validateArrayMutations(analysis, fileName, violations, suggestions);
    this.validateReturnStatements(analysis, fileName, suggestions);
    this.validateObjectAssignUsage(analysis, fileName, violations, suggestions);
  }

  /**
   * Validate direct state mutation patterns
   */
  private static validateDirectStateMutation(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (analysis.hasDirectMutation) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.DIRECT_STATE_MUTATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_IMMUTABLE_UPDATE,
          fileName
        )
      );
    }
  }

  /**
   * Validate spread operator usage
   */
  private static validateSpreadOperatorUsage(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.needsSpreadOperator) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_SPREAD_OPERATOR,
          fileName
        )
      );
    }
  }

  /**
   * Validate Immer usage
   */
  private static validateImmerUsage(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.hasImmerWithoutImport) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.ENSURE_IMMER_IMPORT,
          fileName
        )
      );
    }
  }

  /**
   * Validate nested object updates
   */
  private static validateNestedObjectUpdates(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (analysis.hasNestedMutation) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.NESTED_OBJECT_MUTATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_NESTED_SPREAD,
          fileName
        )
      );
    }
  }

  /**
   * Validate array mutations
   */
  private static validateArrayMutations(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (analysis.hasArrayMutation) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.ARRAY_MUTATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_IMMUTABLE_ARRAYS,
          fileName
        )
      );
    }
  }

  /**
   * Validate return statements
   */
  private static validateReturnStatements(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.hasImproperReturns) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_OBJECT_LITERALS,
          fileName
        )
      );
    }
  }

  /**
   * Validate Object.assign usage
   */
  private static validateObjectAssignUsage(
    analysis: typeof this.ImmutabilityAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (analysis.hasObjectAssignMutation) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.OBJECT_ASSIGN_MUTATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_PROPER_PATTERNS,
          fileName
        )
      );
    }
  }

  /**
   * Comprehensive reducer file analysis
   */
  static analyzeReducerFileComprehensive(reducerFile: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validateSingleReducerFile(reducerFile, violations, suggestions);

    return { violations, suggestions };
  }
}
