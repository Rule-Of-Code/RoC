/**
 * DatabaseQueryOptimizationCheckConstants
 *
 * Configuration for all database query optimization checks.
 * Defines patterns, thresholds, and scoring for different optimization techniques.
 */
export class DatabaseQueryOptimizationCheckConstants {
  // Firestore optimization patterns
  static readonly FIRESTORE_OPTIMIZATION_PATTERNS = {
    LIMIT: /limit\(/i,
    ORDER_BY: /orderBy\(/i,
    WHERE: /where\(/i,
  };

  // Query batching patterns
  static readonly BATCH_PATTERNS = {
    BATCH: /batch\(\)/i,
    WRITE_BATCH: /writeBatch/i,
    COMMIT_BATCH: /commitBatch/i,
  };

  // Pagination patterns
  static readonly PAGINATION_PATTERNS = {
    START_AFTER: /startAfter\(/i,
    START_AT: /startAt\(/i,
    END_AT: /endAt\(/i,
    END_BEFORE: /endBefore\(/i,
  };

  // Caching patterns
  static readonly CACHING_PATTERNS = {
    ENABLE_NETWORK: /enableNetwork/i,
    DISABLE_NETWORK: /disableNetwork/i,
    CACHE: /cache/i,
    PERSISTENT_CACHE: /persistentCache/i,
  };

  // Caching libraries
  static readonly CACHING_LIBRARIES = [
    '@ngrx/entity',
    'apollo-cache',
    'rxjs-cache',
  ];

  // N+1 prevention patterns (positive indicators)
  static readonly N_PLUS_ONE_PREVENTION = {
    GET_ALL: /getAll\(/i,
    BATCH: /batch/i,
    IN_ARRAY: /in array/i,
    ARRAY_CONTAINS: /arrayContains/i,
  };

  // Scoring weights for each check
  static readonly SCORE_DEDUCTIONS = {
    FIRESTORE: 25,
    INDEXING: 20,
    BATCHING: 20,
    PAGINATION: 15,
    CACHING: 10,
    N_PLUS_ONE: 10,
  };

  /**
   * Check if content has Firestore optimization patterns
   */
  static hasFirestoreOptimization(content: string): boolean {
    return (
      DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.LIMIT.test(
        content
      ) &&
      DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.ORDER_BY.test(
        content
      ) &&
      DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.WHERE.test(
        content
      )
    );
  }

  /**
   * Check if content has query batching
   */
  static hasQueryBatching(content: string): boolean {
    return [
      DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.BATCH,
      DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.WRITE_BATCH,
      DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.COMMIT_BATCH,
    ].some(pattern => pattern.test(content));
  }

  /**
   * Check if content has pagination implementation
   */
  static hasPagination(content: string): boolean {
    return [
      DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AFTER,
      DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AT,
      DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_AT,
      DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_BEFORE,
    ].some(pattern => pattern.test(content));
  }

  /**
   * Check if content has caching implementation
   */
  static hasCaching(content: string): boolean {
    return [
      DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.ENABLE_NETWORK,
      DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.DISABLE_NETWORK,
      DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.CACHE,
      DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.PERSISTENT_CACHE,
    ].some(pattern => pattern.test(content));
  }

  /**
   * Check if content has N+1 prevention
   */
  static hasNPlusOnePrevention(content: string): boolean {
    return [
      DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.GET_ALL,
      DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.BATCH,
      DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.IN_ARRAY,
      DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION
        .ARRAY_CONTAINS,
    ].some(pattern => pattern.test(content));
  }

  /**
   * Get score deduction for check
   */
  static getScoreDeduction(checkType: string): number {
    const key =
      checkType.toUpperCase() as keyof typeof DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS;
    return DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS[key] || 0;
  }
}
