import type { RuleOfCodeConfig } from '../../../config/types';
import { CONFIG_FILES } from '../../constants';
import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularBundleValidationPatterns } from './angular-bundle-validation-patterns';

/**
 * Angular Bundle Optimization Analyzer
 * Specialized utility for analyzing Angular bundle optimization patterns
 * Meta-dogfooding: Uses centralized validation patterns and configuration utilities
 */
export class AngularBundleOptimizationAnalyzer {
  /**
   * Check for bundle optimization
   * Meta-dogfooding: Uses centralized validation patterns and delegates to specialized utilities
   */
  static checkBundleOptimization(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check angular.json configuration using centralized patterns
    const angularJsonPath = PathOperations.join(
      projectRoot,
      CONFIG_FILES.ANGULAR_JSON
    );
    if (FileUtils.exists(angularJsonPath)) {
      const angularConfig = FileSystemOperations.readJsonFile(angularJsonPath, {
        fallbackToEmpty: true,
      });

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );
    }

    // Validate bundle analyzer, performance budgets, and webpack using patterns
    AngularBundleValidationPatterns.validateBundleAnalyzer(
      projectRoot,
      suggestions
    );
    AngularBundleValidationPatterns.validatePerformanceBudgets(
      projectRoot,
      suggestions
    );
    AngularBundleValidationPatterns.validateWebpackConfiguration(
      projectRoot,
      suggestions
    );

    // Check source code optimization using specialized patterns
    AngularBundleValidationPatterns.validateSourceCodeOptimization(
      projectRoot,
      config,
      violations,
      suggestions
    );

    return { violations, suggestions };
  }
}
