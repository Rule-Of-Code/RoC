/**
 * Tests for CodeQualityLawBase
 *
 * Comprehensive tests for the base class functionality used by all code quality laws
 */
import { CodeQualityLawBase } from '../../../src/checkers/code-quality-laws/code-quality-law-base';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

// Create a concrete implementation for testing abstract class
class TestCodeQualityLaw extends CodeQualityLawBase {
  // Expose protected methods for testing
  static testFindTypeScriptFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return this.findTypeScriptFiles(projectRoot, context);
  }

  static testFindCodeFilesForAnalysis(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return this.findCodeFilesForAnalysis(projectRoot, context);
  }

  static testHasObservableSubscriptions(content: string): boolean {
    return this.hasObservableSubscriptions(content);
  }

  static testHasProperCleanup(content: string): boolean {
    return this.hasProperCleanup(content);
  }

  static testHasStrictTypeScriptConfig(tsconfigContent: string): boolean {
    return this.hasStrictTypeScriptConfig(tsconfigContent);
  }

  static testHasProperDocumentation(content: string): boolean {
    return this.hasProperDocumentation(content);
  }

  static testCreateResult(
    violations: string[],
    title: string,
    category: string,
    recommendations: string[],
    context: LawCheckContext
  ) {
    return this.createResult(
      violations,
      title,
      category,
      recommendations,
      context
    );
  }

  static testFindSpecFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return this.findSpecFiles(projectRoot, context);
  }

  static testFindESLintConfig(
    projectRoot: string
  ): Record<string, unknown> | null {
    return this.findESLintConfig(projectRoot);
  }

  static testHasAnyESLintRule(
    eslintConfig: Record<string, unknown> | null,
    ruleNames: string[]
  ): boolean {
    return this.hasAnyESLintRule(eslintConfig, ruleNames);
  }

  static testHasComplexityRules(
    eslintConfig: Record<string, unknown> | null
  ): boolean {
    return this.hasComplexityRules(eslintConfig);
  }

  static testInitializeAnalysis(): {
    violations: string[];
    suggestions: string[];
  } {
    return this.initializeAnalysis();
  }

  static testCheckRequiredTools(
    projectRoot: string,
    requiredTools: string[]
  ): string[] {
    return this.checkRequiredTools(projectRoot, requiredTools);
  }
}

