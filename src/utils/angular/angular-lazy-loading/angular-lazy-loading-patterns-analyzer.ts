import type { RuleOfCodeConfig } from '../../../config/types';
import { PathOperations } from '../../path-operations';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { AngularLazyLoadingConfiguration } from './angular-lazy-loading-configuration';
import { AngularLazyLoadingValidationPatterns } from './angular-lazy-loading-validation-patterns';
/**
 * Angular Lazy Loading Patterns Analyzer
 * Specialized utility for analyzing Angular lazy loading implementation patterns
 */
export class AngularLazyLoadingPatternsAnalyzer extends AngularConfigurationBase {
  /**
   * Check for lazy loading patterns
   * Meta-dogfooding: Uses centralized configuration and delegated validation
   */
  static checkLazyLoadingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const { violations, suggestions } =
      AngularLazyLoadingPatternsAnalyzer.initializeAnalysis(
        projectRoot,
        ['.ts'],
        config
      );

    AngularLazyLoadingValidationPatterns.validateAllLazyLoadingPatterns(
      PathOperations.join(
        projectRoot,
        AngularLazyLoadingConfiguration.DIRECTORIES.SRC
      ),
      config,
      violations,
      suggestions
    );

    return { violations, suggestions };
  }
}
