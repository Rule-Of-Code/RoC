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
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const notRead: string[] = [];

    // Check angular.json configuration using centralized patterns. An
    // angular.json that does not parse is not read as `{}`: that judged an
    // empty workspace and found nothing wrong with it (#423).
    const angularJsonPath = PathOperations.join(
      projectRoot,
      CONFIG_FILES.ANGULAR_JSON
    );
    if (FileUtils.exists(angularJsonPath)) {
      let angularConfig: Record<string, unknown> | null = null;
      try {
        angularConfig =
          FileSystemOperations.readJsonFile<Record<string, unknown>>(
            angularJsonPath
          );
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        notRead.push(
          `${CONFIG_FILES.ANGULAR_JSON} could not be read: ${reason}`
        );
      }
      if (angularConfig) {
        AngularBundleValidationPatterns.validateBuildConfiguration(
          angularConfig,
          violations,
          suggestions
        );
      }
    }

    // Validate bundle analyzer, performance budgets, and webpack using patterns
    AngularBundleValidationPatterns.validateBundleAnalyzer(
      projectRoot,
      suggestions
    );
    AngularBundleValidationPatterns.validatePerformanceBudgets(
      projectRoot,
      suggestions,
      notRead
    );
    AngularBundleValidationPatterns.validateWebpackConfiguration(
      projectRoot,
      suggestions,
      notRead
    );

    // What was not read is said, once per file: the build configuration and
    // budgets it may hold were not judged, and they do not pass either.
    const unread = [
      ...new Map(
        notRead.map(note => [note.split(' could not be read')[0], note])
      ).values(),
    ];
    if (unread.length > 0) {
      violations.push(
        `${unread.join('; ')} — its build configuration and performance budgets were NOT read, so they were not judged`
      );
    }

    return { violations, suggestions };
  }
}
