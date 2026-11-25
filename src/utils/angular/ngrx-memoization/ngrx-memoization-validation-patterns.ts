import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES } from '../../constants';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { NgRxDirectStoreSelect } from './ngrx-direct-store-select';
import { NgRxMemoizationConfiguration } from './ngrx-memoization-configuration';

/**
 * Validation patterns utility for NgRx Memoization Compliance Analysis
 * Provides comprehensive memoization validation workflow and pattern matching
 */
export class NgRxMemoizationValidationPatterns extends AngularConfigurationBase {
  /**
   * Class-level alias for Configuration to reduce verbosity
   */
  private static readonly config = NgRxMemoizationConfiguration;

  /**
   * Type alias for selector analysis result
   */
  private static readonly selectorAnalysis = Object.create(null) as Record<
    string,
    unknown
  >;

  /**
   * Type alias for component analysis result
   */
  private static readonly componentAnalysis = Object.create(null) as Record<
    string,
    unknown
  >;

  /**
   * Validate all NgRx memoization compliance patterns.
   *
   * The law runs this twice, the second time through the selector patterns
   * analyzer, which passes `directSelects: false`: a direct store.select is
   * one finding, not two (#612). `notRead` holds the component files whose
   * store.select calls could not be read, and is absent when there are none.
   */
  static validateAllMemoizationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig,
    { directSelects = true }: { directSelects?: boolean } = {}
  ): { violations: string[]; suggestions: string[]; notRead?: string[] } {
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
    this.validateAllComponentFiles(componentFiles, suggestions);
    if (!directSelects) return { violations, suggestions };

    const notRead = this.validateDirectStoreSelects(
      projectRoot,
      componentFiles,
      violations,
      suggestions
    );
    return notRead.length > 0
      ? { violations, suggestions, notRead }
      : { violations, suggestions };
  }

  /**
   * Find selector files using CheckerUtils integration
   */
  private static findSelectorFilesWithChecker(
    srcPath: string,
    config: RuleOfCodeConfig
  ): string[] {
    const selectorExtensions = [
      ...this.config.SELECTOR_FILE_EXTENSIONS,
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
      ...this.config.COMPONENT_FILE_EXTENSIONS,
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
      this.config.FILE_READ_OPTIONS
    );

    if (!content) return;

    const fileName = PathOperations.getBasename(selectorFile);
    const analysis = this.config.analyzeSelectorMemoizationPatterns(content);

    // Apply all selector validation checks
    this.validateDirectStateAccess(analysis, fileName, violations, suggestions);
    this.validateCreateSelectorUsage(analysis, fileName, suggestions);
    this.validateSelectorImports(analysis, fileName, violations, suggestions);
    this.validateSelectorComposition(analysis, fileName, suggestions);
  }

  /**
   * Validate direct state access patterns
   */
  private static validateDirectStateAccess(
    analysis: typeof this.selectorAnalysis,
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
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.DIRECT_STATE_ACCESS,
          fileName
        )
      );
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.WRAP_WITH_SELECTOR,
          fileName
        )
      );
    }
  }

  /**
   * Validate createSelector usage
   */
  private static validateCreateSelectorUsage(
    analysis: typeof this.selectorAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (!analysis.hasCreateSelector) return;

    // Check feature selector usage
    if (analysis.hasSingleParamSelectors) {
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.USE_FEATURE_SELECTOR,
          fileName
        )
      );
    }

    // Check complex computations
    if (analysis.hasComplexComputations) {
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.OPTIMIZE_COMPLEX_SELECTOR,
          fileName
        )
      );
    }
  }

  /**
   * Validate selector imports
   */
  private static validateSelectorImports(
    analysis: typeof this.selectorAnalysis,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!analysis.hasProperImports) {
      violations.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.MISSING_STORE_IMPORT,
          fileName
        )
      );
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.IMPORT_FROM_STORE,
          fileName
        )
      );
    }
  }

  /**
   * Validate selector composition
   */
  private static validateSelectorComposition(
    analysis: typeof this.selectorAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.needsComposition) {
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.COMPOSE_SELECTORS,
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
    suggestions: string[]
  ): void {
    for (const componentFile of componentFiles) {
      this.validateSingleComponentFile(componentFile, suggestions);
    }
  }

  /**
   * Validate a single component file
   */
  private static validateSingleComponentFile(
    componentFile: string,
    suggestions: string[]
  ): void {
    try {
      const content = FileUtils.readFile(
        componentFile,
        this.config.COMPONENT_FILE_READ_OPTIONS
      );
      const fileName = PathOperations.getBasename(componentFile);

      const analysis = this.config.analyzeComponentSelectorPatterns(content);

      // Apply all component validation checks
      this.validateMultipleSubscriptions(analysis, fileName, suggestions);
      this.validateUnsubscribedSelectors(analysis, fileName, suggestions);
    } catch (_error) {
      // Skip files that can't be read
    }
  }

  /**
   * Report the component files that call store.select without a selector,
   * once per file. Returns the notes for the files that were not read.
   */
  private static validateDirectStoreSelects(
    projectRoot: string,
    componentFiles: readonly string[],
    violations: string[],
    suggestions: string[]
  ): string[] {
    const { direct, notRead } = NgRxDirectStoreSelect.readFiles(
      projectRoot,
      componentFiles
    );
    const messages = this.config.VALIDATION_MESSAGES;
    for (const file of direct) {
      const name = PathOperations.getBasename(file);
      violations.push(
        this.config.buildMessage(messages.DIRECT_STORE_SELECT, name)
      );
      suggestions.push(
        this.config.buildMessage(messages.USE_MEMOIZED_SELECTORS, name)
      );
    }
    return notRead;
  }

  /**
   * Validate multiple subscriptions
   */
  private static validateMultipleSubscriptions(
    analysis: typeof this.componentAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.hasTooManySubscriptions) {
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.USE_ASYNC_PIPE,
          fileName
        )
      );
    }
  }

  /**
   * Validate unsubscribed selectors
   */
  private static validateUnsubscribedSelectors(
    analysis: typeof this.componentAnalysis,
    fileName: string,
    suggestions: string[]
  ): void {
    if (analysis.needsCleanup) {
      suggestions.push(
        this.config.buildMessage(
          this.config.VALIDATION_MESSAGES.ENSURE_CLEANUP,
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
    notRead?: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validateSingleComponentFile(componentFile, suggestions);
    const notRead = this.validateDirectStoreSelects(
      PathOperations.getDirectory(componentFile),
      [componentFile],
      violations,
      suggestions
    );

    return notRead.length > 0
      ? { violations, suggestions, notRead }
      : { violations, suggestions };
  }
}
