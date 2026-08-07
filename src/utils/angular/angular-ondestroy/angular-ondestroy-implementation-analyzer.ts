import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { AngularOnDestroyConfiguration } from './angular-ondestroy-configuration';
import { AngularOnDestroyValidationPatterns } from './angular-ondestroy-validation-patterns';
/**
 * Angular OnDestroy Implementation Analyzer
 * Specialized utility for analyzing OnDestroy implementation patterns
 */
export class AngularOnDestroyImplementationAnalyzer {
  /**
   * Check for OnDestroy implementation
   * Meta-dogfooding: Uses centralized configuration and delegated validation
   */
  static checkOnDestroyImplementation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const srcPath = PathOperations.join(
      projectRoot,
      AngularOnDestroyConfiguration.DIRECTORIES.SRC
    );
    if (!FileUtils.exists(srcPath)) {
      return { violations, suggestions };
    }

    AngularOnDestroyValidationPatterns.validateAllOnDestroyPatterns(
      srcPath,
      config,
      violations,
      suggestions
    );

    return { violations, suggestions };
  }
}
