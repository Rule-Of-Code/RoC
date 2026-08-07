import type { RuleOfCodeConfig } from '../../../config/types';
import type { AnalysisResult } from '../rxjs-operator-usage';
import { NgRxEffectPatternsValidation } from './ngrx-effect-patterns-validation';

/**
 * NgRx Effect Patterns Analyzer
 * Specialized utility for analyzing effect implementation patterns in NgRx
 */
export class NgRxEffectPatternsAnalyzer {
  /**
   * Check effect implementation patterns
   */
  static checkEffectPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AnalysisResult {
    return NgRxEffectPatternsValidation.validateAllEffectPatterns(
      projectRoot,
      config
    );
  }
}
