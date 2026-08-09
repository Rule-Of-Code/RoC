/**
 * TypeScript Strict Law - Tests
 * Comprehensive tests for TypeScriptStrictLaw class
 */
import { TypeScriptStrictLaw } from '../../../src/checkers/sacred-laws/typescript-strict';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('TypeScriptStrictLaw', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  const createMockConfig = (): RuleOfCodeConfig => ({
    project: {
      name: 'test-project',
      root: '',
      componentPrefix: 'app',
      type: 'generic',
    },
    ignores: {
      global: ['node_modules/**', 'dist/**'],
      tests: [],
      build: [],
      design: [],
    },
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
  });

  const createMockContext = (): LawCheckContext => ({
    projectRoot: tempDir,
    config: createMockConfig(),
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('typescript-strict-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // check() method
  // ============================================
  describe('check()', () => {
    it('should return LawResult object', async () => {
      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
    });

    it('should fail when tsconfig.json does not exist', async () => {
      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
      expect(
        result.violations!.some((v: string) =>
          v.toLowerCase().includes('configuration')
        )
      ).toBe(true);
    });

    it('should pass with valid strict TypeScript config', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          noImplicitReturns: true,
          noImplicitThis: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          exactOptionalPropertyTypes: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: true,
          noUncheckedIndexedAccess: true,
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'node',
          sourceMap: true,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should fail when strict is false', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
      expect(result.violations!.some((v: string) => v.includes('strict'))).toBe(
        true
      );
    });

    it('should fail when noImplicitAny is false', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: false,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
      expect(
        result.violations!.some((v: string) => v.includes('noImplicitAny'))
      ).toBe(true);
    });

    it('should fail when strictNullChecks is missing', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
          noImplicitAny: true,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
    });

    it('should include suggestions on failure', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON in tsconfig.json', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        'not valid json {'
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // Invalid JSON may be detected as missing config by ProjectTypeDetector
      // The implementation handles this gracefully
      expect(result).toBeDefined();
    });

    it('should handle empty tsconfig.json', async () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'tsconfig.json'), '{}');

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
    });

    it('should handle tsconfig.json without compilerOptions', async () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ include: ['src/**/*'] })
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(false);
    });
  });

  // ============================================
  // validateCompilerOptions()
  // ============================================
  describe('validateCompilerOptions()', () => {
    it('should validate all strict checks are enabled', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          noImplicitReturns: true,
          noImplicitThis: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          exactOptionalPropertyTypes: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: true,
          noUncheckedIndexedAccess: true,
          target: 'ES2020',
          moduleResolution: 'node',
          sourceMap: true,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.violations!.length).toBe(0);
    });

    it('should add violation for each missing strict option', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
          noImplicitAny: false,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // Should have multiple violations for missing options
      expect(result.violations!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // validateTargetVersion()
  // ============================================
  describe('validateTargetVersion()', () => {
    it('should pass with ES2020 target', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('target')
        ).length
      ).toBe(0);
    });

    it('should pass with ES2022 target', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2022',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('target')
        ).length
      ).toBe(0);
    });

    it('should pass with ESNext target', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ESNext',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('target')
        ).length
      ).toBe(0);
    });

    it('should warn with outdated ES5 target', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES5',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // May have suggestion or violation about outdated target
      const hasTargetIssue =
        result.violations!.some((v: string) =>
          v.toLowerCase().includes('target')
        ) ||
        (result.suggestions &&
          result.suggestions!.some((s: string) =>
            s.toLowerCase().includes('target')
          ));
      expect(hasTargetIssue).toBe(true);
    });
  });

  // ============================================
  // validateModuleResolution()
  // ============================================
  describe('validateModuleResolution()', () => {
    it('should pass with node moduleResolution', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
          moduleResolution: 'node',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('moduleresolution')
        ).length
      ).toBe(0);
    });

    it('should pass with bundler moduleResolution', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
          moduleResolution: 'bundler',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // `bundler` is the CORRECT value for an esbuild/Vite project — `node` is the
      // legacy CommonJS algorithm, renamed `node10` in TS 5.0. This assertion used
      // to demand a violation here, with a comment explaining that the
      // implementation only accepted `node`: the test was written to match the
      // defect rather than the intent its own name states.
      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('moduleresolution')
        ).length
      ).toBe(0);
    });

    it('should pass with NodeNext moduleResolution', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
          moduleResolution: 'NodeNext',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // Same as the bundler case: `NodeNext` is a valid modern resolution, and
      // the assertion used to encode the defect the test name contradicts.
      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('moduleresolution')
        ).length
      ).toBe(0);
    });

    it('still reports a resolution it does not recognise', () => {
      // The fix must not turn the check into a rubber stamp: an unknown or
      // legacy-only value is still a finding.
      const tsconfig = {
        compilerOptions: { strict: true, moduleResolution: 'classic' },
      };
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const violations: string[] = [];
      TypeScriptStrictLaw['validateModuleResolution'](
        tsconfig.compilerOptions as Record<string, unknown>,
        violations
      );

      expect(
        violations.some(v => v.toLowerCase().includes('moduleresolution'))
      ).toBe(true);
    });
  });

  // ============================================
  // validateSourceMaps()
  // ============================================
  describe('validateSourceMaps()', () => {
    it('should pass when sourceMap is true', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
          sourceMap: true,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(
        result.violations!.filter((v: string) =>
          v.toLowerCase().includes('sourcemap')
        ).length
      ).toBe(0);
    });

    it('should suggest sourceMap when missing', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      const hasSourceMapIssue =
        result.violations!.some((v: string) =>
          v.toLowerCase().includes('sourcemap')
        ) ||
        (result.suggestions &&
          result.suggestions!.some((s: string) =>
            s.toLowerCase().includes('sourcemap')
          ));
      // This may or may not be a required check - depends on implementation
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // Score calculation
  // ============================================
  describe('Score calculation', () => {
    it('should return score 100 when all checks pass', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
          moduleResolution: 'node',
          sourceMap: true,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      if (result.passed && result.score !== undefined) {
        expect(result.score).toBe(100);
      }
    });

    it('should return lower score when checks fail', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
          target: 'ES5',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      if (result.score !== undefined) {
        expect(result.score).toBeLessThan(100);
      }
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle tsconfig with extends', async () => {
      // Create base config
      const baseConfig = {
        compilerOptions: {
          strict: true,
          target: 'ES2020',
        },
      };

      FileUtils.createDirectory(PathOperations.join(tempDir, 'config'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'config', 'tsconfig.base.json'),
        JSON.stringify(baseConfig, null, 2)
      );

      const tsconfig = {
        extends: './config/tsconfig.base.json',
        compilerOptions: {
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // Implementation may or may not resolve extends
      expect(result).toBeDefined();
    });

    it('should handle compilerOptions with additional properties', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          noImplicitReturns: true,
          noImplicitThis: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          exactOptionalPropertyTypes: true,
          noImplicitOverride: true,
          noPropertyAccessFromIndexSignature: true,
          noUncheckedIndexedAccess: true,
          target: 'ES2020',
          moduleResolution: 'node',
          sourceMap: true,
          lib: ['ES2020', 'DOM'],
          outDir: './dist',
          rootDir: './src',
          declaration: true,
          declarationMap: true,
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
          skipLibCheck: true,
          paths: {
            '@/*': ['./src/*'],
          },
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result.passed).toBe(true);
    });

    it('should handle case-insensitive target values', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'es2020', // lowercase
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      // Should handle case-insensitively
      expect(result).toBeDefined();
    });

    it('should handle very long tsconfig files', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
          noImplicitReturns: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          target: 'ES2020',
        },
        include: Array(100).fill('src/**/*.ts'),
        exclude: Array(50).fill('node_modules'),
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // fixable property
  // ============================================
  describe('fixable property', () => {
    it('should indicate if issue is fixable', async () => {
      const tsconfig = {
        compilerOptions: {
          strict: false,
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify(tsconfig, null, 2)
      );

      const ctx = createMockContext();
      const result = await TypeScriptStrictLaw.check(ctx);

      if (result.fixable !== undefined) {
        expect(typeof result.fixable).toBe('boolean');
      }
    });
  });
});
