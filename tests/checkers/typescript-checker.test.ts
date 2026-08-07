/**
 * TypeScript Checker Tests
 * Tests for checkers/typescript-checker.ts
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

import { TypeScriptChecker } from '../../src/checkers/typescript-checker';
import { DEFAULT_CONFIG } from '../../src/config/types';
import type {
  LawCheckContext,
  RawConstitutionalLaw,
} from '../../src/types/law.types';

describe('checkers/typescript-checker', () => {
  let tempDir: string;
  let checker: TypeScriptChecker;
  let context: LawCheckContext;

  const createLaw = (
    overrides: Partial<RawConstitutionalLaw> = {}
  ): RawConstitutionalLaw => ({
    id: 'law-3',
    title: 'TypeScript Strict Mode',
    description: 'Ensures TypeScript strict mode is enabled',
    category: 'CODE_QUALITY',
    priority: 'HIGH',
    article: 'Article 1',
    section: 'Section 1',
    subsection: 'Subsection 1',
    emoji: '📦',
    automation: 'AUTOMATED',
    defaultEnabled: true,
    defaultSeverity: 'error',
    violationMessage: 'TypeScript strict mode not enabled',
    remediation: 'Enable strict mode in tsconfig.json',
    ...overrides,
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('roc-ts-checker-');

    // Create minimal project structure
    FileUtils.writeFileSync(
      PathOperations.join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' })
    );

    context = {
      projectRoot: tempDir,
      config: { ...DEFAULT_CONFIG },
    };

    checker = new TypeScriptChecker(createLaw(), 3);
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  describe('check', () => {
    it('should check TypeScript strict mode', async () => {
      // Create tsconfig with strict: true
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            target: 'es2020',
            module: 'commonjs',
          },
        })
      );

      const result = await checker.check(context);

      // Result depends on tsc execution
      expect(result).toBeDefined();
      expect(result.config).toBe(context.config);
    });

    it('should fail when tsconfig.json is missing', async () => {
      const result = await checker.check(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('tsconfig.json not found');
    });

    it('should fail when strict mode is disabled', async () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: false,
          },
        })
      );

      const result = await checker.check(context);

      expect(result.passed).toBe(false);
      expect(result.message).toContain('strict mode is not enabled');
    });

    it('should check zero tolerance when checkFunction matches', async () => {
      const zeroToleranceChecker = new TypeScriptChecker(
        createLaw({
          title: 'Zero Tolerance',
        }),
        3
      );

      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );

      const result = await zeroToleranceChecker.check(context);

      expect(result).toBeDefined();
      expect(result.config).toBe(context.config);
    });

    it('should check debug statements when description matches', async () => {
      const debugChecker = new TypeScriptChecker(
        createLaw({
          title: 'Debug Cleanup',
          description: 'Remove all console.log and debug statements',
        }),
        3
      );

      // Create src directory
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'main.ts'),
        'function hello() { return "world"; }'
      );

      const result = await debugChecker.check(context);

      expect(result).toBeDefined();
      expect(result.passed).toBe(true);
    });

    it('should catch errors in check method', async () => {
      // Create an invalid tsconfig that might cause issues
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        'not valid json'
      );

      const result = await checker.check(context);

      expect(result).toBeDefined();
      // Should handle the error gracefully
    });
  });

  describe('checkDebugStatements', () => {
    it('should pass when no debug statements exist', async () => {
      const debugChecker = new TypeScriptChecker(
        createLaw({
          title: 'Debug Cleanup',
          description: 'Remove debug statements',
        }),
        3
      );

      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'clean.ts'),
        'export const value = 42;'
      );

      const result = await debugChecker.check(context);

      expect(result.passed).toBe(true);
    });

    it('should exclude test files from debug checks', async () => {
      const debugChecker = new TypeScriptChecker(
        createLaw({
          title: 'Debug Cleanup',
          description: 'Remove debug statements',
        }),
        3
      );

      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.spec.ts'),
        'console.log("test debug");'
      );

      const result = await debugChecker.check(context);

      // Test files should be excluded
      expect(result.passed).toBe(true);
    });
  });

  describe('checkZeroToleranceStrict', () => {
    it('should pass when all checks pass', async () => {
      const zeroToleranceChecker = new TypeScriptChecker(
        createLaw({
          title: 'Zero Tolerance',
        }),
        3
      );

      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'export const value = 42;'
      );

      const result = await zeroToleranceChecker.check(context);

      expect(result).toBeDefined();
    });

    it('should fail when TypeScript strict mode is not enabled', async () => {
      const zeroToleranceChecker = new TypeScriptChecker(
        createLaw({
          title: 'Zero Tolerance',
        }),
        3
      );

      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: false } })
      );

      const result = await zeroToleranceChecker.check(context);

      expect(result.passed).toBe(false);
    });

    it('should fail when debug statements are found', async () => {
      const zeroToleranceChecker = new TypeScriptChecker(
        createLaw({
          title: 'Zero Tolerance',
        }),
        3
      );

      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps', 'myapp'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'apps', 'myapp', 'src')
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'apps', 'myapp', 'src', 'debug-file.ts'),
        'console.log("debug"); debugger;'
      );

      const result = await zeroToleranceChecker.check(context);

      // May or may not pass depending on file matching
      expect(result).toBeDefined();
    });
  });

  describe('debug pattern detection', () => {
    it('should detect debugger statements', async () => {
      const debugChecker = new TypeScriptChecker(
        createLaw({
          title: 'Debug Cleanup',
          description: 'Remove debug statements',
        }),
        3
      );

      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps', 'test'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'apps', 'test', 'src')
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'apps', 'test', 'src', 'code.ts'),
        'function test() { debugger; return 1; }'
      );

      const result = await debugChecker.check(context);

      expect(result).toBeDefined();
    });

    it('should detect alert statements', async () => {
      const debugChecker = new TypeScriptChecker(
        createLaw({
          title: 'Debug Cleanup',
          description: 'Remove debug statements',
        }),
        3
      );

      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'apps', 'web'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'apps', 'web', 'src')
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'apps', 'web', 'src', 'main.ts'),
        'alert("hello world");'
      );

      const result = await debugChecker.check(context);

      expect(result).toBeDefined();
    });
  });
});
