/**
 * Tests for Common Extensions Module
 * Testing the central repository for file extension constants
 */

import {
  COMMON_EXTENSIONS,
  getCommonExtensions,
  type CommonExtensions,
} from '../../src/utils/common-extensions';

describe('Common Extensions Module', () => {
  describe('COMMON_EXTENSIONS constant', () => {
    it('should export COMMON_EXTENSIONS as an object', () => {
      expect(COMMON_EXTENSIONS).toBeDefined();
      expect(typeof COMMON_EXTENSIONS).toBe('object');
    });

    it('should have TYPESCRIPT extensions', () => {
      expect(COMMON_EXTENSIONS.TYPESCRIPT).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.TYPESCRIPT)).toBe(true);
      expect(COMMON_EXTENSIONS.TYPESCRIPT).toContain('.ts');
      expect(COMMON_EXTENSIONS.TYPESCRIPT).toContain('.tsx');
    });

    it('should have JAVASCRIPT extensions', () => {
      expect(COMMON_EXTENSIONS.JAVASCRIPT).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.JAVASCRIPT)).toBe(true);
      expect(COMMON_EXTENSIONS.JAVASCRIPT).toContain('.js');
      expect(COMMON_EXTENSIONS.JAVASCRIPT).toContain('.jsx');
    });

    it('should have CONFIG extensions', () => {
      expect(COMMON_EXTENSIONS.CONFIG).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.CONFIG)).toBe(true);
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.json');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.yaml');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.yml');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.config.js');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.config.ts');
    });

    it('should have ANGULAR extensions', () => {
      expect(COMMON_EXTENSIONS.ANGULAR).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.ANGULAR)).toBe(true);
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.ts');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.html');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.scss');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.css');
    });

    it('should have TESTS extensions', () => {
      expect(COMMON_EXTENSIONS.TESTS).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.TESTS)).toBe(true);
      expect(COMMON_EXTENSIONS.TESTS).toContain('.spec.ts');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.test.ts');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.spec.js');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.test.js');
    });

    it('should have ALL_CODE extensions', () => {
      expect(COMMON_EXTENSIONS.ALL_CODE).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.ALL_CODE)).toBe(true);
      expect(COMMON_EXTENSIONS.ALL_CODE).toContain('.ts');
      expect(COMMON_EXTENSIONS.ALL_CODE).toContain('.tsx');
      expect(COMMON_EXTENSIONS.ALL_CODE).toContain('.js');
      expect(COMMON_EXTENSIONS.ALL_CODE).toContain('.jsx');
    });

    it('should have DOCUMENTATION extensions', () => {
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toBeDefined();
      expect(Array.isArray(COMMON_EXTENSIONS.DOCUMENTATION)).toBe(true);
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.md');
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.txt');
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.rst');
    });

    it('should have readonly extensions (immutable)', () => {
      // TypeScript ensures this at compile time, but we verify structure
      const extensionKeys = Object.keys(COMMON_EXTENSIONS);
      expect(extensionKeys).toHaveLength(7);
      expect(extensionKeys).toContain('TYPESCRIPT');
      expect(extensionKeys).toContain('JAVASCRIPT');
      expect(extensionKeys).toContain('CONFIG');
      expect(extensionKeys).toContain('ANGULAR');
      expect(extensionKeys).toContain('TESTS');
      expect(extensionKeys).toContain('ALL_CODE');
      expect(extensionKeys).toContain('DOCUMENTATION');
    });
  });

  describe('getCommonExtensions()', () => {
    it('should return the COMMON_EXTENSIONS object', () => {
      const extensions = getCommonExtensions();
      expect(extensions).toBe(COMMON_EXTENSIONS);
    });

    it('should return an object with all extension categories', () => {
      const extensions = getCommonExtensions();
      expect(extensions.TYPESCRIPT).toBeDefined();
      expect(extensions.JAVASCRIPT).toBeDefined();
      expect(extensions.CONFIG).toBeDefined();
      expect(extensions.ANGULAR).toBeDefined();
      expect(extensions.TESTS).toBeDefined();
      expect(extensions.ALL_CODE).toBeDefined();
      expect(extensions.DOCUMENTATION).toBeDefined();
    });

    it('should return consistent results on multiple calls', () => {
      const first = getCommonExtensions();
      const second = getCommonExtensions();
      expect(first).toBe(second);
    });
  });

  describe('CommonExtensions type', () => {
    it('should be usable as a type annotation', () => {
      const extensions: CommonExtensions = COMMON_EXTENSIONS;
      expect(extensions.TYPESCRIPT.length).toBeGreaterThan(0);
      expect(extensions.JAVASCRIPT.length).toBeGreaterThan(0);
    });
  });

  describe('Extension values', () => {
    it('all extensions should start with a dot', () => {
      const allCategories = [
        COMMON_EXTENSIONS.TYPESCRIPT,
        COMMON_EXTENSIONS.JAVASCRIPT,
        COMMON_EXTENSIONS.CONFIG,
        COMMON_EXTENSIONS.ANGULAR,
        COMMON_EXTENSIONS.TESTS,
        COMMON_EXTENSIONS.ALL_CODE,
        COMMON_EXTENSIONS.DOCUMENTATION,
      ];

      for (const category of allCategories) {
        for (const ext of category) {
          expect(ext.startsWith('.')).toBe(true);
        }
      }
    });

    it('TYPESCRIPT and JAVASCRIPT should be disjoint', () => {
      const tsExts = new Set<string>(COMMON_EXTENSIONS.TYPESCRIPT);
      for (const jsExt of COMMON_EXTENSIONS.JAVASCRIPT) {
        expect(tsExts.has(jsExt)).toBe(false);
      }
    });

    it('ALL_CODE should contain TYPESCRIPT and JAVASCRIPT', () => {
      const allCode = new Set<string>(COMMON_EXTENSIONS.ALL_CODE);
      for (const tsExt of COMMON_EXTENSIONS.TYPESCRIPT) {
        expect(allCode.has(tsExt)).toBe(true);
      }
      for (const jsExt of COMMON_EXTENSIONS.JAVASCRIPT) {
        expect(allCode.has(jsExt)).toBe(true);
      }
    });

    it('TESTS extensions should be for test files', () => {
      for (const testExt of COMMON_EXTENSIONS.TESTS) {
        expect(testExt.includes('spec') || testExt.includes('test')).toBe(true);
      }
    });
  });
});
