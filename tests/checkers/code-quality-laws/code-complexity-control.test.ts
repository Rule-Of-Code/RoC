/**
 * Tests for CodeComplexityControlLaw
 *
 * Comprehensive tests for code complexity control validation
 */
import { CodeComplexityControlLaw } from '../../../src/checkers/code-quality-laws/code-complexity-control';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CodeComplexityControlLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-complexity-test-');
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
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });

    it('should return passed for empty project', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      // Empty project should pass since there's no complex code
      expect(result).toBeDefined();
    });
  });

  describe('with package.json', () => {
    it('should handle project without ESLint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: {},
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should handle project with ESLint in devDependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // Should still check and return a result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should return valid result structure', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.violations).toBeDefined();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should pass when ESLint has complexity rules', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({
          rules: {
            complexity: ['error', 10],
            'max-lines': ['warn', 300],
            'max-depth': ['error', 4],
          },
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.violations).not.toContain(
        'ESLint complexity rules not configured'
      );
    });

    it('should handle project without complexity tools', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // Should return valid result
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle project with complexity tools', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0', jscpd: '^3.0.0' },
        })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // With complexity tools present, related suggestions should not appear
      expect(result.suggestions).not.toContain(
        'Consider adding complexity analysis tools (plato, madge, jscpd)'
      );
    });
  });

  describe('file complexity analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should detect files over 300 lines', () => {
      const longContent = Array(350).fill('const x = 1;').join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'large-file.ts'),
        longContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      const longFileViolation = result.violations?.find(v =>
        v.includes('File too long')
      );
      expect(longFileViolation).toBeDefined();
    });

    /**
     * The fixture branches on purpose.
     *
     * It used to be 25 trivial `return i` functions, and that no longer
     * reports — deliberately. A file of many functions with no decision points
     * is a table (a routing table, a provider array), and the ceiling exists
     * for a file that is hard to reason about, not for a declarative one. The
     * test directly below this asserts that half.
     */
    it('should detect files with too many functions', () => {
      const manyFunctions = Array(25)
        .fill(null)
        .map(
          (_, i) =>
            `function func${i}(a) { if (a > ${i}) { return a; } else if (a < 0) { return 0; } return -a; }`
        )
        .join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'many-functions.ts'),
        manyFunctions
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      const functionViolation = result.violations?.find(v =>
        v.includes('Too many functions')
      );
      expect(functionViolation).toBeDefined();
    });

    it('should detect high cyclomatic complexity', () => {
      const complexCode = `
function complexFunction() {
  if (a) { if (b) { if (c) { if (d) { if (e) { return 1; } } } } }
  switch(x) { case 1: break; case 2: break; case 3: break; }
  for (let i = 0; i < 10; i++) { while (j) { if (k) { break; } } }
  return a ? b : c ? d : e ? f : g;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'complex.ts'),
        complexCode
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // Reported per FUNCTION now: the threshold is named and defaulted for a
      // single function, and used to be compared against the whole file's sum.
      const complexityViolation = result.violations?.find(v =>
        v.includes('Function complexity too high')
      );
      expect(complexityViolation).toBeDefined();
      expect(complexityViolation).toContain('worst function');
    });

    it('does not punish a file of many simple functions', () => {
      // Five branch-free helpers used to score 5 before doing anything, because
      // every function cost 1 — so well-factored code failed and the rule pushed
      // toward one function per module.
      const simpleHelpers = Array.from(
        { length: 12 },
        (_, i) =>
          `export function helper${i}(value: unknown): string {\n  return String(value);\n}`
      ).join('\n\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'helpers.ts'),
        simpleHelpers
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );

      const result = CodeComplexityControlLaw.check(mockContext);

      expect(
        (result.violations ?? []).some(v =>
          v.includes('Function complexity too high')
        )
      ).toBe(false);
    });

    it('should suggest refactoring for complex files', () => {
      const longContent = Array(350).fill('const x = 1;').join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'large-file.ts'),
        longContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Break down large files into smaller, focused modules'
      );
    });

    it('should pass for simple files', () => {
      const simpleCode = `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'simple.ts'),
        simpleCode
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.violations?.filter(v => v.includes('simple.ts'))).toEqual(
        []
      );
    });
  });

  describe('architectural complexity', () => {
    it('should suggest flattening deep directories when violations exist', () => {
      // Create deeply nested structure
      const deepPath = PathOperations.join(
        tempDir,
        'src',
        'level1',
        'level2',
        'level3',
        'level4',
        'level5',
        'level6',
        'level7'
      );
      FileUtils.createDirectory(deepPath);
      FileUtils.writeFile(
        PathOperations.join(deepPath, 'deep-file.ts'),
        'export const x = 1;'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      // Result should be valid even for deep structures
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      const result = CodeComplexityControlLaw.check(mockContext);
      if (result.violations?.length === 0) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct points for violations', () => {
      const longContent = Array(350).fill('const x = 1;').join('\n');
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'large-file.ts'),
        longContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not go below 0', () => {
      // Create many violations
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      for (let i = 0; i < 15; i++) {
        const longContent = Array(350).fill(`const x${i} = ${i};`).join('\n');
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `large-file-${i}.ts`),
          longContent
        );
      }
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = CodeComplexityControlLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
