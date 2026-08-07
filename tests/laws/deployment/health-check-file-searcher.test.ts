/**
 * Tests for Health Check File Searcher
 *
 * Comprehensive tests for searchFilesForPatterns utility
 */
import { searchFilesForPatterns } from '../../../src/laws/deployment/health-check-file-searcher';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('searchFilesForPatterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('health-check-search-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('basic functionality', () => {
    it('should return false for empty project', () => {
      const result = searchFilesForPatterns(tempDir, [], []);
      expect(result).toBe(false);
    });

    it('should return false for non-existent files', () => {
      const result = searchFilesForPatterns(
        tempDir,
        ['non-existent.ts'],
        [/pattern/]
      );
      expect(result).toBe(false);
    });

    it('should return false for existing files with no pattern match', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'export const test = 1;'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/non-matching-pattern/]
      );
      expect(result).toBe(false);
    });

    it('should return true when pattern matches file content', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'health.ts'),
        'export const healthCheck = () => ({ status: "ok" });'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['health.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
    });
  });

  describe('with multiple files', () => {
    it('should search across multiple files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'file1.ts'),
        'export const a = 1;'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'file2.ts'),
        'export const healthCheck = () => {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['file1.ts', 'file2.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
    });

    it('should return true if any file matches', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'a.ts'),
        'no match here'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'b.ts'),
        'database connectivity check'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'c.ts'),
        'no match here either'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['a.ts', 'b.ts', 'c.ts'],
        [/database.*connectivity/i]
      );
      expect(result).toBe(true);
    });

    it('should return false if no files match', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'a.ts'), 'no match');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'b.ts'),
        'still no match'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['a.ts', 'b.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(false);
    });
  });

  describe('with multiple patterns', () => {
    it('should return true if any pattern matches', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'export const dbPing = () => {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/healthCheck/, /dbPing/, /status/]
      );
      expect(result).toBe(true);
    });

    it('should return false if no pattern matches', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'export const something = 1;'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/healthCheck/, /dbPing/, /status/]
      );
      expect(result).toBe(false);
    });
  });

  describe('with nested directories', () => {
    it('should search files in nested paths', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'health'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health', 'check.ts'),
        'export const healthCheck = () => ({ healthy: true });'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['src/health/check.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
    });

    it('should handle deep nesting', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'a', 'b', 'c', 'd')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'a', 'b', 'c', 'd', 'deep.ts'),
        'database health check'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['a/b/c/d/deep.ts'],
        [/database.*health/i]
      );
      expect(result).toBe(true);
    });
  });

  describe('with case-insensitive patterns', () => {
    it('should match case-insensitive patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'export const DatabaseHealth = {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/database.*health/i]
      );
      expect(result).toBe(true);
    });

    it('should not match case-sensitive patterns when case differs', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'export const DatabaseHealth = {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/databasehealth/]
      );
      expect(result).toBe(false);
    });
  });

  describe('health check specific patterns', () => {
    it('should find database health patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'db-health.ts'),
        'export const checkDatabaseHealth = async () => { await db.ping(); };'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['db-health.ts'],
        [/database.*health/i, /db.*ping/i]
      );
      expect(result).toBe(true);
    });

    it('should find external service health patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'service-health.ts'),
        'export const checkExternalServiceHealth = () => {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['service-health.ts'],
        [/external.*service.*health/i]
      );
      expect(result).toBe(true);
    });

    it('should find dependency check patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'deps.ts'),
        'export const dependencyCheck = () => {};'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['deps.ts'],
        [/dependency.*check/i]
      );
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty file', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'empty.ts'), '');
      const result = searchFilesForPatterns(
        tempDir,
        ['empty.ts'],
        [/anything/]
      );
      expect(result).toBe(false);
    });

    it('should handle file with only whitespace', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'whitespace.ts'),
        '   \n\t\n   '
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['whitespace.ts'],
        [/content/]
      );
      expect(result).toBe(false);
    });

    it('should handle binary-like content gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'data.bin'),
        '\x00\x01\x02healthCheck\x03\x04'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['data.bin'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
    });

    it('should handle large files', () => {
      const largeContent =
        'x'.repeat(100000) + 'healthCheck' + 'x'.repeat(100000);
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'large.ts'),
        largeContent
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['large.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
    });
  });

  describe('return type', () => {
    it('should return boolean true', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'test.ts'),
        'healthCheck'
      );
      const result = searchFilesForPatterns(
        tempDir,
        ['test.ts'],
        [/healthCheck/]
      );
      expect(result).toBe(true);
      expect(typeof result).toBe('boolean');
    });

    it('should return boolean false', () => {
      const result = searchFilesForPatterns(
        tempDir,
        ['missing.ts'],
        [/pattern/]
      );
      expect(result).toBe(false);
      expect(typeof result).toBe('boolean');
    });
  });
});
