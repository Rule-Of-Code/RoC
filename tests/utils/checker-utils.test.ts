/**
 * @fileoverview Tests for checker-utils.ts
 * @description Tests for CheckerUtils class and COMMON_EXTENSIONS
 */

import { CheckerUtils, COMMON_EXTENSIONS } from '../../src/utils/checker-utils';

describe('utils/checker-utils', () => {
  describe('COMMON_EXTENSIONS', () => {
    it('should have TYPESCRIPT extensions', () => {
      expect(COMMON_EXTENSIONS.TYPESCRIPT).toEqual(['.ts', '.tsx']);
    });

    it('should have JAVASCRIPT extensions', () => {
      expect(COMMON_EXTENSIONS.JAVASCRIPT).toEqual(['.js', '.jsx']);
    });

    it('should have CONFIG extensions', () => {
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.json');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.yaml');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.yml');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.config.js');
      expect(COMMON_EXTENSIONS.CONFIG).toContain('.config.ts');
    });

    it('should have ANGULAR extensions', () => {
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.ts');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.html');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.scss');
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.css');
    });

    it('should have TESTS extensions', () => {
      expect(COMMON_EXTENSIONS.TESTS).toContain('.spec.ts');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.test.ts');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.spec.js');
      expect(COMMON_EXTENSIONS.TESTS).toContain('.test.js');
    });

    it('should have ALL_CODE extensions', () => {
      expect(COMMON_EXTENSIONS.ALL_CODE).toEqual([
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
      ]);
    });

    it('should have DOCUMENTATION extensions', () => {
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.md');
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.txt');
      expect(COMMON_EXTENSIONS.DOCUMENTATION).toContain('.rst');
    });

    it('should have 7 extension categories', () => {
      expect(Object.keys(COMMON_EXTENSIONS)).toHaveLength(7);
    });
  });

  describe('CheckerUtils.getCommonExtensions', () => {
    it('should return COMMON_EXTENSIONS object', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result).toBe(COMMON_EXTENSIONS);
    });

    it('should have TYPESCRIPT key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.TYPESCRIPT).toBeDefined();
    });

    it('should have JAVASCRIPT key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.JAVASCRIPT).toBeDefined();
    });

    it('should have CONFIG key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.CONFIG).toBeDefined();
    });

    it('should have ANGULAR key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.ANGULAR).toBeDefined();
    });

    it('should have TESTS key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.TESTS).toBeDefined();
    });

    it('should have ALL_CODE key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.ALL_CODE).toBeDefined();
    });

    it('should have DOCUMENTATION key', () => {
      const result = CheckerUtils.getCommonExtensions();
      expect(result.DOCUMENTATION).toBeDefined();
    });

    it('should return arrays for all extension categories', () => {
      const result = CheckerUtils.getCommonExtensions();
      Object.values(result).forEach(extensions => {
        expect(Array.isArray(extensions)).toBe(true);
      });
    });

    it('should return non-empty arrays', () => {
      const result = CheckerUtils.getCommonExtensions();
      Object.values(result).forEach(extensions => {
        expect(extensions.length).toBeGreaterThan(0);
      });
    });

    it('should return strings starting with dot', () => {
      const result = CheckerUtils.getCommonExtensions();
      Object.values(result).forEach((extensions: string[]) => {
        extensions.forEach((ext: string) => {
          expect(ext.startsWith('.')).toBe(true);
        });
      });
    });
  });

  describe('extension pattern validity', () => {
    it('should have valid TypeScript extensions', () => {
      COMMON_EXTENSIONS.TYPESCRIPT.forEach(ext => {
        expect(ext).toMatch(/^\.(ts|tsx)$/);
      });
    });

    it('should have valid JavaScript extensions', () => {
      COMMON_EXTENSIONS.JAVASCRIPT.forEach(ext => {
        expect(ext).toMatch(/^\.(js|jsx)$/);
      });
    });

    it('should have TypeScript extensions as subset of ALL_CODE', () => {
      COMMON_EXTENSIONS.TYPESCRIPT.forEach(ext => {
        expect(COMMON_EXTENSIONS.ALL_CODE).toContain(ext);
      });
    });

    it('should have JavaScript extensions as subset of ALL_CODE', () => {
      COMMON_EXTENSIONS.JAVASCRIPT.forEach(ext => {
        expect(COMMON_EXTENSIONS.ALL_CODE).toContain(ext);
      });
    });

    it('should have .ts in ANGULAR extensions', () => {
      expect(COMMON_EXTENSIONS.ANGULAR).toContain('.ts');
    });

    it('should have test file patterns include both ts and js', () => {
      const hasTs = COMMON_EXTENSIONS.TESTS.some(ext => ext.includes('.ts'));
      const hasJs = COMMON_EXTENSIONS.TESTS.some(ext => ext.includes('.js'));
      expect(hasTs).toBe(true);
      expect(hasJs).toBe(true);
    });
  });
});
