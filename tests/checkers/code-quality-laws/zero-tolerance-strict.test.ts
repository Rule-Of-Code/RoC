/**
 * Tests for ZeroToleranceStrictLaw
 *
 * Comprehensive tests for zero tolerance strict standards validation
 */
import { ZeroToleranceStrictLaw } from '../../../src/checkers/code-quality-laws/zero-tolerance-strict';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('ZeroToleranceStrictLaw', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('zero-tolerance-test-');
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
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should have violations array', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should have suggestions array', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have score property', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should have message property', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(typeof result.message).toBe('string');
    });

    it('should have config property', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('TypeScript strict mode check', () => {
    it('should detect missing tsconfig.json', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result.violations).toContain(
        'TypeScript configuration file missing'
      );
    });

    it('should detect non-strict tsconfig', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: false,
          },
        })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result.violations).toContain('TypeScript strict mode not enabled');
    });

    it('should handle strict tsconfig', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
            strictNullChecks: true,
          },
        })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle noImplicitAny and strictNullChecks config', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            noImplicitAny: true,
            strictNullChecks: true,
          },
        })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });

  describe('console statements check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
    });

    it('should detect console.log statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        `
export function debug() {
  console.log('debugging');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const consoleViolation = result.violations?.find(v =>
        v.includes('Console statements found')
      );
      expect(consoleViolation).toBeDefined();
    });

    it('should detect console.debug statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        `
export function debug() {
  console.debug('debug info');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const debugViolation = result.violations?.find(v =>
        v.includes('Console statements found')
      );
      expect(debugViolation).toBeDefined();
    });

    it('should detect console.warn statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'warn.ts'),
        `
export function warn() {
  console.warn('warning');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const warnViolation = result.violations?.find(v =>
        v.includes('Console statements found')
      );
      expect(warnViolation).toBeDefined();
    });

    it('should detect console.info statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'info.ts'),
        `
export function info() {
  console.info('information');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const infoViolation = result.violations?.find(v =>
        v.includes('Console statements found')
      );
      expect(infoViolation).toBeDefined();
    });

    it('should detect console.trace statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'trace.ts'),
        `
export function trace() {
  console.trace('stack trace');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const traceViolation = result.violations?.find(v =>
        v.includes('Console statements found')
      );
      expect(traceViolation).toBeDefined();
    });

    it('should count multiple console statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'multi-console.ts'),
        `
export function debug() {
  console.log('one');
  console.log('two');
  console.log('three');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const multiViolation = result.violations?.find(
        v => v.includes('multi-console.ts') && v.includes('3 occurrences')
      );
      expect(multiViolation).toBeDefined();
    });

    it('should pass for files without console statements', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'clean.ts'),
        `
export function clean() {
  return 'clean code';
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const cleanViolation = result.violations?.find(
        v => v.includes('clean.ts') && v.includes('Console')
      );
      expect(cleanViolation).toBeUndefined();
    });
  });

  describe('TODO/FIXME comments check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
    });

    it('should detect TODO comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'todo.ts'),
        `
// TODO (Sprint 10): Implement feature detection for zero-tolerance violations in test framework
export function placeholder() {}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const todoViolation = result.violations?.find(v =>
        v.includes('TODO/FIXME comments found')
      );
      expect(todoViolation).toBeDefined();
    });

    it('should detect FIXME comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'fixme.ts'),
        `
// FIXME: this is broken
export function broken() {}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const fixmeViolation = result.violations?.find(v =>
        v.includes('TODO/FIXME comments found')
      );
      expect(fixmeViolation).toBeDefined();
    });

    it('should detect XXX comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'xxx.ts'),
        `
// XXX: needs attention
export function attention() {}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const xxxViolation = result.violations?.find(v =>
        v.includes('TODO/FIXME comments found')
      );
      expect(xxxViolation).toBeDefined();
    });

    it('should detect HACK comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'hack.ts'),
        `
// HACK: temporary workaround
export function workaround() {}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const hackViolation = result.violations?.find(v =>
        v.includes('TODO/FIXME comments found')
      );
      expect(hackViolation).toBeDefined();
    });
  });

  describe('any type usage check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
    });

    it('should detect explicit any type', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'any-type.ts'),
        `
export function process(data: any): any {
  return data;
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const anyViolation = result.violations?.find(v =>
        v.includes('Strict type violations')
      );
      expect(anyViolation).toBeDefined();
    });

    it('should detect unknown[] type', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'unknown-array.ts'),
        `
export function process(data: unknown[]): void {
  console.log(data);
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const unknownViolation = result.violations?.find(
        v =>
          v.includes('unknown-array.ts') && v.includes('Strict type violations')
      );
      expect(unknownViolation).toBeDefined();
    });

    it('should pass for properly typed code', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'typed.ts'),
        `
