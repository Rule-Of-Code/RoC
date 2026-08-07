import { ChangeDetectionOptimizationLaw } from '../../../checkers/performance-laws/change-detection-optimization';
import type { RuleOfCodeConfig } from '../../../config/types';
import { PerformanceBudgetComplianceLaw } from '../../../laws/performance/performance-budget-compliance';
import { ProjectTypeDetector } from '../../config/project-type-detector';
import { ANGULAR_CONSTANTS } from '../../constants';
import { AngularBundleConfiguration } from './angular-bundle-configuration';

/**
 * Angular bundle optimization validation patterns
 * Meta-dogfooding: Centralized bundle optimization validation logic
 */
export class AngularBundleValidationPatterns {
  private static readonly Config = AngularBundleConfiguration;
  /**
   * Validate angular.json build configuration
   * Meta-dogfooding: Uses centralized configuration utilities
   */
  static validateBuildConfiguration(
    angularConfig: Record<string, unknown>,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      const productionConfigs = this.Config.getProductionConfig(angularConfig);

      for (const { projectName, config } of productionConfigs) {
        this.validateProductionConfiguration(
          projectName,
          config,
          violations,
          suggestions
        );
      }
    } catch {
      const message = this.Config.VALIDATION_MESSAGES.ANGULAR_CONFIG_REVIEW();
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate production configuration for a project
   */
  private static validateProductionConfiguration(
    projectName: string,
    prodConfig: Record<string, unknown>,
    violations: string[],
    suggestions: string[]
  ): void {
    // Validate all production requirements
    Object.values(this.Config.PRODUCTION_CONFIG_REQUIREMENTS).forEach(
      requirement => {
        this.Config.validateProductionSetting(
          projectName,
          prodConfig,
          requirement,
          violations,
          suggestions
        );
      }
    );
  }

  /**
   * Validate bundle analyzer dependency
   * Meta-dogfooding: Uses ProjectTypeDetector utilities
   */
  static validateBundleAnalyzer(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
    if (!packageJson) return;

    const allDependencies = ProjectTypeDetector.getAllDependencies(packageJson);
    const hasBundleAnalyzer =
      allDependencies[ANGULAR_CONSTANTS.WEBPACK_BUNDLE_ANALYZER];

    if (!hasBundleAnalyzer) {
      const message = this.Config.VALIDATION_MESSAGES.BUNDLE_ANALYZER_MISSING();
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate performance budgets using specialized utility
   * Meta-dogfooding: Delegates to specialized performance compliance law
   */
  static validatePerformanceBudgets(
    projectRoot: string,
    suggestions: string[]
  ): void {
    try {
      // Using type assertion as temporary solution for private method access
      const law = PerformanceBudgetComplianceLaw as unknown as {
        checkAngularPerformanceBudgets: (projectRoot: string) => {
          configured: boolean;
        };
      };
      const budgetAnalysis = law.checkAngularPerformanceBudgets(projectRoot);

      if (!budgetAnalysis.configured) {
        const message =
          this.Config.VALIDATION_MESSAGES.PERFORMANCE_BUDGETS_MISSING();
        suggestions.push(message.suggestionMessage);
      }
    } catch {
      const message =
        this.Config.VALIDATION_MESSAGES.PERFORMANCE_BUDGETS_MISSING();
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate webpack configuration using specialized utility
   * Meta-dogfooding: Delegates to specialized performance compliance law
   */
  static validateWebpackConfiguration(
    projectRoot: string,
    suggestions: string[]
  ): void {
    try {
      // Using type assertion as temporary solution for private method access
      const law = PerformanceBudgetComplianceLaw as unknown as {
        checkWebpackPerformanceConfig: (projectRoot: string) => {
          configured: boolean;
          configs: string[];
        };
      };
      const webpackAnalysis = law.checkWebpackPerformanceConfig(projectRoot);

      if (!webpackAnalysis.configured) {
        const configMessage =
          this.Config.VALIDATION_MESSAGES.WEBPACK_CONFIG_MISSING();
        const limitsMessage =
          this.Config.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_LIMITS_MISSING();

        suggestions.push(configMessage.suggestionMessage);
        suggestions.push(limitsMessage.suggestionMessage);
      } else {
        // Provide informational feedback about configured webpack
        const configuredMessage =
          this.Config.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_CONFIGURED(
            webpackAnalysis.configs
          );
        suggestions.push(configuredMessage.suggestionMessage);
      }
    } catch {
      const message = this.Config.VALIDATION_MESSAGES.WEBPACK_CONFIG_MISSING();
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate source code optimization patterns
   * Meta-dogfooding: Uses specialized change detection optimization law
   */
  static validateSourceCodeOptimization(
    projectRoot: string,
    config: RuleOfCodeConfig,
    violations: string[],
    suggestions: string[]
  ): void {
    try {
      // Using type assertions as temporary solution for private method access
      const law = ChangeDetectionOptimizationLaw as unknown as {
        analyzeComponents: (
          projectRoot: string,
          config: RuleOfCodeConfig
        ) => { violations: string[]; suggestions: string[] };
        analyzeTrackByUsage: (
          projectRoot: string,
          config: RuleOfCodeConfig
        ) => { violations: string[]; suggestions: string[] };
        analyzeObservableUsage: (
          projectRoot: string,
          config: RuleOfCodeConfig
        ) => { violations: string[]; suggestions: string[] };
      };

      const componentAnalysis = law.analyzeComponents(projectRoot, config);
      violations.push(...componentAnalysis.violations);
      suggestions.push(...componentAnalysis.suggestions);

      const trackByAnalysis = law.analyzeTrackByUsage(projectRoot, config);
      violations.push(...trackByAnalysis.violations);
      suggestions.push(...trackByAnalysis.suggestions);

      const observableAnalysis = law.analyzeObservableUsage(
        projectRoot,
        config
      );
      violations.push(...observableAnalysis.violations);
      suggestions.push(...observableAnalysis.suggestions);
    } catch {
      const message = this.Config.VALIDATION_MESSAGES.SOURCE_CODE_REVIEW();
      suggestions.push(message.suggestionMessage);
    }
  }
}
