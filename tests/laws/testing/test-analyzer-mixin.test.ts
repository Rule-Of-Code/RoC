/**
 * Tests for TestAnalyzerMixin
 *
 * Tests the shared test file discovery patterns across testing analyzers.
 * Note: The findTestFilesInDirectories method uses CheckerUtils.findTypeScriptFiles
 * which applies the default config that ignores .spec.ts and .test.ts files.
 * These tests focus on the behavior with non-ignored TypeScript files.
 */
import { TestAnalyzerMixin } from '../../../src/laws/testing/test-analyzer-mixin';
import type { RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

// Minimal config: findTestFilesInDirectories scans with useConfigFiltering=false,
// so the config is never dereferenced for filtering during test discovery.
const testConfig = {
  ignores: { global: [], tests: [], build: [], design: [] },
} as unknown as RuleOfCodeConfig;

/**
 * Concrete implementation for testing the protected static methods
 */
class TestableAnalyzerMixin extends TestAnalyzerMixin {
  static findTestFiles(
    projectRoot: string,
    searchDirs: string[],
    isTestFile: (filepath: string) => boolean
  ): string[] {
    return this.findTestFilesInDirectories(
      projectRoot,
      searchDirs,
      isTestFile,
      testConfig
    );
  }

  static getTestSearchDirs(
    projectRoot: string,
    additionalDirs: string[] = []
  ): string[] {
    return this.buildTestSearchDirs(projectRoot, additionalDirs);
  }
}

describe('TestAnalyzerMixin', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('test-analyzer-mixin-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('findTestFilesInDirectories', () => {
    // Note: The default config ignores .spec.ts and .test.ts files
    // So these tests use non-ignored file patterns like .component.ts, .service.ts

    it('should find TypeScript files matching the predicate function', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'utils.ts'),
        'export const util = () => {};'
      );

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isComponentFile
      );

      expect(result.length).toBe(1);
      expect(result[0]).toContain('app.component.ts');
    });

    it('should search multiple directories', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      const libDir = PathOperations.join(tempDir, 'lib');
      FileUtils.createDirectory(srcDir);
      FileUtils.createDirectory(libDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(libDir, 'shared.component.ts'),
        'export class SharedComponent {}'
      );

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir, libDir],
        isComponentFile
      );

      expect(result.length).toBe(2);
    });

    it('should skip non-existent directories gracefully', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      const nonExistentDir = PathOperations.join(tempDir, 'nonexistent');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir, nonExistentDir],
        isComponentFile
      );

      expect(result.length).toBe(1);
    });

    it('should return empty array when no files match predicate', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.service.ts'),
        'export class AppService {}'
      );

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isComponentFile
      );

      expect(result.length).toBe(0);
    });

    it('should handle custom predicate functions', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.service.ts'),
        'export class AppService {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'user.service.ts'),
        'export class UserService {}'
      );

      const isServiceFile = (file: string) => file.includes('.service.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isServiceFile
      );

      expect(result.length).toBe(2);
    });

    it('should find files in nested subdirectories', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      const featuresDir = PathOperations.join(srcDir, 'features');
      FileUtils.createDirectory(featuresDir);
      FileUtils.writeFile(
        PathOperations.join(featuresDir, 'feature.component.ts'),
        'export class FeatureComponent {}'
      );

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isComponentFile
      );

      expect(result.length).toBe(1);
      expect(result[0]).toContain('feature.component.ts');
    });

    it('should handle empty directories', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isComponentFile
      );

      expect(result.length).toBe(0);
    });

    it('should work with various file patterns', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.module.ts'),
        'export class AppModule {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.routing.ts'),
        'export const routes = [];'
      );

      const isModuleFile = (file: string) => file.includes('.module.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isModuleFile
      );

      expect(result.length).toBe(1);
      expect(result[0]).toContain('app.module.ts');
    });

    it('should handle mixed file types with complex predicate', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.component.ts'),
        'export class AppComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'app.service.ts'),
        'export class AppService {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'utils.ts'),
        'export const util = () => {};'
      );

      // Predicate to find component or service files
      const isAngularFile = (file: string) =>
        file.includes('.component.') || file.includes('.service.');

      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isAngularFile
      );

      expect(result.length).toBe(2);
    });
  });

  describe('buildTestSearchDirs', () => {
    it('should include default test directories', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir);

      expect(result).toContain(PathOperations.join(tempDir, 'src'));
      expect(result).toContain(PathOperations.join(tempDir, 'tests'));
      expect(result).toContain(PathOperations.join(tempDir, 'test'));
      expect(result).toContain(PathOperations.join(tempDir, 'e2e'));
    });

    it('should add additional directories to the list', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir, [
        'integration',
        'acceptance',
      ]);

      expect(result).toContain(PathOperations.join(tempDir, 'integration'));
      expect(result).toContain(PathOperations.join(tempDir, 'acceptance'));
    });

    it('should return correct number of directories with additional', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir, [
        'custom',
      ]);

      // 4 default + 1 additional
      expect(result.length).toBe(5);
    });

    it('should return 4 default directories without additional', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir);

      expect(result.length).toBe(4);
    });

    it('should handle empty additional directories array', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir, []);

      expect(result.length).toBe(4);
    });

    it('should use absolute paths for all directories', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs(tempDir, [
        'custom',
      ]);

      result.forEach(dir => {
        expect(PathOperations.isAbsolute(dir)).toBe(true);
      });
    });

    it('should correctly join project root with directory names', () => {
      const result = TestableAnalyzerMixin.getTestSearchDirs('/project/root', [
        'specs',
      ]);

      expect(result).toContain('/project/root/specs');
      expect(result).toContain('/project/root/src');
    });
  });

  describe('integration scenarios', () => {
    it('should work with combined buildTestSearchDirs and findTestFilesInDirectories', () => {
      // Setup directories
      const srcDir = PathOperations.join(tempDir, 'src');
      const testsDir = PathOperations.join(tempDir, 'tests');
      FileUtils.createDirectory(srcDir);
      FileUtils.createDirectory(testsDir);

      // Create TypeScript files (non-test files since .spec.ts are ignored)
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'src.component.ts'),
        'export class SrcComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(testsDir, 'tests.component.ts'),
        'export class TestsComponent {}'
      );

      // Use the combination pattern
      const searchDirs = TestableAnalyzerMixin.getTestSearchDirs(tempDir);
      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        searchDirs,
        isComponentFile
      );

      expect(result.length).toBe(2);
    });

    it('should find files across all default directories', () => {
      // Setup all default directories with component files
      const dirs = ['src', 'tests', 'test', 'e2e'];
      dirs.forEach(dir => {
        const fullPath = PathOperations.join(tempDir, dir);
        FileUtils.createDirectory(fullPath);
        FileUtils.writeFile(
          PathOperations.join(fullPath, `${dir}.component.ts`),
          `export class ${dir}Component {}`
        );
      });

      const searchDirs = TestableAnalyzerMixin.getTestSearchDirs(tempDir);
      const isComponentFile = (file: string) => file.includes('.component.');
      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        searchDirs,
        isComponentFile
      );

      expect(result.length).toBe(4);
    });

    it('should support multiple file types with complex predicate', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      FileUtils.writeFile(
        PathOperations.join(srcDir, 'a.component.ts'),
        'export class AComponent {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'b.service.ts'),
        'export class BService {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'c.module.ts'),
        'export class CModule {}'
      );
      FileUtils.writeFile(
        PathOperations.join(srcDir, 'd.utils.ts'),
        'export const util = () => {};'
      );

      const isAngularPattern = (file: string) =>
        file.includes('.component.') ||
        file.includes('.service.') ||
        file.includes('.module.');

      const result = TestableAnalyzerMixin.findTestFiles(
        tempDir,
        [srcDir],
        isAngularPattern
      );

      expect(result.length).toBe(3);
    });
  });
});
