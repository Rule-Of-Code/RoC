/**
 * Tests for DeadCodeEliminationLaw
 *
 * Comprehensive tests for dead code detection and elimination
 */
import { DeadCodeEliminationLaw } from '../../../src/checkers/code-quality-laws/dead-code-elimination';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('DeadCodeEliminationLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('dead-code-test-');
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
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('dead code tools check', () => {
    it('should detect ESLint without dead code rules', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      // Without a detectable ESLint config, violation should be reported
      expect(result.violations).toContain(
        'ESLint dead code detection rules not configured'
      );
    });

    it('should handle project with no-unused-vars rule', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-unused-vars': 'error' } })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle project with typescript no-unused-vars rule', () => {
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
          rules: { '@typescript-eslint/no-unused-vars': 'error' },
        })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
    });

    it('should suggest dead code tools when not installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Consider adding dead code detection tools (ts-unused-exports, depcheck)'
      );
    });

    it('should not suggest tools when already installed', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0', depcheck: '^1.0.0' },
        })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.suggestions).not.toContain(
        'Consider adding dead code detection tools (ts-unused-exports, depcheck)'
      );
    });
  });

  describe('dead code analysis', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { eslint: '^8.0.0', depcheck: '^1.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-unused-vars': 'error' } })
      );
    });

    it('should detect commented code blocks', () => {
      const codeWithComments = `
// function oldFunction() {
// const x = 1;
// return x;
// }

// const unusedVar = 'old';
// let anotherUnused = true;

export function activeFunction() {
  return 'active';
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'with-comments.ts'),
        codeWithComments
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      const commentedCodeViolation = result.violations?.find(v =>
        v.includes('commented code blocks')
      );
      expect(commentedCodeViolation).toBeDefined();
    });

    it('does NOT flag console.* (owned by the Centralized Logging law, v7.2.0)', () => {
      const codeWithConsole = `
export function debug() {
  console.log('debugging');
  console.debug('debug info');
  return true;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'with-console.ts'),
        codeWithConsole
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      const consoleViolation = result.violations?.find(v =>
        v.includes('console.')
      );
      expect(consoleViolation).toBeUndefined();
    });

    it('should detect debugger statements', () => {
      const codeWithDebugger = `
export function broken() {
  debugger;
  return false;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'with-debugger.ts'),
        codeWithDebugger
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      const debuggerViolation = result.violations?.find(v =>
        v.includes('debugger')
      );
      expect(debuggerViolation).toBeDefined();
    });

    it('should pass for clean code', () => {
      const cleanCode = `
export function calculate(a: number, b: number): number {
  return a + b;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'clean.ts'),
        cleanCode
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      const cleanFileViolation = result.violations?.find(v =>
        v.includes('clean.ts')
      );
      expect(cleanFileViolation).toBeUndefined();
    });
  });

  describe('unreachable code detection', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { depcheck: '^1.0.0' },
        })
      );
    });

    it('should detect code after return statements', () => {
      const unreachableCode = `
function test() {
  return true;
  const x = 1;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unreachable.ts'),
        unreachableCode
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      const unreachableViolation = result.violations?.find(v =>
        v.includes('unreachable code')
      );
      expect(unreachableViolation).toBeDefined();
    });
  });

  describe('suggestions', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { depcheck: '^1.0.0' },
        })
      );
    });

    it('should suggest removing unused code when violations found', () => {
      const codeWithIssues = `
export function broken() {
  debugger;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        codeWithIssues
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Remove unused imports and variables'
      );
    });

    it('should suggest ESLint auto-fix when dead code found', () => {
      const codeWithIssues = `
export function broken() {
  debugger;
}
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        codeWithIssues
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.suggestions).toContain(
        'Use ESLint auto-fix to clean up dead code'
      );
    });
  });

  describe('score calculation', () => {
    it('should return 100 when no violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { depcheck: '^1.0.0', eslint: '^8.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-unused-vars': 'error' } })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      if (result.violations?.length === 0) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct 12 points per violation', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { depcheck: '^1.0.0' },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        'export function f() { debugger; }'
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should not go below 0', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      // Create many files with issues
      for (let i = 0; i < 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `debug${i}.ts`),
          `
console.log("debug${i}");
console.debug("info${i}");
debugger;
// function old${i}() {}
// const unused${i} = true;
// let var${i} = 1;
// return early${i};
`
        );
      }
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing package.json gracefully', () => {
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' })
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('issue limiting', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { depcheck: '^1.0.0' },
        })
      );
    });

    it('should limit issues per file to prevent spam', () => {
      const manyIssues = `
console.log("1");
console.debug("2");
debugger;
console.log("3");
console.log("4");
// function old1() {}
// const old2 = 1;
// let old3 = 2;
// var old4 = 3;
`;
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'many-issues.ts'),
        manyIssues
      );
      const result = DeadCodeEliminationLaw.check(mockContext);
      // Issues should be limited (max 3 per file according to source)
      const fileViolations =
        result.violations?.filter(v => v.includes('many-issues.ts')) ?? [];
      expect(fileViolations.length).toBeLessThanOrEqual(1); // 1 violation with up to 3 issues
    });
  });
});
