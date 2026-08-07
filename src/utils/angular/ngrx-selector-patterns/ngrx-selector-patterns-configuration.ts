import type { RuleOfCodeConfig } from '../../../config/types';
import {
  ANGULAR_CONSTANTS,
  DIRECTORY_NAMES,
  NGRX_KEYWORDS,
} from '../../constants';
import { FileSystemOperations } from '../../file-system-operations';
import { PathOperations } from '../../path-operations';
import { StringTemplateUtils } from '../../string-template-utils';
import { AngularConfigurationBase } from '../angular-configuration-base';

/**
 * NgRx Selector Patterns Configuration
 * Centralized configuration for NgRx selector pattern analysis
 */
export class NgRxSelectorPatternsConfiguration extends AngularConfigurationBase {
  private static readonly Config = NgRxSelectorPatternsConfiguration;

  /**
   * Selector analysis configuration (RULE 1: 100% internal coverage)
   */
  static readonly SELECTOR_ANALYSIS_CONFIG = {
    checkNamingConventions: true,
    checkMemoization: true,
    checkParameterUsage: true,
    checkReusability: true,
    checkPropsSelectors: true,
    enableAdvancedPatterns: true,
  } as const;

  /**
   * Selector validation patterns (RULE 1: 100% internal coverage)
   */
  static readonly SELECTOR_VALIDATION_PATTERNS = {
    createSelectorPattern: new RegExp(
      `${NGRX_KEYWORDS.CREATE_SELECTOR}\\([^)]+\\)`,
      'g'
    ),
    parameterPattern: /\(state[^)]*\)/g,
    duplicateLogicPattern: /\.\w+\?\.\w+/g,
    propsPattern: new RegExp(NGRX_KEYWORDS.PROPS, 'g'),
    stateParameterPattern: /\(\s*state\s*[,)]|\(\s*state\s*[,)]/g,
  } as const;

  /**
   * Selector file detection settings (RULE 1: 100% internal coverage)
   */
  static readonly SELECTOR_FILE_SETTINGS = {
    fileExtensions: ['.ts', '.js'] as readonly string[],
    selectorSuffix: '.selectors',
    encoding: ANGULAR_CONSTANTS.ENCODING_UTF8,
    fallbackToEmpty: true,
  } as const;

  /**
   * Analysis thresholds (RULE 1: 100% internal coverage)
   */
  static readonly ANALYSIS_THRESHOLDS = {
    duplicateLogicThreshold: 3,
    minSelectorsPerFile: 1,
    maxParametersPerSelector: 4,
    complexityThreshold: 10,
  } as const;

  /**
   * Validation messages for selector patterns (RULE 1: 100% internal coverage)
   */
  static readonly VALIDATION_MESSAGES_CONFIG = {
    MISSING_CREATE_SELECTOR: 'Missing createSelector usage in {0}',
    PARAMETER_USAGE_SUGGESTION:
      'Use proper parameter destructuring in selectors in {0}',
    REUSABILITY_SUGGESTION: 'Consider extracting common selector logic in {0}',
    PROPS_WITHOUT_CREATE_SELECTOR: 'Props usage without createSelector in {0}',
    PROPS_WITH_CREATE_SELECTOR_SUGGESTION:
      'Use createSelector with props parameter in {0}',
    CREATE_SELECTOR_FILES_SUGGESTION:
      'Create selector files for efficient state selection',
  } as const;

  /**
   * Selector recommendations (RULE 1: 100% internal coverage)
   */
  static readonly SELECTOR_RECOMMENDATIONS_CONFIG = {
    USE_CREATE_SELECTOR: 'Use createSelector for memoized selectors in {0}',
    MEMOIZATION_BENEFITS:
      'Memoized selectors improve performance by avoiding unnecessary recalculations',
    FEATURE_SELECTOR_PATTERN:
      'Use feature selectors as building blocks for more complex selectors',
    COMPOSITION_BENEFITS:
      'Compose selectors for better maintainability and reusability',
  } as const;

  /**
   * Build validation message with flexible placeholder support
   * RULE 1: Uses centralized StringTemplateUtils instead of duplicate logic
   */
  static buildMessage(
    messageTemplate: string,
    ...placeholders: string[]
  ): string {
    return StringTemplateUtils.formatTemplate(messageTemplate, ...placeholders);
  }

  /**
   * Get the source path for analysis (RULE 2: Caching)
   */
  static getSourcePath(projectRoot: string): string | null {
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    return FileSystemOperations.exists(srcPath) ? srcPath : null;
  }

  static getSelectorAnalysisConfig(_config: RuleOfCodeConfig): {
    checkNamingConventions: boolean;
    checkMemoization: boolean;
    checkParameterUsage: boolean;
    checkReusability: boolean;
    checkPropsSelectors: boolean;
    enableAdvancedPatterns: boolean;
    // TODO (Sprint 10): Use config to customize selector patterns based on project-specific naming conventions
  } {
    return this.Config.SELECTOR_ANALYSIS_CONFIG;
  }

  static getSelectorValidationPatterns(): {
    createSelectorPattern: RegExp;
    parameterPattern: RegExp;
    duplicateLogicPattern: RegExp;
    propsPattern: RegExp;
    stateParameterPattern: RegExp;
  } {
    return this.Config.SELECTOR_VALIDATION_PATTERNS;
  }

  /**
   * Get selector file detection settings (RULE 2: Caching)
   */
  static getSelectorFileSettings(): {
    fileExtensions: readonly string[];
    selectorSuffix: string;
    encoding: string;
    fallbackToEmpty: boolean;
  } {
    return this.Config.SELECTOR_FILE_SETTINGS;
  }

  /**
   * Get analysis thresholds (RULE 2: Caching)
   */
  static getAnalysisThresholds(): {
    duplicateLogicThreshold: number;
    minSelectorsPerFile: number;
    maxParametersPerSelector: number;
    complexityThreshold: number;
  } {
    return this.Config.ANALYSIS_THRESHOLDS;
  }

  /**
   * Get validation messages for selector patterns (RULE 2: Caching)
   */
  static getValidationMessages(): {
    MISSING_CREATE_SELECTOR: (fileName: string) => string;
    PARAMETER_USAGE_SUGGESTION: (fileName: string) => string;
    REUSABILITY_SUGGESTION: (fileName: string) => string;
    PROPS_WITHOUT_CREATE_SELECTOR: (fileName: string) => string;
    PROPS_WITH_CREATE_SELECTOR_SUGGESTION: (fileName: string) => string;
    CREATE_SELECTOR_FILES_SUGGESTION: string;
  } {
    const messages = this.Config.VALIDATION_MESSAGES_CONFIG;
    return {
      MISSING_CREATE_SELECTOR: (fileName: string) =>
        this.buildMessage(messages.MISSING_CREATE_SELECTOR, fileName),
      PARAMETER_USAGE_SUGGESTION: (fileName: string) =>
        this.buildMessage(messages.PARAMETER_USAGE_SUGGESTION, fileName),
      REUSABILITY_SUGGESTION: (fileName: string) =>
        this.buildMessage(messages.REUSABILITY_SUGGESTION, fileName),
      PROPS_WITHOUT_CREATE_SELECTOR: (fileName: string) =>
        this.buildMessage(messages.PROPS_WITHOUT_CREATE_SELECTOR, fileName),
      PROPS_WITH_CREATE_SELECTOR_SUGGESTION: (fileName: string) =>
        this.buildMessage(
          messages.PROPS_WITH_CREATE_SELECTOR_SUGGESTION,
          fileName
        ),
      CREATE_SELECTOR_FILES_SUGGESTION:
        messages.CREATE_SELECTOR_FILES_SUGGESTION,
    };
  }

  /**
   * Get selector recommendations (RULE 2: Caching)
   */
  static getSelectorRecommendations(): {
    USE_CREATE_SELECTOR: (fileName: string) => string;
    MEMOIZATION_BENEFITS: string;
    FEATURE_SELECTOR_PATTERN: string;
    COMPOSITION_BENEFITS: string;
  } {
    const recommendations = this.Config.SELECTOR_RECOMMENDATIONS_CONFIG;
    return {
      USE_CREATE_SELECTOR: (fileName: string) =>
        this.buildMessage(recommendations.USE_CREATE_SELECTOR, fileName),
      MEMOIZATION_BENEFITS: recommendations.MEMOIZATION_BENEFITS,
      FEATURE_SELECTOR_PATTERN: recommendations.FEATURE_SELECTOR_PATTERN,
      COMPOSITION_BENEFITS: recommendations.COMPOSITION_BENEFITS,
    };
  }

  /**
   * Validate project configuration for selector analysis
   */
  static validateProjectConfig(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const { isValid, errors, warnings } =
      this.validateProjectRootPath(projectRoot);

    const srcPath = this.getSourcePath(projectRoot);
    if (!srcPath) {
      warnings.push(
        `Source directory not found at ${projectRoot}/${DIRECTORY_NAMES.SRC}`
      );
    }

    return {
      isValid,
      errors,
      warnings,
    };
  }

  /**
   * Check if content contains specific selector patterns (RULE 2: Caching)
   */
  static containsPattern(content: string, patternType: string): boolean {
    const patterns = this.Config.SELECTOR_VALIDATION_PATTERNS;
    const thresholds = this.Config.ANALYSIS_THRESHOLDS;

    switch (patternType) {
      case 'createSelector':
        return content.includes(NGRX_KEYWORDS.CREATE_SELECTOR);
      case 'props':
        return content.includes(NGRX_KEYWORDS.PROPS);
      case 'parameters':
        return patterns.parameterPattern.test(content);
      case 'duplicateLogic': {
        const matches = content.match(patterns.duplicateLogicPattern);
        return matches
          ? matches.length > thresholds.duplicateLogicThreshold
          : false;
      }
      default:
        return false;
    }
  }

  /**
   * Get file reading configuration (RULE 2: Caching)
   */
  // TODO (Sprint 10): Use config to customize file reading settings for better caching performance
  static getFileReadingConfig(_config: RuleOfCodeConfig): {
    encoding: string;
    fallbackToEmpty: boolean;
    skipEmptyFiles: boolean;
  } {
    const settings = this.Config.SELECTOR_FILE_SETTINGS;
    return {
      encoding: settings.encoding,
      fallbackToEmpty: settings.fallbackToEmpty,
      skipEmptyFiles: true,
    };
  }
}