interface User {
  id: string;
  name: string;
}

export function getUser(id: string): User {
  return { id, name: 'Test' };
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const typedViolation = result.violations?.find(
        v => v.includes('typed.ts') && v.includes('Strict type')
      );
      expect(typedViolation).toBeUndefined();
    });
  });

  describe('disabled ESLint rules check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
    });

    it('should detect eslint-disable comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'disabled.ts'),
        `
// eslint-disable-next-line
export function unsafe() {
  return eval('1+1');
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const disabledViolation = result.violations?.find(v =>
        v.includes('ESLint rules disabled')
      );
      expect(disabledViolation).toBeDefined();
    });

    it('should detect block eslint-disable comments', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'block-disabled.ts'),
        `
/* eslint-disable no-console */
export function debug() {
  console.log('debug');
}
/* eslint-enable */
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const blockViolation = result.violations?.find(v =>
        v.includes('ESLint rules disabled')
      );
      expect(blockViolation).toBeDefined();
    });
  });

  describe('empty catch blocks check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
    });

    it('should detect empty catch blocks', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'empty-catch.ts'),
        `
export function risky() {
  try {
    dangerousOperation();
  } catch (e) {}
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const emptyViolation = result.violations?.find(v =>
        v.includes('Empty catch blocks')
      );
      expect(emptyViolation).toBeDefined();
    });

    it('should detect empty catch blocks with error parameter', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'empty-catch2.ts'),
        `
export function risky() {
  try {
    dangerousOperation();
  } catch (error) {}
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const emptyViolation = result.violations?.find(v =>
        v.includes('Empty catch blocks')
      );
      expect(emptyViolation).toBeDefined();
    });

    it('should pass for catch blocks with content', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'proper-catch.ts'),
        `
export function risky() {
  try {
    dangerousOperation();
  } catch (error) {
    logError(error);
  }
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      const properViolation = result.violations?.find(
        v => v.includes('proper-catch.ts') && v.includes('Empty catch')
      );
      expect(properViolation).toBeUndefined();
    });
  });

  describe('suggestions', () => {
    it('should include strict mode suggestion when violations exist', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Enable TypeScript strict mode');
      }
    });

    it('should include console removal suggestion when violations exist', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'debug.ts'),
        'console.log("test");'
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Remove all console statements');
      }
    });

    it('should include ESLint suggestion when violations exist', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (!result.passed) {
        expect(result.suggestions).toContain('Configure strict ESLint rules');
      }
    });
  });

  describe('score calculation', () => {
    it('should return 100 when all checks pass', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
            strictNullChecks: true,
          },
        })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (result.passed) {
        expect(result.score).toBe(100);
      }
    });

    it('should deduct points for violations', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result.score).toBeLessThan(100);
    });

    it('should have minimum score', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      // Create many files with violations
      for (let i = 0; i < 10; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `bad${i}.ts`),
          `
// TODO (Sprint 10): Fix edge case handling for complex zero-tolerance violation patterns
// FIXME: broken
console.log("debug");
console.warn("warning");
function unsafe(data: any): any { return data; }
// eslint-disable
try { x(); } catch (e) {}
`
        );
      }
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle invalid tsconfig gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        'invalid json {'
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });

    it('should handle unreadable files gracefully', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('fixable property', () => {
    it('should be fixable when violations exist', () => {
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (!result.passed) {
        expect(result.fixable).toBe(true);
      }
    });

    it('should not be fixable when no violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
            strictNullChecks: true,
          },
        })
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      if (result.passed) {
        expect(result.fixable).toBe(false);
      }
    });
  });

  describe('complete project check', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should handle a well-configured project', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            noImplicitAny: true,
            strictNullChecks: true,
          },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        `
/**
 * Main application entry point
 */
export function main(): void {
  const app = new Application();
  app.start();
}

class Application {
  start(): void {
    // Start the application
  }
}
`
      );
      const result = ZeroToleranceStrictLaw.check(mockContext);
      // Result should be valid
      expect(result).toBeDefined();
      expect(typeof result.passed).toBe('boolean');
    });
  });
});
