/**
 * Tests for DatabaseQueryOptimizationCheckConstants
 *
 * Tests database query optimization patterns and helper methods.
 */
import { DatabaseQueryOptimizationCheckConstants } from '../../../src/laws/performance/database-query-optimization/constants/checks';

describe('DatabaseQueryOptimizationCheckConstants', () => {
  describe('FIRESTORE_OPTIMIZATION_PATTERNS', () => {
    it('should have LIMIT pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS
          .LIMIT
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.LIMIT.test(
          'limit('
        )
      ).toBe(true);
    });

    it('should have ORDER_BY pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS
          .ORDER_BY
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.ORDER_BY.test(
          'orderBy('
        )
      ).toBe(true);
    });

    it('should have WHERE pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS
          .WHERE
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.FIRESTORE_OPTIMIZATION_PATTERNS.WHERE.test(
          'where('
        )
      ).toBe(true);
    });
  });

  describe('BATCH_PATTERNS', () => {
    it('should have BATCH pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.BATCH
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.BATCH.test(
          'batch()'
        )
      ).toBe(true);
    });

    it('should have WRITE_BATCH pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.WRITE_BATCH
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.WRITE_BATCH.test(
          'writeBatch'
        )
      ).toBe(true);
    });

    it('should have COMMIT_BATCH pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.COMMIT_BATCH
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.BATCH_PATTERNS.COMMIT_BATCH.test(
          'commitBatch'
        )
      ).toBe(true);
    });
  });

  describe('PAGINATION_PATTERNS', () => {
    it('should have START_AFTER pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AFTER
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AFTER.test(
          'startAfter('
        )
      ).toBe(true);
    });

    it('should have START_AT pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AT
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.START_AT.test(
          'startAt('
        )
      ).toBe(true);
    });

    it('should have END_AT pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_AT
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_AT.test(
          'endAt('
        )
      ).toBe(true);
    });

    it('should have END_BEFORE pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_BEFORE
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.PAGINATION_PATTERNS.END_BEFORE.test(
          'endBefore('
        )
      ).toBe(true);
    });
  });

  describe('CACHING_PATTERNS', () => {
    it('should have ENABLE_NETWORK pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.ENABLE_NETWORK
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.ENABLE_NETWORK.test(
          'enableNetwork'
        )
      ).toBe(true);
    });

    it('should have DISABLE_NETWORK pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.DISABLE_NETWORK
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.DISABLE_NETWORK.test(
          'disableNetwork'
        )
      ).toBe(true);
    });

    it('should have CACHE pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.CACHE
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.CACHE.test(
          'cache'
        )
      ).toBe(true);
    });

    it('should have PERSISTENT_CACHE pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS
          .PERSISTENT_CACHE
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_PATTERNS.PERSISTENT_CACHE.test(
          'persistentCache'
        )
      ).toBe(true);
    });
  });

  describe('CACHING_LIBRARIES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(DatabaseQueryOptimizationCheckConstants.CACHING_LIBRARIES)
      ).toBe(true);
    });

    it('should contain @ngrx/entity', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_LIBRARIES
      ).toContain('@ngrx/entity');
    });

    it('should contain apollo-cache', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_LIBRARIES
      ).toContain('apollo-cache');
    });

    it('should contain rxjs-cache', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.CACHING_LIBRARIES
      ).toContain('rxjs-cache');
    });
  });

  describe('N_PLUS_ONE_PREVENTION', () => {
    it('should have GET_ALL pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.GET_ALL
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.GET_ALL.test(
          'getAll('
        )
      ).toBe(true);
    });

    it('should have BATCH pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.BATCH
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.BATCH.test(
          'batch'
        )
      ).toBe(true);
    });

    it('should have IN_ARRAY pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.IN_ARRAY
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.IN_ARRAY.test(
          'in array'
        )
      ).toBe(true);
    });

    it('should have ARRAY_CONTAINS pattern', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION
          .ARRAY_CONTAINS
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationCheckConstants.N_PLUS_ONE_PREVENTION.ARRAY_CONTAINS.test(
          'arrayContains'
        )
      ).toBe(true);
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have FIRESTORE deduction of 25', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.FIRESTORE
      ).toBe(25);
    });

    it('should have INDEXING deduction of 20', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.INDEXING
      ).toBe(20);
    });

    it('should have BATCHING deduction of 20', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.BATCHING
      ).toBe(20);
    });

    it('should have PAGINATION deduction of 15', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.PAGINATION
      ).toBe(15);
    });

    it('should have CACHING deduction of 10', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.CACHING
      ).toBe(10);
    });

    it('should have N_PLUS_ONE deduction of 10', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS.N_PLUS_ONE
      ).toBe(10);
    });

    it('should have all deductions sum to 100', () => {
      const total = Object.values(
        DatabaseQueryOptimizationCheckConstants.SCORE_DEDUCTIONS
      ).reduce((sum, val) => sum + val, 0);
      expect(total).toBe(100);
    });
  });

  describe('hasFirestoreOptimization', () => {
    it('should return true when all patterns are present', () => {
      const content = 'collection.where(x).orderBy(y).limit(10)';
      expect(
        DatabaseQueryOptimizationCheckConstants.hasFirestoreOptimization(
          content
        )
      ).toBe(true);
    });

    it('should return false when limit is missing', () => {
      const content = 'collection.where(x).orderBy(y)';
      expect(
        DatabaseQueryOptimizationCheckConstants.hasFirestoreOptimization(
          content
        )
      ).toBe(false);
    });

    it('should return false when orderBy is missing', () => {
      const content = 'collection.where(x).limit(10)';
      expect(
        DatabaseQueryOptimizationCheckConstants.hasFirestoreOptimization(
          content
        )
      ).toBe(false);
    });

    it('should return false when where is missing', () => {
      const content = 'collection.orderBy(y).limit(10)';
      expect(
        DatabaseQueryOptimizationCheckConstants.hasFirestoreOptimization(
          content
        )
      ).toBe(false);
    });
  });

  describe('hasQueryBatching', () => {
    it('should return true for batch()', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasQueryBatching(
          'const batch = db.batch()'
        )
      ).toBe(true);
    });

    it('should return true for writeBatch', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasQueryBatching(
          'const batch = writeBatch(db)'
        )
      ).toBe(true);
    });

    it('should return true for commitBatch', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasQueryBatching(
          'await commitBatch()'
        )
      ).toBe(true);
    });

    it('should return false when no batching present', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasQueryBatching(
          'const doc = await get()'
        )
      ).toBe(false);
    });
  });

  describe('hasPagination', () => {
    it('should return true for startAfter', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasPagination(
          'query.startAfter(lastDoc)'
        )
      ).toBe(true);
    });

    it('should return true for startAt', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasPagination(
          'query.startAt(doc)'
        )
      ).toBe(true);
    });

    it('should return true for endAt', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasPagination(
          'query.endAt(doc)'
        )
      ).toBe(true);
    });

    it('should return true for endBefore', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasPagination(
          'query.endBefore(doc)'
        )
      ).toBe(true);
    });

    it('should return false when no pagination present', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasPagination('query.get()')
      ).toBe(false);
    });
  });

  describe('hasCaching', () => {
    it('should return true for enableNetwork', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasCaching(
          'firestore.enableNetwork()'
        )
      ).toBe(true);
    });

    it('should return true for disableNetwork', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasCaching(
          'firestore.disableNetwork()'
        )
      ).toBe(true);
    });

    it('should return true for cache', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasCaching(
          'use cache for queries'
        )
      ).toBe(true);
    });

    it('should return true for persistentCache', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasCaching(
          'enable persistentCache'
        )
      ).toBe(true);
    });

    it('should return false when no caching present', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasCaching('simple query')
      ).toBe(false);
    });
  });

  describe('hasNPlusOnePrevention', () => {
    it('should return true for getAll', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
          'firestore.getAll(docs)'
        )
      ).toBe(true);
    });

    it('should return true for batch', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
          'use batch operations'
        )
      ).toBe(true);
    });

    it('should return true for in array', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
          'where id in array'
        )
      ).toBe(true);
    });

    it('should return true for arrayContains', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
          'where arrayContains id'
        )
      ).toBe(true);
    });

    it('should return false when no prevention pattern present', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.hasNPlusOnePrevention(
          'simple loop query'
        )
      ).toBe(false);
    });
  });

  describe('getScoreDeduction', () => {
    it('should return 25 for FIRESTORE', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('firestore')
      ).toBe(25);
    });

    it('should return 20 for INDEXING', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('indexing')
      ).toBe(20);
    });

    it('should return 20 for BATCHING', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('batching')
      ).toBe(20);
    });

    it('should return 15 for PAGINATION', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('pagination')
      ).toBe(15);
    });

    it('should return 10 for CACHING', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('caching')
      ).toBe(10);
    });

    it('should return 10 for N_PLUS_ONE', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('n_plus_one')
      ).toBe(10);
    });

    it('should return 0 for unknown check type', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('unknown')
      ).toBe(0);
    });

    it('should be case insensitive', () => {
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('FIRESTORE')
      ).toBe(25);
      expect(
        DatabaseQueryOptimizationCheckConstants.getScoreDeduction('Firestore')
      ).toBe(25);
    });
  });
});
