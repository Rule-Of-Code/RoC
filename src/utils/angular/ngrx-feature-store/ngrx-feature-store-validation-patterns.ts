import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxFeatureStoreConfiguration } from './ngrx-feature-store-configuration';

/**
 * Feature analysis structure for NgRx stores
 */
interface FeatureAnalysisResult {
  featureName: string;
  hasStateDir: boolean;
  stateDir: string;
  missingFiles: string[];
  optionalFiles: string[];
  typeScriptFiles?: string[];
  actionFiles?: string[];
  reducerFiles?: string[];
  selectorFiles?: string[];
}

/**
 * Validation patterns utility for NgRx Feature Store Structure Analysis
 * Provides comprehensive feature store validation workflow and pattern matching
 */
export class NgRxFeatureStoreValidationPatterns {
  /**
   * Class-level alias for Configuration
   */
  private static readonly Config = NgRxFeatureStoreConfiguration;

  /**
   * Cached validation messages
   */
  private static readonly Messages = this.Config.getValidationMessages();

  /**
   * Validate all NgRx feature store structure patterns
   */
  static validateAllFeatureStorePatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find all potential feature directories
    const allDirectories = this.Config.findPotentialFeatureDirectories(
      projectRoot,
      config
    );

    // Filter for actual feature directories
    const featureDirectories = allDirectories.filter(dir =>
      this.Config.hasFeatureIndicators(dir, config)
    );

    // Handle case where no features are found
    if (featureDirectories.length === 0) {
      suggestions.push(this.Messages.CREATE_FEATURE_DIRECTORIES);
      return { violations, suggestions };
    }

    // Validate each feature directory
    for (const featureDir of featureDirectories) {
      this.validateSingleFeature(featureDir, config, violations, suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Validate a single feature directory structure
   */
  private static validateSingleFeature(
    featureDir: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    const analysis = this.Config.analyzeFeatureStructure(featureDir, config);

    // Check for +state directory
    if (!analysis.hasStateDir) {
      violations.push(this.Messages.MISSING_PLUS_STATE(analysis.featureName));
      suggestions.push(this.Messages.CREATE_PLUS_STATE(analysis.featureName));
      return;
    }

    // Validate required files
    this.validateRequiredFiles(analysis, violations, suggestions);

    // Suggest optional files
    this.suggestOptionalFiles(analysis, suggestions);
  }

  /**
   * Validate required files in feature store
   */
  private static validateRequiredFiles(
    analysis: FeatureAnalysisResult,
    violations: string[],
    suggestions: string[]
  ): void {
    for (const fileName of analysis.missingFiles) {
      violations.push(
        this.Messages.MISSING_REQUIRED_FILE(fileName, analysis.featureName)
      );
      suggestions.push(
        this.Messages.CREATE_REQUIRED_FILE(fileName, analysis.featureName)
      );
    }
  }

  /**
   * Suggest optional files for better architecture
   */
  private static suggestOptionalFiles(
    analysis: FeatureAnalysisResult,
    suggestions: string[]
  ): void {
    for (const fileName of analysis.optionalFiles) {
      suggestions.push(
        this.Messages.CONSIDER_OPTIONAL_FILE(fileName, analysis.featureName)
      );
    }
  }
}
