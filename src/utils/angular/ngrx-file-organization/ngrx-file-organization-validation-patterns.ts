import type { RuleOfCodeConfig } from '../../../config/types';
import { CheckerUtils } from '../../checker-utils';
import { DIRECTORY_NAMES, NGRX_KEYWORDS } from '../../constants';
import { DirectoryScanner } from '../../directory-scanner';
import { PathOperations } from '../../path-operations';
import type { FileEntry } from './ngrx-file-organization-configuration';
import { NgRxFileOrganizationConfiguration } from './ngrx-file-organization-configuration';

/**
 * State directory analysis result for NgRx file organization
 */
interface StateDirectoryAnalysisResult {
  featureName: string;
  hasBarrelExport: boolean;
  typeScriptFiles: FileEntry[];
  hasTestFiles: boolean;
  actionFiles: FileEntry[];
  reducerFiles: FileEntry[];
  selectorFiles: FileEntry[];
}

/**
 * Validation patterns utility for NgRx File Organization Analysis
 * Provides comprehensive file organization validation workflow and pattern matching
 */
export class NgRxFileOrganizationValidationPatterns {
  /**
   * Class-level alias for Configuration
   */
  private static readonly Config = NgRxFileOrganizationConfiguration;

  /**
   * Cached validation messages
   */
  private static readonly Messages = this.Config.getValidationMessages();

  /**
   * Validate all NgRx file organization patterns
   */
  static validateAllFileOrganizationPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find all +state directories using both approaches for comprehensive coverage
    const stateDirectories = this.findStateDirectoriesWithChecker(
      projectRoot,
      config
    );

    // Process each state directory
    for (const stateDir of stateDirectories) {
      this.validateSingleStateDirectory(
        stateDir,
        config,
        violations,
        suggestions
      );
    }

    return { violations, suggestions };
  }

  /**
   * Find +state directories using CheckerUtils integration
   */
  private static findStateDirectoriesWithChecker(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use configuration utility approach
    const configDirectories = this.Config.findStateDirectories(
      projectRoot,
      config
    );

    // Use CheckerUtils approach for additional coverage
    const srcPath = PathOperations.join(projectRoot, DIRECTORY_NAMES.SRC);
    const checkerDirectories = CheckerUtils.findDirectories(srcPath, config);
    const stateDirectories = checkerDirectories.filter(
      dir => PathOperations.getBasename(dir) === NGRX_KEYWORDS.PLUS_STATE_FOLDER
    );

    // Combine and deduplicate
    return [...new Set([...configDirectories, ...stateDirectories])];
  }

  /**
   * Validate a single +state directory
   */
  private static validateSingleStateDirectory(
    stateDir: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const files = DirectoryScanner.safeReadDirectory(
        stateDir,
        config
      ) as FileEntry[];

      const analysis = this.Config.analyzeStateDirectoryStructure(
        stateDir,
        files
      );

      // Validate barrel exports
      this.validateBarrelExports(analysis, violations, suggestions);

      // Validate file naming conventions
      this.validateFileNaming(analysis, suggestions);

      // Validate test files presence
      this.validateTestFiles(analysis, suggestions);

      // Validate separation of concerns
      this.validateSeparationOfConcerns(analysis, suggestions);
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Validate barrel exports (index.ts)
   */
  private static validateBarrelExports(
    analysis: StateDirectoryAnalysisResult,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!analysis.hasBarrelExport) {
      violations.push(
        this.Messages.MISSING_BARREL_EXPORT(analysis.featureName)
      );
      suggestions.push(
        this.Messages.CREATE_BARREL_EXPORT(analysis.featureName)
      );
    }
  }

  /**
   * Validate file naming conventions
   */
  private static validateFileNaming(
    analysis: StateDirectoryAnalysisResult,
    suggestions: string[]
  ): void {
    for (const file of analysis.typeScriptFiles) {
      const fileName = file.name;

      // Check if file has proper NgRx suffix
      if (!this.Config.hasValidNgRxSuffix(fileName)) {
        suggestions.push(
          this.Messages.IMPROPER_FILE_NAMING(fileName, analysis.featureName)
        );
      }

      // Check if file has proper feature name prefix
      if (
        this.Config.shouldHaveFeaturePrefix(fileName) &&
        !fileName.startsWith(analysis.featureName)
      ) {
        suggestions.push(
          this.Messages.MISSING_FEATURE_PREFIX(fileName, analysis.featureName)
        );
      }
    }
  }

  /**
   * Validate test files presence
   */
  private static validateTestFiles(
    analysis: StateDirectoryAnalysisResult,
    suggestions: string[]
  ): void {
    if (!analysis.hasTestFiles) {
      suggestions.push(this.Messages.CONSIDER_TEST_FILES(analysis.featureName));
    }
  }

  /**
   * Validate proper separation of concerns
   */
  private static validateSeparationOfConcerns(
    analysis: StateDirectoryAnalysisResult,
    suggestions: string[]
  ): void {
    // Check for multiple files of the same type
    if (analysis.actionFiles.length > 1) {
      suggestions.push(
        this.Messages.MULTIPLE_ACTION_FILES(analysis.featureName)
      );
    }

    if (analysis.reducerFiles.length > 1) {
      suggestions.push(
        this.Messages.MULTIPLE_REDUCER_FILES(analysis.featureName)
      );
    }

    if (analysis.selectorFiles.length > 1) {
      suggestions.push(
        this.Messages.MULTIPLE_SELECTOR_FILES(analysis.featureName)
      );
    }
  }

  /**
   * Process state directory with comprehensive validation
   */
  static processStateDirectoryComprehensive(
    stateDir: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    this.validateSingleStateDirectory(
      stateDir,
      config,
      violations,
      suggestions
    );

    return { violations, suggestions };
  }
}