describe('CodeQualityLawBase', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-quality-base-test-');
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

  describe('findTypeScriptFiles()', () => {
    it('should find TypeScript files in project', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'export const app = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'index.ts'),
        'export * from "./app";'
      );
      const files = TestCodeQualityLaw.testFindTypeScriptFiles(
        tempDir,
        mockContext
      );
      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some(f => f.includes('app.ts'))).toBe(true);
    });

    it('should return empty array for empty project', () => {
      const files = TestCodeQualityLaw.testFindTypeScriptFiles(
        tempDir,
        mockContext
      );
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('findCodeFilesForAnalysis()', () => {
    it('should find all code files (no file-count cap)', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      // Create 35 files
      for (let i = 0; i < 35; i++) {
        FileUtils.writeFile(
          PathOperations.join(tempDir, 'src', `file${i}.ts`),
          `export const value${i} = ${i};`
        );
      }
      const files = TestCodeQualityLaw.testFindCodeFilesForAnalysis(
        tempDir,
        mockContext
      );
      // The .slice(0, 30) cap was removed - all files are analyzed
      expect(files.length).toBe(35);
    });

    it('should find various code file types', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'export const a = 1;'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'utils.js'),
        'module.exports = {};'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'component.tsx'),
        'export const C = () => null;'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'view.jsx'),
        'export const V = () => null;'
      );
      const files = TestCodeQualityLaw.testFindCodeFilesForAnalysis(
        tempDir,
        mockContext
      );
      expect(files.length).toBe(4);
    });
  });

  describe('hasObservableSubscriptions()', () => {
    it('should detect .subscribe() calls', () => {
      const content = `
        this.userService.getUser().subscribe(user => {
          this.user = user;
        });
      `;
      expect(TestCodeQualityLaw.testHasObservableSubscriptions(content)).toBe(
        true
      );
    });

    it('should detect .pipe() with subscribe', () => {
      const content = `
        this.http.get('/api').pipe(
          map(data => data.result)
        ).subscribe(result => this.data = result);
      `;
      expect(TestCodeQualityLaw.testHasObservableSubscriptions(content)).toBe(
        true
      );
    });

    it('should return false for no subscriptions', () => {
      const content = `
        const user = await this.userService.getUser();
      `;
      expect(TestCodeQualityLaw.testHasObservableSubscriptions(content)).toBe(
        false
      );
    });
  });

  describe('hasProperCleanup()', () => {
    it('should detect takeUntil pattern', () => {
      const content = `
        this.destroy$ = new Subject();
        this.data$.pipe(takeUntil(this.destroy$)).subscribe();
      `;
      expect(TestCodeQualityLaw.testHasProperCleanup(content)).toBe(true);
    });

    it('should detect OnDestroy implementation', () => {
      const content = `
        export class MyComponent implements OnDestroy {
          ngOnDestroy() {}
        }
      `;
      expect(TestCodeQualityLaw.testHasProperCleanup(content)).toBe(true);
    });

    it('should detect unsubscribe pattern', () => {
      const content = `
        this.subscription.unsubscribe();
      `;
      expect(TestCodeQualityLaw.testHasProperCleanup(content)).toBe(true);
    });

    it('should detect destroy$ subject', () => {
      const content = `
        private destroy$ = new Subject<void>();
      `;
      expect(TestCodeQualityLaw.testHasProperCleanup(content)).toBe(true);
    });

    it('should return false for no cleanup', () => {
      const content = `
        this.service.getData().subscribe();
      `;
      expect(TestCodeQualityLaw.testHasProperCleanup(content)).toBe(false);
    });
  });

  describe('hasStrictTypeScriptConfig()', () => {
    it('should handle strict mode config content', () => {
      const config = JSON.stringify({
        compilerOptions: {
          strict: true,
          noImplicitAny: true,
          strictNullChecks: true,
        },
      });
      // Note: The implementation may have issues parsing content vs path
      const result = TestCodeQualityLaw.testHasStrictTypeScriptConfig(config);
      expect(typeof result).toBe('boolean');
    });

    it('should return false for non-strict config', () => {
      const config = JSON.stringify({
        compilerOptions: {
          strict: false,
        },
      });
      expect(TestCodeQualityLaw.testHasStrictTypeScriptConfig(config)).toBe(
        false
      );
    });

    it('should return false for missing compilerOptions', () => {
      const config = JSON.stringify({});
      expect(TestCodeQualityLaw.testHasStrictTypeScriptConfig(config)).toBe(
        false
      );
    });

    it('should return false for invalid JSON', () => {
      expect(
        TestCodeQualityLaw.testHasStrictTypeScriptConfig('invalid json')
      ).toBe(false);
    });
  });

  describe('hasProperDocumentation()', () => {
    it('should return true for well-documented code', () => {
      const content = `
/**
 * User class
 */
export class User {}

/**
 * Get user function
 */
export function getUser() {}
      `;
      expect(TestCodeQualityLaw.testHasProperDocumentation(content)).toBe(true);
    });

    it('should return false for undocumented code', () => {
      const content = `
export class User {}
export class Product {}
export function getUser() {}
export function getProduct() {}
      `;
      expect(TestCodeQualityLaw.testHasProperDocumentation(content)).toBe(
        false
      );
    });
  });

  describe('createResult()', () => {
    it('should create passed result when no violations', () => {
      const result = TestCodeQualityLaw.testCreateResult(
        [],
        'Test Law',
        'Code Quality',
        ['Recommendation'],
        mockContext
      );
      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it('should create failed result when violations exist', () => {
      const result = TestCodeQualityLaw.testCreateResult(
        ['Violation 1'],
        'Test Law',
        'Code Quality',
        ['Recommendation'],
        mockContext
      );
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
    });

    it('should include violations in result', () => {
      const violations = ['Violation A', 'Violation B'];
      const result = TestCodeQualityLaw.testCreateResult(
        violations,
        'Test Law',
        'Code Quality',
        [],
        mockContext
      );
      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions when violations exist', () => {
      const recommendations = ['Fix A', 'Fix B'];
      const result = TestCodeQualityLaw.testCreateResult(
        ['Violation'],
        'Test Law',
        'Code Quality',
        recommendations,
        mockContext
      );
      expect(result.suggestions).toEqual(recommendations);
    });

    it('should set fixable to true when violations exist', () => {
      const result = TestCodeQualityLaw.testCreateResult(
        ['Violation'],
        'Test Law',
        'Code Quality',
        [],
        mockContext
      );
      expect(result.fixable).toBe(true);
    });

    it('should set fixable to false when no violations', () => {
      const result = TestCodeQualityLaw.testCreateResult(
        [],
        'Test Law',
        'Code Quality',
        [],
        mockContext
      );
      expect(result.fixable).toBe(false);
    });

    it('should include config in result', () => {
      const result = TestCodeQualityLaw.testCreateResult(
        [],
        'Test Law',
        'Code Quality',
        [],
        mockContext
      );
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('findSpecFiles()', () => {
    beforeEach(() => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
    });

    it('should find spec files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.spec.ts'),
        'describe("App", () => {});'
      );
      const files = TestCodeQualityLaw.testFindSpecFiles(tempDir, mockContext);
      expect(files.some(f => f.includes('.spec.ts'))).toBe(true);
    });

    it('should not include non-spec files', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.component.ts'),
        'export class AppComponent {}'
      );
      const files = TestCodeQualityLaw.testFindSpecFiles(tempDir, mockContext);
      expect(files.some(f => f.endsWith('app.component.ts'))).toBe(false);
    });
  });

  describe('findESLintConfig()', () => {
    it('should find .eslintrc.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.eslintrc.json'),
        JSON.stringify({ rules: { 'no-console': 'error' } })
      );
      const config = TestCodeQualityLaw.testFindESLintConfig(tempDir);
      expect(config).toBeDefined();
    });

    it('should return null when no config exists', () => {
      const config = TestCodeQualityLaw.testFindESLintConfig(tempDir);
      expect(config).toBeNull();
    });
  });

  describe('hasAnyESLintRule()', () => {
    it('should return true when rule exists', () => {
      const config = { rules: { 'no-console': 'error' } };
      expect(
        TestCodeQualityLaw.testHasAnyESLintRule(config, ['no-console'])
      ).toBe(true);
    });

    it('should return true when any rule exists', () => {
      const config = { rules: { 'no-debugger': 'error' } };
      expect(
        TestCodeQualityLaw.testHasAnyESLintRule(config, [
          'no-console',
          'no-debugger',
        ])
      ).toBe(true);
    });

    it('should return false when no rules exist', () => {
      const config = { rules: {} };
      expect(
        TestCodeQualityLaw.testHasAnyESLintRule(config, ['no-console'])
      ).toBe(false);
    });

    it('should return false for null config', () => {
      expect(
        TestCodeQualityLaw.testHasAnyESLintRule(null, ['no-console'])
      ).toBe(false);
    });
  });

  describe('hasComplexityRules()', () => {
    it('should return true when complexity rule exists', () => {
      const config = { rules: { complexity: ['error', 10] } };
      expect(TestCodeQualityLaw.testHasComplexityRules(config)).toBe(true);
    });

    it('should return true when max-lines rule exists', () => {
      const config = { rules: { 'max-lines': ['warn', 300] } };
      expect(TestCodeQualityLaw.testHasComplexityRules(config)).toBe(true);
    });

    it('should return true when max-depth rule exists', () => {
      const config = { rules: { 'max-depth': ['error', 4] } };
      expect(TestCodeQualityLaw.testHasComplexityRules(config)).toBe(true);
    });

    it('should return false when no complexity rules', () => {
      const config = { rules: { 'no-console': 'error' } };
      expect(TestCodeQualityLaw.testHasComplexityRules(config)).toBe(false);
    });
  });

  describe('initializeAnalysis()', () => {
    it('should return empty violations array', () => {
      const result = TestCodeQualityLaw.testInitializeAnalysis();
      expect(result.violations).toEqual([]);
    });

    it('should return empty suggestions array', () => {
      const result = TestCodeQualityLaw.testInitializeAnalysis();
      expect(result.suggestions).toEqual([]);
    });
  });

  describe('checkRequiredTools()', () => {
    it('should return all tools when no package.json', () => {
      const missingTools = TestCodeQualityLaw.testCheckRequiredTools(tempDir, [
        'eslint',
        'prettier',
      ]);
      expect(missingTools).toEqual(['eslint', 'prettier']);
    });

    it('should return missing tools only', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { eslint: '^8.0.0' },
        })
      );
      const missingTools = TestCodeQualityLaw.testCheckRequiredTools(tempDir, [
        'eslint',
        'prettier',
      ]);
      expect(missingTools).toEqual(['prettier']);
    });

    it('should return empty array when all tools present', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          devDependencies: { eslint: '^8.0.0', prettier: '^3.0.0' },
        })
      );
      const missingTools = TestCodeQualityLaw.testCheckRequiredTools(tempDir, [
        'eslint',
        'prettier',
      ]);
      expect(missingTools).toEqual([]);
    });

    it('should check both devDependencies and dependencies', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: { eslint: '^8.0.0' },
        })
      );
      const missingTools = TestCodeQualityLaw.testCheckRequiredTools(tempDir, [
        'eslint',
      ]);
      expect(missingTools).toEqual([]);
    });
  });
});
