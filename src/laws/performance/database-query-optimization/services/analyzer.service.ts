import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { FirestoreOptimizationAnalyzerService } from './firestore-optimization.analyzer';
import { IndexingAnalyzerService } from './indexing.analyzer';
import { NPlusOneAnalyzerService } from './nplus-one.analyzer';
import { PaginationAnalyzerService } from './pagination.analyzer';
import { QueryBatchingAnalyzerService } from './query-batching.analyzer';
import { QueryCachingAnalyzerService } from './query-caching.analyzer';

/**
 * DatabaseQueryOptimizationAnalyzerService
 *
 * Coordinator Service
 * Responsibilities:
 * - Coordinate all specialized analyzers
 * - Aggregate results from individual analysis services
 * - Provide unified interface for Law check
 */
export class DatabaseQueryOptimizationAnalyzerService {
  /**
   * Analyze Firestore optimization
   */
  static analyzeFirestoreOptimization(projectRoot: string): {
    optimized: boolean;
  } {
    return FirestoreOptimizationAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze indexing configuration
   */
  static analyzeIndexingConfiguration(projectRoot: string): {
    configured: boolean;
  } {
    return IndexingAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze query batching implementation
   */
  static analyzeQueryBatching(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    implemented: boolean;
  } {
    return QueryBatchingAnalyzerService.analyze(projectRoot, config);
  }

  /**
   * Analyze pagination implementation
   */
  static analyzePaginationImplementation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    implemented: boolean;
  } {
    return PaginationAnalyzerService.analyze(projectRoot, config);
  }

  /**
   * Analyze query caching
   */
  static analyzeQueryCaching(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    implemented: boolean;
  } {
    return QueryCachingAnalyzerService.analyze(projectRoot, config);
  }

  /**
   * Analyze N+1 query prevention
   */
  static analyzeNPlusOneQueryPrevention(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    addressed: boolean;
  } {
    return NPlusOneAnalyzerService.analyze(projectRoot, config);
  }
}
