/**
 * Tests for DatabaseQueryOptimizationFileDiscoveryConstants
 *
 * Tests database file discovery configuration and helper methods.
 */
import { DatabaseQueryOptimizationFileDiscoveryConstants } from '../../../src/laws/performance/database-query-optimization/constants/file-discovery';

describe('DatabaseQueryOptimizationFileDiscoveryConstants', () => {
  describe('SCAN_DIRECTORIES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(
          DatabaseQueryOptimizationFileDiscoveryConstants.SCAN_DIRECTORIES
        )
      ).toBe(true);
    });

    it('should contain src directory', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('src');
    });

    it('should contain apps directory', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('apps');
    });

    it('should contain libs directory', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.SCAN_DIRECTORIES
      ).toContain('libs');
    });
  });

  describe('SERVICE_FILE_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(
          DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS
        )
      ).toBe(true);
      DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS.forEach(
        pattern => {
          expect(pattern).toBeInstanceOf(RegExp);
        }
      );
    });

    it('should match .service.ts files', () => {
      const patterns =
        DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS;
      expect(patterns.some(p => p.test('user.service.ts'))).toBe(true);
    });

    it('should match firestore.ts files', () => {
      const patterns =
        DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS;
      expect(patterns.some(p => p.test('firestore.ts'))).toBe(true);
    });

    it('should match database.ts files', () => {
      const patterns =
        DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS;
      expect(patterns.some(p => p.test('database.ts'))).toBe(true);
    });

    it('should match repository.ts files', () => {
      const patterns =
        DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS;
      expect(patterns.some(p => p.test('user.repository.ts'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const patterns =
        DatabaseQueryOptimizationFileDiscoveryConstants.SERVICE_FILE_PATTERNS;
      expect(patterns.some(p => p.test('User.Service.TS'))).toBe(true);
    });
  });

  describe('CONFIG_FILE_PATTERNS', () => {
    it('should have FIRESTORE_RULES paths', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .FIRESTORE_RULES
      ).toContain('firestore.rules');
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .FIRESTORE_RULES
      ).toContain('firestore.emulator.rules');
    });

    it('should have INDEXES paths', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .INDEXES
      ).toContain('firestore.indexes.json');
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.CONFIG_FILE_PATTERNS
          .INDEXES
      ).toContain('config/firestore.indexes.json');
    });
  });

  describe('QUERY_PATTERNS', () => {
    it('should have BATCH pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.BATCH
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.BATCH.test(
          'batch()'
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.BATCH.test(
          'writeBatch'
        )
      ).toBe(true);
    });

    it('should have PAGINATION pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS
          .PAGINATION
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.PAGINATION.test(
          'startAfter('
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.PAGINATION.test(
          'startAt('
        )
      ).toBe(true);
    });

    it('should have CACHING pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.CACHING
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.CACHING.test(
          'enableNetwork'
        )
      ).toBe(true);
    });

    it('should have OPTIMIZATION pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS
          .OPTIMIZATION
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.OPTIMIZATION.test(
          'limit('
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.OPTIMIZATION.test(
          'orderBy('
        )
      ).toBe(true);
    });

    it('should have LOOP pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.LOOP
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.LOOP.test(
          'for('
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.LOOP.test(
          '.map('
        )
      ).toBe(true);
    });

    it('should have DATABASE_QUERY pattern', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS
          .DATABASE_QUERY
      ).toBeInstanceOf(RegExp);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.DATABASE_QUERY.test(
          'get('
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.DATABASE_QUERY.test(
          'doc('
        )
      ).toBe(true);
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.QUERY_PATTERNS.DATABASE_QUERY.test(
          'collection('
        )
      ).toBe(true);
    });
  });

  describe('isServiceFile', () => {
    it('should return true for service.ts files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'user.service.ts'
        )
      ).toBe(true);
    });

    it('should return true for firestore.ts files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'firestore.ts'
        )
      ).toBe(true);
    });

    it('should return true for database.ts files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'database.ts'
        )
      ).toBe(true);
    });

    it('should return true for repository.ts files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'user.repository.ts'
        )
      ).toBe(true);
    });

    it('should return false for component files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'user.component.ts'
        )
      ).toBe(false);
    });

    it('should return false for module files', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.isServiceFile(
          'app.module.ts'
        )
      ).toBe(false);
    });
  });

  describe('hasQuery', () => {
    it('should return true for get( calls', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasQuery('doc.get()')
      ).toBe(true);
    });

    it('should return true for doc( calls', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasQuery(
          'firestore.doc("users/123")'
        )
      ).toBe(true);
    });

    it('should return true for collection( calls', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasQuery(
          'firestore.collection("users")'
        )
      ).toBe(true);
    });

    it('should return false for non-query lines', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasQuery(
          'const user = new User()'
        )
      ).toBe(false);
    });
  });

  describe('hasLoop', () => {
    it('should return true for for( loops', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasLoop(
          'for(let i = 0; i < 10; i++)'
        )
      ).toBe(true);
    });

    it('should return true for forEach calls', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasLoop(
          'array.forEach(item => {})'
        )
      ).toBe(true);
    });

    it('should return true for .map( calls', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasLoop(
          'array.map(x => x * 2)'
        )
      ).toBe(true);
    });

    it('should return false for non-loop lines', () => {
      expect(
        DatabaseQueryOptimizationFileDiscoveryConstants.hasLoop(
          'const result = getValue()'
        )
      ).toBe(false);
    });
  });

  describe('getFirestoreRulesPaths', () => {
    it('should return array of firestore rules paths', () => {
      const paths =
        DatabaseQueryOptimizationFileDiscoveryConstants.getFirestoreRulesPaths();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths).toContain('firestore.rules');
      expect(paths).toContain('firestore.emulator.rules');
    });
  });

  describe('getIndexPaths', () => {
    it('should return array of index paths', () => {
      const paths =
        DatabaseQueryOptimizationFileDiscoveryConstants.getIndexPaths();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths).toContain('firestore.indexes.json');
      expect(paths).toContain('config/firestore.indexes.json');
    });
  });
});
