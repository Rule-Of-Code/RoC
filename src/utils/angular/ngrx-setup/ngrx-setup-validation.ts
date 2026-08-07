import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxFeatureStoreStructureAnalyzer } from '../ngrx-feature-store';
// Direct file import (not the '../ngrx-module' barrel) to avoid an import cycle.
import { NgRxModuleAnalyzer } from '../ngrx-module/ngrx-module-analyzer';
import { NgRxAnalysisUtilities } from '../shared-ngrx-utilities';
import { NgRxSetupConfiguration } from './ngrx-setup-configuration';

/**
 * NgRx Setup Validation Utility
 * Single Responsibility: Orchestrate NgRx setup and configuration analysis workflow
 * RULE 2: Delegates to specialized analyzers and caches configuration references
 */
export class NgRxSetupValidation {
  /**
   * RULE 2: Configuration alias for caching (avoids repeated method calls)
   */
  private static readonly Config = NgRxSetupConfiguration;

  /**
   * Validate prerequisites for NgRx setup analysis
   */
  private static validatePrerequisites(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): {
    valid: boolean;
    errors?: string[];
    packageJson?: Record<string, unknown>;
  } {
    const errors: string[] = [];

    if (!projectRoot) {
      errors.push('Project root path is required');
      return { valid: false, errors };
    }

    const packageJson = this.Config.getPackageJsonData(projectRoot);
    if (!packageJson) {
      errors.push(this.Config.VALIDATION_MESSAGES.PACKAGE_JSON_NOT_FOUND);
      return { valid: false, errors };
    }

    return { valid: true, packageJson: packageJson as Record<string, unknown> };
  }

  /**
   * Execute complete NgRx setup analysis workflow
   */
  static executeAnalysisWorkflow(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // RULE 1: Use unified prerequisite validation helper
    const prerequisiteCheck = this.validatePrerequisites(projectRoot, config);

    if (!prerequisiteCheck.valid) {
      violations.push(...(prerequisiteCheck.errors ?? []));
      return { violations, suggestions };
    }

    // Execute comprehensive setup analysis
    const { packageJson } = prerequisiteCheck;
    if (!packageJson) {
      return { violations, suggestions };
    }
    this.executeSetupAnalysis(
      projectRoot,
      packageJson,
      config,
      violations,
      suggestions
    );

    return NgRxAnalysisUtilities.deduplicateResults({
      violations,
      suggestions,
    });
  }

  /**
   * Execute comprehensive NgRx setup analysis
   * RULE 2: Optimized with cached configuration references
   */
  private static executeSetupAnalysis(
    projectRoot: string,
    packageJson: Record<string, unknown>,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    // RULE 2: Use cached analysis configuration
    // Analyze NgRx dependencies using configuration method
    const dependencyResults = this.Config.analyzeDependencies(packageJson);
    suggestions.push(...dependencyResults.suggestions);

    // Analyze app module configuration using specialized analyzer
    const moduleResults = NgRxModuleAnalyzer.analyze(
      projectRoot,
      dependencyResults.dependencies
    );
    violations.push(...moduleResults.violations);
    suggestions.push(...moduleResults.suggestions);

    // Analyze feature store structure
    this.analyzeFeatureStoreStructure(projectRoot, config, suggestions);
  }

  /**
   * Analyze feature store structure using existing specialized analyzer
   * RULE 2: Delegates to specialized analyzer, caches reference
   */
  private static analyzeFeatureStoreStructure(
    projectRoot: string,
    config: RuleOfCodeConfig,
    suggestions: string[]
  ): void {
    const featureStoreAnalysis =
      NgRxFeatureStoreStructureAnalyzer.checkFeatureStoreStructure(
        projectRoot,
        config
      );
    suggestions.push(...featureStoreAnalysis.suggestions);
  }

  /**
   * Get comprehensive setup analysis summary
   * RULE 1: Delegates to configuration method (100% coverage via Config)
   */
  /**
   * Generate setup analysis summary - delegates to shared utility
   */
  static getSetupAnalysisSummary =
    NgRxAnalysisUtilities.getSetupAnalysisSummary;

  /**
   * Validate analysis prerequisites
   * RULE 1: Delegates to configuration method (100% coverage)
   */
  static validateAnalysisPrerequisites(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { canProceed: boolean; issues: string[] } {
    // RULE 1: Use unified prerequisite validation
    const prerequisiteCheck = this.validatePrerequisites(projectRoot, config);

    const issues = prerequisiteCheck.errors ?? [];

    return {
      canProceed: prerequisiteCheck.valid,
      issues,
    };
  }

  // ============================================
  // Legacy API - Deprecated, use specialized analyzers
  // ============================================

  /**
   * @deprecated Use NgRxSetupConfiguration.analyzeDependencies() instead
   */
  static analyzeDependencies(packageJson: Record<string, unknown>) {
    return NgRxSetupConfiguration.analyzeDependencies(packageJson);
  }

  /**
   * @deprecated Use NgRxModuleAnalyzer.analyze() instead
   */
  static analyzeAppModuleConfiguration(
    projectRoot: string,
    dependencies: {
      hasStore: boolean;
      hasEffects: boolean;
      hasDevTools: boolean;
    },
    violations: string[],
    suggestions: string[]
  ): void {
    const results = NgRxModuleAnalyzer.analyze(projectRoot, dependencies);
    violations.push(...results.violations);
    suggestions.push(...results.suggestions);
  }
}
