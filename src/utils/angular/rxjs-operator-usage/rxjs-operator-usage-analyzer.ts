import type { RuleOfCodeConfig } from '../../../config/types';
import { RxJSOperatorUsageValidation } from './rxjs-operator-usage-validation';

/**
 * RxJS Operator Usage Analyzer
 * Specialized utility for analyzing RxJS operator usage in NgRx effects
 */
export class RxJSOperatorUsageAnalyzer {
  /**
   * Check operator usage patterns
   */
  static checkOperatorUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    return RxJSOperatorUsageValidation.executeAnalysisWorkflow(
      projectRoot,
      config
    );
  }
}
