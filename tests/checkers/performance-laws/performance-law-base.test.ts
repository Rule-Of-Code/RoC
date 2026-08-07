/**
 * Tests for PerformanceLawBase
 *
 * Tests the base class that provides common functionality for performance-related laws
 */
import { PerformanceLawBase } from '../../../src/checkers/performance-laws/performance-law-base';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('PerformanceLawBase', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('performance-base-test-');
    mockConfig = FileUtils.getMinimalDefaultConfig();
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  // ============================================
  // createResult - Basic Behavior
  // ============================================
  describe('createResult()', () => {
    describe('when no violations exist', () => {
      it('should return passed=true', () => {
        const result = PerformanceLawBase.createResult(
          [],
          'Test Performance Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.passed).toBe(true);
      });

      it('should return score of 100', () => {
        const result = PerformanceLawBase.createResult(
          [],
          'Test Performance Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.score).toBe(100);
      });

      it('should not include fixable property by default', () => {
        const result = PerformanceLawBase.createResult(
          [],
          'Test Performance Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        // Base implementation does not include fixable property
        expect(result.fixable).toBeUndefined();
      });

      it('should include empty violations array', () => {
        const result = PerformanceLawBase.createResult(
          [],
          'Test Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.violations!).toEqual([]);
      });

      it('should include empty suggestions array', () => {
        const result = PerformanceLawBase.createResult(
          [],
          'Test Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.suggestions!).toEqual([]);
      });
    });

    describe('when violations exist', () => {
      it('should return passed=false', () => {
        const result = PerformanceLawBase.createResult(
          ['Violation 1'],
          'Test Performance Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.passed).toBe(false);
      });

      it('should not include fixable property by default', () => {
        const result = PerformanceLawBase.createResult(
          ['Violation 1'],
          'Test Performance Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        // Base implementation does not include fixable property
        expect(result.fixable).toBeUndefined();
      });

      it('should include violations in result', () => {
        const violations = ['Missing optimization', 'Large bundle size'];
        const result = PerformanceLawBase.createResult(
          violations,
          'Test Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.violations!).toEqual(violations);
      });

      it('should deduct points per violation', () => {
        const result = PerformanceLawBase.createResult(
          ['Violation 1', 'Violation 2'],
          'Test Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.score).toBeLessThan(100);
      });

      it('should not allow negative scores', () => {
        const violations = Array(15).fill('Violation');
        const result = PerformanceLawBase.createResult(
          violations,
          'Test Law',
          'PERFORMANCE',
          [],
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.score).toBeGreaterThanOrEqual(0);
      });
    });

    describe('suggestions handling', () => {
      it('should return empty suggestions when no violations', () => {
        // Base implementation only includes suggestions when there are violations
        const suggestions = ['Enable tree shaking', 'Add lazy loading'];
        const result = PerformanceLawBase.createResult(
          [],
          'Test Law',
          'PERFORMANCE',
          suggestions,
          { projectRoot: tempDir, config: mockConfig }
        );

        // Suggestions are only returned when violations exist
        expect(result.suggestions!).toEqual([]);
      });

      it('should include suggestions with violations', () => {
        const violations = ['Large bundle'];
        const suggestions = ['Split code into chunks'];
        const result = PerformanceLawBase.createResult(
          violations,
          'Test Law',
          'PERFORMANCE',
          suggestions,
          { projectRoot: tempDir, config: mockConfig }
        );

        expect(result.violations!).toEqual(violations);
        expect(result.suggestions!).toEqual(suggestions);
      });
    });
  });

  // ============================================
  // hasPerformanceConfig - Configuration Detection
  // ============================================
  describe('hasPerformanceConfig()', () => {
    it('should return false when no config files exist', () => {
      const result = (PerformanceLawBase as any).hasPerformanceConfig(tempDir);

      expect(result).toBe(false);
    });

    it('should return true when webpack.config.js exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack.config.js'),
        'module.exports = { mode: "production" };'
      );

      const result = (PerformanceLawBase as any).hasPerformanceConfig(tempDir);

      expect(result).toBe(true);
    });

    it('should return true when vite.config.ts exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'vite.config.ts'),
        'export default { build: {} };'
      );

      const result = (PerformanceLawBase as any).hasPerformanceConfig(tempDir);

      expect(result).toBe(true);
    });

    it('should return true when rollup.config.js exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'rollup.config.js'),
        'export default { input: "src/main.js" };'
      );

      const result = (PerformanceLawBase as any).hasPerformanceConfig(tempDir);

      expect(result).toBe(true);
    });

    it('should return true when performance.config.js exists', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'performance.config.js'),
        'module.exports = { budget: 1000 };'
      );

      const result = (PerformanceLawBase as any).hasPerformanceConfig(tempDir);

      expect(result).toBe(true);
    });
  });

  // ============================================
  // readFileContent - File Reading
  // ============================================
  describe('readFileContent()', () => {
    it('should return file content when file exists', () => {
      const filePath = PathOperations.join(tempDir, 'test.txt');
      FileUtils.writeFile(filePath, 'test content');

      const result = (PerformanceLawBase as any).readFileContent(filePath);

      expect(result).toBe('test content');
    });

    it('should return empty string when file does not exist', () => {
      const filePath = PathOperations.join(tempDir, 'nonexistent.txt');

      const result = (PerformanceLawBase as any).readFileContent(filePath);

      // FileUtils.readFile returns empty string for non-existent files
      expect(result).toBe('');
    });
  });

  // ============================================
  // fileExists - File Existence Check
  // ============================================
  describe('fileExists()', () => {
    it('should return true when file exists', () => {
      const filePath = PathOperations.join(tempDir, 'existing.txt');
      FileUtils.writeFile(filePath, 'content');

      const result = (PerformanceLawBase as any).fileExists(filePath);

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', () => {
      const filePath = PathOperations.join(tempDir, 'missing.txt');

      const result = (PerformanceLawBase as any).fileExists(filePath);

      expect(result).toBe(false);
    });
  });

  // ============================================
  // findJSFiles - JavaScript File Discovery
  // ============================================
  describe('findJSFiles()', () => {
    it('should return empty array when no source directories exist', () => {
      const result = (PerformanceLawBase as any).findJSFiles(
        tempDir,
        mockConfig
      );

      expect(result).toEqual([]);
    });

    it('should find TypeScript files in src directory', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.ts'),
        'export class App {}'
      );

      const result = (PerformanceLawBase as any).findJSFiles(
        tempDir,
        mockConfig
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((f: string) => f.includes('app.ts'))).toBe(true);
    });

    it('should find JavaScript files in lib directory', () => {
      const libDir = PathOperations.join(tempDir, 'lib');
      FileUtils.createDirectory(libDir);
      FileUtils.writeFile(
        PathOperations.join(libDir, 'utils.js'),
        'module.exports = {};'
      );

      const result = (PerformanceLawBase as any).findJSFiles(
        tempDir,
        mockConfig
      );

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((f: string) => f.includes('utils.js'))).toBe(true);
    });

    it('should find files in multiple source directories', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      const libDir = PathOperations.join(tempDir, 'lib');
      FileUtils.createDirectory(srcDir);
      FileUtils.createDirectory(libDir);
      FileUtils.writeFile(PathOperations.join(srcDir, 'main.ts'), 'export {}');
      FileUtils.writeFile(PathOperations.join(libDir, 'lib.ts'), 'export {}');

      const result = (PerformanceLawBase as any).findJSFiles(
        tempDir,
        mockConfig
      );

      expect(result.length).toBe(2);
    });
  });
});
