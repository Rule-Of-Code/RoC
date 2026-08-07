/**
 * Pattern Search Utility - Tests
 * Tests for PatternSearchUtility class
 */
import { PatternSearchUtility } from '../../src/utils/pattern-search-utility';

describe('PatternSearchUtility', () => {
  // ============================================
  // searchFilesForPatterns
  // ============================================
  describe('searchFilesForPatterns()', () => {
    it('should return boolean', () => {
      const result = PatternSearchUtility.searchFilesForPatterns(
        '/nonexistent/project',
        ['file.ts'],
        [/pattern/]
      );
      expect(typeof result).toBe('boolean');
    });

    it('should return false for nonexistent project', () => {
      const result = PatternSearchUtility.searchFilesForPatterns(
        '/nonexistent/path/to/project',
        ['package.json'],
        [/test/]
      );
      expect(result).toBe(false);
    });

    it('should return false for empty files array', () => {
      const result = PatternSearchUtility.searchFilesForPatterns(
        '/project',
        [],
        [/pattern/]
      );
      expect(result).toBe(false);
    });

    it('should return false for empty patterns array', () => {
      const result = PatternSearchUtility.searchFilesForPatterns(
        '/project',
        ['file.ts'],
        []
      );
      expect(result).toBe(false);
    });
  });

  // ============================================
  // findFilesMatchingPatterns
  // ============================================
  describe('findFilesMatchingPatterns()', () => {
    it('should return an array', () => {
      const result = PatternSearchUtility.findFilesMatchingPatterns(
        '/nonexistent/project',
        ['file.ts'],
        [/pattern/]
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for nonexistent project', () => {
      const result = PatternSearchUtility.findFilesMatchingPatterns(
        '/nonexistent/path/to/project',
        ['package.json', 'tsconfig.json'],
        [/test/]
      );
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty files array', () => {
      const result = PatternSearchUtility.findFilesMatchingPatterns(
        '/project',
        [],
        [/pattern/]
      );
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty patterns array', () => {
      const result = PatternSearchUtility.findFilesMatchingPatterns(
        '/project',
        ['file.ts'],
        []
      );
      expect(result).toHaveLength(0);
    });
  });

  // ============================================
  // countFilesMatchingPatterns
  // ============================================
  describe('countFilesMatchingPatterns()', () => {
    it('should return a number', () => {
      const result = PatternSearchUtility.countFilesMatchingPatterns(
        '/nonexistent/project',
        ['file.ts'],
        [/pattern/]
      );
      expect(typeof result).toBe('number');
    });

    it('should return 0 for nonexistent project', () => {
      const result = PatternSearchUtility.countFilesMatchingPatterns(
        '/nonexistent/path/to/project',
        ['package.json'],
        [/test/]
      );
      expect(result).toBe(0);
    });

    it('should return 0 for empty files array', () => {
      const result = PatternSearchUtility.countFilesMatchingPatterns(
        '/project',
        [],
        [/pattern/]
      );
      expect(result).toBe(0);
    });

    it('should return 0 for empty patterns array', () => {
      const result = PatternSearchUtility.countFilesMatchingPatterns(
        '/project',
        ['file.ts'],
        []
      );
      expect(result).toBe(0);
    });
  });

  // ============================================
  // extractMatches
  // ============================================
  describe('extractMatches()', () => {
    it('should return an array', () => {
      const result = PatternSearchUtility.extractMatches(
        '/nonexistent/file.ts',
        /pattern/
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array for nonexistent file', () => {
      const result = PatternSearchUtility.extractMatches(
        '/nonexistent/path/to/file.ts',
        /test/g
      );
      expect(result).toHaveLength(0);
    });

    it('should accept global flag parameter', () => {
      const result = PatternSearchUtility.extractMatches(
        '/nonexistent/file.ts',
        /pattern/,
        true
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('should accept non-global flag parameter', () => {
      const result = PatternSearchUtility.extractMatches(
        '/nonexistent/file.ts',
        /pattern/,
        false
      );
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
