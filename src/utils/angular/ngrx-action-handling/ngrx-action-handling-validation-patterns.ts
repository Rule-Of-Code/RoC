import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES } from '../../file-constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { ResultFactory } from '../../result-interfaces';
import { AngularConfigurationBase } from '../angular-configuration-base';
import type { AnalysisResult } from '../rxjs-operator-usage';
import { NgRxActionHandlingConfiguration } from './ngrx-action-handling-configuration';

/**
 * NgRx Action Handling Validation Patterns
 * Centralized validation methods for NgRx action handling analysis
 */
export class NgRxActionHandlingValidationPatterns extends AngularConfigurationBase {
  private static readonly config = NgRxActionHandlingConfiguration;
  private static readonly messages = this.config.VALIDATION_MESSAGES;
  private static readonly FILENAME_PLACEHOLDER = '{fileName}';
  private static readonly actionAnalysis = Object.create(null) as Record<
    string,
    unknown
  >;

  private static formatMessage(message: string, fileName: string): string {
    return message.replace(this.FILENAME_PLACEHOLDER, fileName);
  }
  /**
   * Validate all NgRx action handling patterns in a project
   */
  static validateAllActionHandlingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AnalysisResult {
    const { violations, suggestions } =
      NgRxActionHandlingValidationPatterns.initializeAnalysis(
        projectRoot,
        ['.ts'],
        config
      );

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    const extensions = [
      this.config.ACTION_HANDLING_PATTERNS.FILE_EXTENSIONS.REDUCER_TS,
    ];
    const reducerFiles = CheckerUtils.findFilesByExtension(
      srcPath,
      extensions,
      config
    );

    for (const reducerFile of reducerFiles) {
      this.analyzeReducerFile(reducerFile, violations, suggestions);
    }

    return ResultFactory.createNgRxResult(violations, suggestions);
  }

  /**
   * Analyze a single reducer file for action handling patterns
   */
  static analyzeReducerFile(
    reducerFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(reducerFile, {
      encoding:
        this.config.ACTION_HANDLING_PATTERNS.ANGULAR_CONSTANTS.ENCODING_UTF8,
      fallbackToEmpty: true,
    });
    if (!content) return;

    const fileName = PathOperations.getBasename(reducerFile);
    const patterns: typeof this.actionAnalysis =
      this.config.analyzeActionHandlingPatterns(content);

    this.validateActionHandlerPatterns(
      patterns,
      fileName,
      violations,
      suggestions
    );
    this.validatePayloadHandlingPatterns(patterns, fileName, suggestions);
    this.validateAsyncActionPatterns(patterns, fileName, suggestions);
    this.validateStateManagementPatterns(patterns, fileName, suggestions);
    this.validateStateShapePatterns(
      patterns,
      fileName,
      violations,
      suggestions
    );
    this.validateReducerPurityPatterns(
      patterns,
      fileName,
      violations,
      suggestions
    );
  }

  /**
   * Validate action handler patterns
   */
  private static validateActionHandlerPatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasCreateReducer) return;

    if (patterns.onFunctionCount === 0) {
      violations.push(
        this.formatMessage(this.messages.NO_ACTION_HANDLERS_VIOLATION, fileName)
      );
      suggestions.push(
        this.formatMessage(
          this.messages.NO_ACTION_HANDLERS_SUGGESTION,
          fileName
        )
      );
    }

    if (patterns.hasOnFunction && !patterns.hasImports) {
      suggestions.push(
        this.formatMessage(this.messages.PROPER_IMPORTS_SUGGESTION, fileName)
      );
    }

    if (patterns.hasMultiActionPattern) {
      suggestions.push(
        this.formatMessage(this.messages.SEPARATE_HANDLERS_SUGGESTION, fileName)
      );
    }
  }

  /**
   * Validate action payload handling patterns
   */
  private static validatePayloadHandlingPatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (!patterns.hasActionPayload && patterns.hasOnFunction) {
      suggestions.push(
        this.formatMessage(
          this.messages.USE_ACTION_PAYLOADS_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Validate async action patterns (loading, error, success)
   */
  private static validateAsyncActionPatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasLoadingActions && !patterns.hasErrorActions) {
      suggestions.push(
        this.formatMessage(this.messages.ERROR_HANDLING_SUGGESTION, fileName)
      );
    }

    if (patterns.hasLoadingActions && !patterns.hasSuccessActions) {
      suggestions.push(
        this.formatMessage(this.messages.SUCCESS_ACTIONS_SUGGESTION, fileName)
      );
    }
  }

  /**
   * Validate state management patterns
   */
  private static validateStateManagementPatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasLoadingState && !patterns.hasBooleanValues) {
      suggestions.push(
        this.formatMessage(this.messages.LOADING_STATE_SUGGESTION, fileName)
      );
    }

    if (patterns.hasErrorState && !patterns.hasNullValue) {
      suggestions.push(
        this.formatMessage(this.messages.ERROR_STATE_SUGGESTION, fileName)
      );
    }
  }

  /**
   * Validate state shape consistency patterns
   */
  private static validateStateShapePatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasOnFunction && !patterns.hasSpreadOperator) {
      violations.push(
        this.formatMessage(this.messages.PRESERVE_STATE_VIOLATION, fileName)
      );
      suggestions.push(
        this.formatMessage(this.messages.PRESERVE_STATE_SUGGESTION, fileName)
      );
    }
  }

  /**
   * Validate reducer purity patterns (no side effects)
   */
  private static validateReducerPurityPatterns(
    patterns: typeof this.actionAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasSideEffects) {
      violations.push(
        this.formatMessage(this.messages.SIDE_EFFECT_VIOLATION, fileName)
      );
      suggestions.push(
        this.formatMessage(this.messages.SIDE_EFFECT_SUGGESTION, fileName)
      );
    }
  }
}
