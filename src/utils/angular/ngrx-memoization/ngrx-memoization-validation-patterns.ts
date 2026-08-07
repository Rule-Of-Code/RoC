import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { NgRxMemoizationConfiguration } from './ngrx-memoization-configuration';

/**
 * Validation patterns utility for NgRx Memoization Compliance Analysis
 * Provides comprehensive memoization validation workflow and pattern matching
 */
export class NgRxMemoizationValidationPatterns extends AngularConfigurationBase {
  /**
   * Class-level alias for Configuration to reduce verbosity
   */
  private static readonly Config = NgRxMemoizationConfiguration;

  /**
   * Type alias for selector analysis result
   */
  private static readonly SelectorAnalysis = Object.create(null) as Record<string, unknown>;

  /**
   * Type alias for component analysis result
   */
  private static readonly ComponentAnalysis = Object.create(null) as Record<string, unknown>;

  /**
   * Validate all NgRx memoization compliance patterns
   */
  static validateAllMemoizationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } =
      NgRxMemoizationValidationPatterns.initializeAnalysis(
        projectRoot,
        ['.ts'],
        config
      );

    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions };
    }

    // Find and analyze selector files
    const selectorFiles = this.findSelectorFilesWithChecker(srcPath, config);
    this.validateAllSelectorFiles(selectorFiles, violations, suggestions);

    // Find and analyze component files
    const componentFiles = this.findComponentFilesWithChecker(srcPath, config);
    this.validateAllComponentFiles(componentFiles, violations, suggestions);

    return { violations, suggestions };
  }

  /**
   * Find selector files using CheckerUtils integration
   */
  private static findSelectorFilesWithChecker(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    const selectorExtensions = [
      ...this.Config.SELECTOR_FILE_EXTENSIONS,
    ] as string[];
    return CheckerUtils.findFilesByExtension(
      srcPath,
      selectorExtensions,
      config
    );
  }

  /**
   * Find component files using CheckerUtils integration
   */
  private static findComponentFilesWithChecker(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    const componentExtensions = [
      ...this.Config.COMPONENT_FILE_EXTENSIONS,
    ] as string[];
    return CheckerUtils.findFilesByExtension(
      srcPath,
      componentExtensions,
      config
    );
  }

  /**
   * Validate all selector files for memoization compliance
   */
  private static validateAllSelectorFiles(
    selectorFiles: string[],
    violations: string[],
    suggestions: string[]
  ): void {
    for (const selectorFile of selectorFiles) {
      this.validateSingleSelectorFile(selectorFile, violations, suggestions);
    }
  }

  /**
   * Validate a single selector file
   */
  private static validateSingleSelectorFile(
    selectorFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(
      selectorFile,
      this.Config.FILE_READ_OPTIONS
    );

    if (!content) return;

    const fileName = PathOperations.getBasename(selectorFile);
    const analysis = this.Config.analyzeSelectorMemoizationPatterns(content);

    // Apply all selector validation checks
    this.validateDirectStateAccess(analysis, fileName, violations, suggestions);
    this.validateCreateSelectorUsage(analysis, content, fileName, suggestions);
    this.validateSelectorImports(analysis, fileName, violations, suggestions);
    this.validateSelectorComposition(analysis, fileName, suggestions);
  }

  /**
   * Validate direct state access patterns
   */
  private static validateDirectStateAccess(
    analysis: typeof this.SelectorAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    // A raw exported selector is an anti-pattern even if other selectors in the
    // same file do use createSelector (e.g. mid-migration), so this fires on the
    // raw-selector signal alone — the pattern only matches top-level raw
    // selectors, never createSelector() projectors.
    if (analysis.hasDirectStateAccess) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.DIRECT_STATE_ACCESS,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.WRAP_WITH_SELECTOR,
          fileName
        )
      );
    }
  }

  /**
   * Validate createSelector usage
   */
  private static validateCreateSelectorUsage(
    analysis: typeof this.SelectorAnalysis,
    content: string,
    fileName: string,
    suggestions: string[]
  ): void {
    if (!analysis.hasCreateSelector) return;

    // Check feature selector usage
    if (analysis.hasSingleParamSelectors) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_FEATURE_SELECTOR,
          fileName
        )
      );
    }

    // Check complex computations
    if (analysis.hasComplexComputations) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.OPTIMIZE_COMPLEX_SELECTOR,
          fileName
        )
      );
    }
  }

  /**
   * Validate selector imports
   */
  private static validateSelectorImports(
    analysis: typeof this.SelectorAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!analysis.hasProperImports) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.MISSING_STORE_IMPORT,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.IMPORT_FROM_STORE,
          fileName
        )
      );
    }
  }

  /**
   * Validate selector composition
   */
  private static validateSelectorComposition(
    analysis: typeof this.SelectorAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.needsComposition) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.COMPOSE_SELECTORS,
          fileName
        )
      );
    }
  }

  /**
   * Validate all component files for selector usage
   */
  private static validateAllComponentFiles(
    componentFiles: string[],
    violations: string[],
    suggestions: string[]
  ): void {
    for (const componentFile of componentFiles) {
      this.validateSingleComponentFile(componentFile, violations, suggestions);
    }
  }

  /**
   * Validate a single component file
   */
  private static validateSingleComponentFile(
    componentFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(
        componentFile,
        this.Config.COMPONENT_FILE_READ_OPTIONS
      );
      const fileName = PathOperations.getBasename(componentFile);

      const analysis = this.Config.analyzeComponentSelectorPatterns(content);

      // Apply all component validation checks
      this.validateDirectStoreSelect(
        analysis,
        content,
        fileName,
        violations,
        suggestions
      );
      this.validateMultipleSubscriptions(analysis, fileName, suggestions);
      this.validateUnsubscribedSelectors(analysis, fileName, suggestions);
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  /**
   * Validate direct store.select usage
   */
  private static validateDirectStoreSelect(
    analysis: typeof this.ComponentAnalysis,
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (analysis.hasValidDirectSelects) return;

    const directSelects = this.Config.findDirectSelects(content);
    if (!directSelects) return;

    // Check each direct select for validity
    for (const select of directSelects) {
      if (this.Config.isInvalidDirectSelect(select)) {
        violations.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.DIRECT_STORE_SELECT,
            fileName
          )
        );
        suggestions.push(
          this.Config.buildMessage(
            this.Config.VALIDATION_MESSAGES.USE_MEMOIZED_SELECTORS,
            fileName
          )
        );
        break;
      }
    }
  }

  /**
   * Validate multiple subscriptions
   */
  private static validateMultipleSubscriptions(
    analysis: typeof this.ComponentAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.hasTooManySubscriptions) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.USE_ASYNC_PIPE,
          fileName
        )
      );
    }
  }

  /**
   * Validate unsubscribed selectors
   */
  private static validateUnsubscribedSelectors(
    analysis: typeof this.ComponentAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.needsCleanup) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.ENSURE_CLEANUP,
          fileName
        )
      );
    }
  }

  /**
   * Comprehensive selector file analysis
   */
  static analyzeSelectorFileComprehensive(selectorFile: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validateSingleSelectorFile(selectorFile, violations, suggestions);

    return { violations, suggestions };
  }

  /**
   * Comprehensive component file analysis
   */
  static analyzeComponentFileComprehensive(componentFile: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validateSingleComponentFile(componentFile, violations, suggestions);

    return { violations, suggestions };
  }
}
