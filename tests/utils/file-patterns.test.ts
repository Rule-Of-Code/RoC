/**
 * Tests for File Patterns Module
 * Testing glob pattern generation utilities
 */

import {
  createMultiExtensionPattern,
  createTypePattern,
  getFilePatterns,
  getStandardPatterns,
  type FilePatterns,
} from '../../src/utils/file-patterns';

describe('File Patterns Module', () => {
  describe('createTypePattern()', () => {
    describe('typescript patterns', () => {
      it('should return typescript glob patterns', () => {
        const patterns = createTypePattern('typescript');
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should include .ts and .tsx patterns', () => {
        const patterns = createTypePattern('typescript');
        expect(patterns).toContain('**/*.ts');
        expect(patterns).toContain('**/*.tsx');
      });
    });

    describe('javascript patterns', () => {
      it('should return javascript glob patterns', () => {
        const patterns = createTypePattern('javascript');
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should include .js and .jsx patterns', () => {
        const patterns = createTypePattern('javascript');
        expect(patterns).toContain('**/*.js');
        expect(patterns).toContain('**/*.jsx');
      });
    });

    describe('config patterns', () => {
      it('should return config file glob patterns', () => {
        const patterns = createTypePattern('config');
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should include json, yaml, and yml patterns', () => {
        const patterns = createTypePattern('config');
        expect(patterns).toContain('**/*.json');
        expect(patterns).toContain('**/*.yaml');
        expect(patterns).toContain('**/*.yml');
      });
    });

    describe('test patterns', () => {
      it('should return test file glob patterns', () => {
        const patterns = createTypePattern('test');
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should include test and spec patterns', () => {
        const patterns = createTypePattern('test');
        expect(patterns.some(p => p.includes('test'))).toBe(true);
        expect(patterns.some(p => p.includes('spec'))).toBe(true);
      });

      it('should include test directories patterns', () => {
        const patterns = createTypePattern('test');
        expect(patterns).toContain('**/test/**');
        expect(patterns).toContain('**/tests/**');
      });
    });

    describe('markdown patterns', () => {
      it('should return markdown glob patterns', () => {
        const patterns = createTypePattern('markdown');
        expect(Array.isArray(patterns)).toBe(true);
        expect(patterns.length).toBeGreaterThan(0);
      });

      it('should include .md and .markdown patterns', () => {
        const patterns = createTypePattern('markdown');
        expect(patterns).toContain('**/*.md');
        expect(patterns).toContain('**/*.markdown');
      });
    });

    it('all patterns should start with **/', () => {
      const types: Array<
        'config' | 'javascript' | 'markdown' | 'test' | 'typescript'
      > = ['typescript', 'javascript', 'config', 'test', 'markdown'];

      for (const type of types) {
        const patterns = createTypePattern(type);
        for (const pattern of patterns) {
          expect(pattern.startsWith('**/')).toBe(true);
        }
      }
    });
  });

  describe('createMultiExtensionPattern()', () => {
    it('should create pattern for single extension', () => {
      const pattern = createMultiExtensionPattern(['ts']);
      expect(pattern).toBe('**/*.ts');
    });

    it('should create pattern for multiple extensions', () => {
      const pattern = createMultiExtensionPattern(['ts', 'tsx']);
      expect(pattern).toBe('**/*.{ts,tsx}');
    });

    it('should create pattern for three extensions', () => {
      const pattern = createMultiExtensionPattern(['js', 'jsx', 'mjs']);
      expect(pattern).toBe('**/*.{js,jsx,mjs}');
    });

    it('should handle empty array', () => {
      const pattern = createMultiExtensionPattern([]);
      // With empty array, should return a valid but empty pattern
      expect(pattern).toBe('**/*.{}');
    });
  });

  describe('getStandardPatterns()', () => {
    it('should return an object with standard patterns', () => {
      const patterns = getStandardPatterns();
      expect(typeof patterns).toBe('object');
      expect(patterns).toHaveProperty('allFiles');
      expect(patterns).toHaveProperty('allDirectories');
      expect(patterns).toHaveProperty('allFilesAndDirectories');
    });

    it('should return correct allFiles pattern', () => {
      const patterns = getStandardPatterns();
      expect(patterns.allFiles).toBe('**/*');
    });

    it('should return correct allDirectories pattern', () => {
      const patterns = getStandardPatterns();
      expect(patterns.allDirectories).toBe('**/');
    });

    it('should return correct allFilesAndDirectories pattern', () => {
      const patterns = getStandardPatterns();
      expect(patterns.allFilesAndDirectories).toBe('**');
    });

    it('should return consistent results on multiple calls', () => {
      const first = getStandardPatterns();
      const second = getStandardPatterns();
      expect(first.allFiles).toBe(second.allFiles);
      expect(first.allDirectories).toBe(second.allDirectories);
      expect(first.allFilesAndDirectories).toBe(second.allFilesAndDirectories);
    });
  });

  describe('getFilePatterns()', () => {
    it('should return an object with all file type patterns', () => {
      const patterns = getFilePatterns();
      expect(typeof patterns).toBe('object');
      expect(patterns).toHaveProperty('typescript');
      expect(patterns).toHaveProperty('javascript');
      expect(patterns).toHaveProperty('config');
      expect(patterns).toHaveProperty('test');
      expect(patterns).toHaveProperty('markdown');
    });

    it('should return arrays for each pattern type', () => {
      const patterns = getFilePatterns();
      expect(Array.isArray(patterns.typescript)).toBe(true);
      expect(Array.isArray(patterns.javascript)).toBe(true);
      expect(Array.isArray(patterns.config)).toBe(true);
      expect(Array.isArray(patterns.test)).toBe(true);
      expect(Array.isArray(patterns.markdown)).toBe(true);
    });

    it('should match createTypePattern results', () => {
      const patterns = getFilePatterns();
      expect(patterns.typescript).toEqual(createTypePattern('typescript'));
      expect(patterns.javascript).toEqual(createTypePattern('javascript'));
      expect(patterns.config).toEqual(createTypePattern('config'));
      expect(patterns.test).toEqual(createTypePattern('test'));
      expect(patterns.markdown).toEqual(createTypePattern('markdown'));
    });

    it('should be usable with FilePatterns type', () => {
      const patterns: FilePatterns = getFilePatterns();
      expect(patterns.typescript.length).toBeGreaterThan(0);
      expect(patterns.javascript.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern validity', () => {
    it('all patterns should be valid glob syntax', () => {
      const patterns = getFilePatterns();
      const allPatterns = [
        ...patterns.typescript,
        ...patterns.javascript,
        ...patterns.config,
        ...patterns.test,
        ...patterns.markdown,
      ];

      for (const pattern of allPatterns) {
        // Valid glob patterns should be non-empty strings
        expect(typeof pattern).toBe('string');
        expect(pattern.length).toBeGreaterThan(0);
        // Should start with **/ for recursive matching
        expect(pattern.startsWith('**/')).toBe(true);
      }
    });

    it('extension patterns should contain file extension indicators', () => {
      const patterns = getFilePatterns();

      // Non-test patterns should have *. for extension matching
      for (const pattern of patterns.typescript) {
        expect(pattern.includes('*.')).toBe(true);
      }
      for (const pattern of patterns.javascript) {
        expect(pattern.includes('*.')).toBe(true);
      }
      for (const pattern of patterns.config) {
        expect(pattern.includes('*.')).toBe(true);
      }
      for (const pattern of patterns.markdown) {
        expect(pattern.includes('*.')).toBe(true);
      }
    });
  });
});
