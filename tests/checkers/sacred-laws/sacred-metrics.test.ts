/**
 * Sacred Metrics Law - Tests
 * Comprehensive tests for SacredMetricsLaw class
 */
import { SacredMetricsLaw } from '../../../src/checkers/sacred-laws/sacred-metrics';
import type {
  LawCheckContext,
  RuleOfCodeConfig,
} from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('SacredMetricsLaw', () => {
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

  const createContext = (projectRoot: string): LawCheckContext => ({
    projectRoot,
    config: createMockConfig(),
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('sacred-metrics-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // check() - Basic functionality
  // ============================================
  describe('check()', () => {
    it('should return a LawResult object', () => {
      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should fail when no quality tools are configured', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result.passed).toBe(false);
      expect(result.violations!.length).toBeGreaterThan(0);
    });

    it('should include suggestions', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Testing Framework Detection
  // ============================================
  describe('Testing Framework Detection', () => {
    it('should detect jest', () => {
      // jest is present as a dependency, so it is detected and no testing
      // framework violation is reported
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // jest is detected, so no testing framework violation
      const hasTestViolation = result.violations!.some((v: string) =>
        v.includes('Testing framework not configured')
      );
      expect(hasTestViolation).toBe(false);
    });

    it('should detect vitest', () => {
      // vitest is present as a dependency, so it is detected
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            vitest: '^1.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // vitest is detected, so no testing framework violation
      const hasTestViolation = result.violations!.some((v: string) =>
        v.includes('Testing framework not configured')
      );
      expect(hasTestViolation).toBe(false);
    });

    it('should detect cypress', () => {
      // cypress is present as a dependency, so it is detected
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            cypress: '^13.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // cypress is detected, so no testing framework violation
      const hasTestViolation = result.violations!.some((v: string) =>
        v.includes('Testing framework not configured')
      );
      expect(hasTestViolation).toBe(false);
    });

    it('should flag missing testing framework', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTestViolation = result.violations!.some(v =>
        v.includes('Testing framework not configured')
      );
      expect(hasTestViolation).toBe(true);
    });
  });

  // ============================================
  // Quality Tools Detection
  // ============================================
  describe('Quality Tools Detection', () => {
    it('should detect eslint', () => {
      // eslint is present as a dependency, so it is detected
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // eslint is detected, so no quality tool violation for eslint
      const hasEslintViolation = result.violations!.some((v: string) =>
        v.includes('Quality tool missing: eslint')
      );
      expect(hasEslintViolation).toBe(false);
    });

    it('should detect prettier', () => {
      // prettier is present as a dependency, so it is detected
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // prettier is detected, so no quality tool violation for prettier
      const hasPrettierViolation = result.violations!.some((v: string) =>
        v.includes('Quality tool missing: prettier')
      );
      expect(hasPrettierViolation).toBe(false);
    });

    it('should detect typescript', () => {
      // typescript is present as a dependency, so it is detected
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // typescript is detected, so no quality tool violation for typescript
      const hasTypescriptViolation = result.violations!.some((v: string) =>
        v.includes('Quality tool missing: typescript')
      );
      expect(hasTypescriptViolation).toBe(false);
    });

    it('should flag missing eslint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasEslintViolation = result.violations!.some(v =>
        v.includes('Quality tool missing: eslint')
      );
      expect(hasEslintViolation).toBe(true);
    });

    it('should flag missing prettier', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasPrettierViolation = result.violations!.some(v =>
        v.includes('Quality tool missing: prettier')
      );
      expect(hasPrettierViolation).toBe(true);
    });

    it('should flag missing typescript', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTypescriptViolation = result.violations!.some(v =>
        v.includes('Quality tool missing: typescript')
      );
      expect(hasTypescriptViolation).toBe(true);
    });
  });

  // ============================================
  // TypeScript Configuration Detection
  // ============================================
  describe('TypeScript Configuration Detection', () => {
    it('should detect tsconfig.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTsConfigViolation = result.violations!.some(v =>
        v.includes('TypeScript configuration missing')
      );
      expect(hasTsConfigViolation).toBe(false);
    });

    it('should flag missing tsconfig.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTsConfigViolation = result.violations!.some(v =>
        v.includes('TypeScript configuration missing')
      );
      expect(hasTsConfigViolation).toBe(true);
    });
  });

  // ============================================
  // Full Compliance
  // ============================================
  describe('Full Compliance', () => {
    it('should pass when all metrics requirements are met', () => {
      // All dependencies and tsconfig are present, so all checks pass
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // All deps detected and tsconfig present, so full compliance
      expect(result.passed).toBe(true);
      expect(result.violations!.length).toBe(0);
    });
  });

  // ============================================
  // Score Calculation
  // ============================================
  describe('Score Calculation', () => {
    it('should return score 100 when all checks pass', () => {
      // All dependencies and tsconfig are present, so score is 100
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: { strict: true },
        })
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      // All checks pass, so score is 100
      expect(result.score).toBe(100);
    });

    it('should deduct points for violations', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result.score).toBeLessThan(100);
    });

    it('should not have negative scores', () => {
      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // Suggestions
  // ============================================
  describe('Suggestions', () => {
    it('should suggest configuring testing framework', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTestSuggestion = result.suggestions!.some(
        s =>
          s.toLowerCase().includes('testing') ||
          s.toLowerCase().includes('test')
      );
      expect(hasTestSuggestion).toBe(true);
    });

    it('should suggest setting up TypeScript', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasTsSuggestion = result.suggestions!.some(s =>
        s.toLowerCase().includes('typescript')
      );
      expect(hasTsSuggestion).toBe(true);
    });

    it('should suggest quality metrics monitoring', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      const hasMetricsSuggestion = result.suggestions!.some(
        s =>
          s.toLowerCase().includes('quality') ||
          s.toLowerCase().includes('metrics')
      );
      expect(hasMetricsSuggestion).toBe(true);
    });
  });

  // ============================================
  // Error Handling
  // ============================================
  describe('Error Handling', () => {
    it('should handle missing package.json', () => {
      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle non-existent project root gracefully', () => {
      const context = createContext('/non/existent/path');
      const result = SacredMetricsLaw.check(context);

      expect(result).toBeDefined();
    });

    it('should handle invalid tsconfig.json gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        'not valid json'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          version: '1.0.0',
          devDependencies: {
            jest: '^29.0.0',
            eslint: '^8.0.0',
            prettier: '^3.0.0',
            typescript: '^5.0.0',
          },
        })
      );

      const context = createContext(tempDir);
      const result = SacredMetricsLaw.check(context);

      expect(result).toBeDefined();
    });
  });
});
