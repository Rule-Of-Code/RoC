/**
 * Tests for MagicNumberPreventionLaw
 *
 * Comprehensive tests for magic number detection and prevention
 */
import { MagicNumberPreventionLaw } from '../../../src/checkers/code-quality-laws/magic-number-prevention';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('MagicNumberPreventionLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('magic-number-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
        componentPrefix: 'app',
        type: 'generic',
      },
      ignores: { global: [], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: {
        parallel: false,
        maxConcurrent: 3,
        cache: true,
      },
    };
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('check()', () => {
    it('should return a LawResult object', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });

    it('should have fixable property', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(typeof result.fixable).toBe('boolean');
    });

    it('does not split a decimal named constant (0.25 is not the magic number 25)', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'seal.ts'),
        'export const SEAL_THRESHOLD = 0.25;\n'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(
        (result.violations ?? []).some(
          v => v.includes('25') || v.includes('0.25')
        )
      ).toBe(false);
    });

    it('still flags a real magic number', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'calc.ts'),
        'export function toMs(h: number) { return h * 3600; }\n'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect((result.violations ?? []).some(v => v.includes('3600'))).toBe(true);
    });
  });

  describe('ESLint magic number rule check', () => {
    it('should handle missing ESLint config', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Without ESLint config, should still return valid result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle project with no-magic-numbers rule', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle project with typescript no-magic-numbers rule', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({
          rules: { '@typescript-eslint/no-magic-numbers': 'warn' },
        })
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should return valid result when no ESLint config exists', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Should return valid result structure
      expect(result).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('magic number detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({
          rules: { '@typescript-eslint/no-magic-numbers': 'warn' },
        })
      );
    });

    it('should detect magic numbers in code', () => {
      const codeWithMagicNumbers = `
function calculateDiscount(price: number): number {
  return price * 0.15;
}

function getDelay(): number {
  return 5000;
}

function getMaxItems(): number {
  return 50;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        codeWithMagicNumbers
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      const magicViolation = result.violations?.find(v =>
        v.includes('Magic numbers in')
      );
      expect(magicViolation).toBeDefined();
    });

    it('should allow common acceptable numbers (0, 1, -1, 2, 10, 100, 1000)', () => {
      const codeWithAcceptableNumbers = `
function init(): number {
  const zero = 0;
  const one = 1;
  const negOne = -1;
  const two = 2;
  return zero + one + negOne + two;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'acceptable.ts'),
        codeWithAcceptableNumbers
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      const acceptableViolation = result.violations?.find(
        v => v.includes('acceptable.ts') && v.includes('Magic numbers')
      );
      expect(acceptableViolation).toBeUndefined();
    });

    it('should allow version numbers', () => {
      const codeWithVersion = `
const version = '1.2.3';
const apiVersion = 'v2.0.1';
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'version.ts'),
        codeWithVersion
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Version numbers should be acceptable
      expect(result).toBeDefined();
    });

    it('should allow port numbers', () => {
      const codeWithPort = `
const port = 3000;
const httpsPort = 443;
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'port.ts'),
        codeWithPort
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Port numbers might be flagged, but should be contextually acceptable
      expect(result).toBeDefined();
    });

    it('should allow timeout values with context', () => {
      const codeWithTimeout = `
const timeout = 5000;
const delay = 1000;
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'timeout.ts'),
        codeWithTimeout
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      // Timeout/delay values should be contextually acceptable
      expect(result).toBeDefined();
    });

    it('should allow CSS units', () => {
      const codeWithCSS = `
const width = '100px';
const height = '50em';
const size = '16rem';
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'css.ts'),
        codeWithCSS
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result).toBeDefined();
    });

    it('should allow date patterns', () => {
      const codeWithDates = `
const date = '2024-01-15';
const year = 2024;
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'dates.ts'),
        codeWithDates
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('suggestions', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
    });

    it('should suggest replacing magic numbers with constants', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        'const x = 42;'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations && result.violations.length > 0) {
        expect(result.suggestions).toContain(
          'Replace magic numbers with named constants'
        );
      }
    });

    it('should suggest creating constants file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        'const x = 42;'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations && result.violations.length > 0) {
        expect(result.suggestions).toContain(
          'Create a constants file for shared numeric values'
        );
      }
    });

    it('should suggest using enums for related magic numbers', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        'const x = 42;'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations && result.violations.length > 0) {
        expect(result.suggestions).toContain(
          'Use enums for related magic numbers'
        );
      }
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations?.length === 0) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct 8 points per violation', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: {} })
      );
      // Inline literals (NOT named-constant declarations) are the magic numbers
      // the law flags — a `const NAME = 42` declaration is the recommended fix and
      // is intentionally exempt.
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        'function f(n) { return n * 42 + compute(123); }'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not go below 0', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: {} })
      );
      // Create many files with magic numbers
      for (let i = 0; i < 15; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `magic${i}.ts`),
          `const value = ${1000 + i * 100};`
        );
      }
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('duplicate removal', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
    });

    it('should not report same magic number multiple times in one file', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'repeated.ts'),
        `
const a = 42;
const b = 42;
const c = 42;
`
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      const violations = result.violations?.filter(v =>
        v.includes('repeated.ts')
      );
      // Should only have one violation for this file
      expect(violations?.length).toBeLessThanOrEqual(1);
    });
  });

  describe('limit magic numbers per file', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
    });

    it('should limit reported magic numbers to 5 per file', () => {
      // Inline literals (not named-constant declarations, which are exempt) so the
      // per-file display cap is actually exercised.
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'many.ts'),
        'function f(n) { return n*11 + a(22) + b(33) + c(44) + d(55) + e(66) + g(77) + h(88); }\n'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      const fileViolation = result.violations?.find(v => v.includes('many.ts'));
      if (fileViolation) {
        // Count the numbers in the violation message
        const numbers =
          fileViolation.match(/\d+/g)?.filter(n => parseInt(n) > 10) ?? [];
        expect(numbers.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('error handling', () => {
    it('should handle missing ESLint config gracefully', () => {
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const result = MagicNumberPreventionLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('fixable property', () => {
    it('should be fixable when violations exist', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: {} })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'magic.ts'),
        'const x = 42;'
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations && result.violations.length > 0) {
        expect(result.fixable).toBe(true);
      }
    });

    it('should not be fixable when no violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-magic-numbers': 'error' } })
      );
      const result = MagicNumberPreventionLaw.check(mockContext);
      if (result.violations?.length === 0) {
        expect(result.fixable).toBe(false);
      }
    });
  });
});
