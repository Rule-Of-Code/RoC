import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { DatabaseQueryOptimizationCheckConstants } from '../constants';
import { DatabaseQueryOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * PaginationAnalyzerService
 *
 * Responsibility:
 * - Analyze pagination implementation
 * - Verify startAfter(), startAt(), endAt(), or endBefore() usage
 */
export class PaginationAnalyzerService {
  /**
   * Analyze pagination implementation
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { implemented: boolean } {
    return DatabaseQueryOptimizationBaseAnalyzer.analyzePattern(
      projectRoot,
      config,
      content => DatabaseQueryOptimizationCheckConstants.hasPagination(content)
    );
  }
}
