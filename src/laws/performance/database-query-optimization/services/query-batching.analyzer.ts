import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { DatabaseQueryOptimizationCheckConstants } from '../constants';
import { DatabaseQueryOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * QueryBatchingAnalyzerService
 *
 * Responsibility:
 * - Analyze query batching implementation
 * - Verify batch(), writeBatch(), or commitBatch() usage
 */
export class QueryBatchingAnalyzerService {
  /**
   * Analyze query batching implementation
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { implemented: boolean } {
    return DatabaseQueryOptimizationBaseAnalyzer.analyzePattern(
      projectRoot,
      config,
      content =>
        DatabaseQueryOptimizationCheckConstants.hasQueryBatching(content)
    );
  }
}
