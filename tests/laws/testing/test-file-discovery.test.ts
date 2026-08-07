/**
 * Tests for TestFileDiscovery
 *
 * Tests shared test file discovery logic used across all test analyzers.
 * Focus on the isTestFile method which is the core pure function.
 */
import { TestFileDiscovery } from '../../../src/laws/testing/test-file-discovery';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('TestFileDiscovery', () => {
  describe('isTestFile', () => {
    describe('valid test file patterns', () => {
      it('should return true for .spec.ts files', () => {
        expect(TestFileDiscovery.isTestFile('component.spec.ts')).toBe(true);
      });

      it('should return true for .test.ts files', () => {
        expect(TestFileDiscovery.isTestFile('service.test.ts')).toBe(true);
      });

      it('should return true for .spec.js files', () => {
        expect(TestFileDiscovery.isTestFile('util.spec.js')).toBe(true);
      });

      it('should return true for .test.js files', () => {
        expect(TestFileDiscovery.isTestFile('helper.test.js')).toBe(true);
      });

      it('should return true for .e2e-spec.ts files', () => {
        expect(TestFileDiscovery.isTestFile('app.e2e-spec.ts')).toBe(true);
      });

      it('should return true for .e2e-spec.js files', () => {
        expect(TestFileDiscovery.isTestFile('login.e2e-spec.js')).toBe(true);
      });
    });

    describe('invalid test file patterns', () => {
      it('should return false for regular .ts files', () => {
        expect(TestFileDiscovery.isTestFile('component.ts')).toBe(false);
      });

      it('should return false for regular .js files', () => {
        expect(TestFileDiscovery.isTestFile('service.js')).toBe(false);
      });

      it('should return false for .tsx files', () => {
        expect(TestFileDiscovery.isTestFile('component.tsx')).toBe(false);
      });

      it('should return false for .jsx files', () => {
        expect(TestFileDiscovery.isTestFile('component.jsx')).toBe(false);
      });

      it('should return false for .json files', () => {
        expect(TestFileDiscovery.isTestFile('package.json')).toBe(false);
      });

      it('should return false for .html files', () => {
        expect(TestFileDiscovery.isTestFile('index.html')).toBe(false);
      });

      it('should return false for .css files', () => {
        expect(TestFileDiscovery.isTestFile('styles.css')).toBe(false);
      });

      it('should return false for .scss files', () => {
        expect(TestFileDiscovery.isTestFile('styles.scss')).toBe(false);
      });

      it('should return false for .md files', () => {
        expect(TestFileDiscovery.isTestFile('README.md')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should return false for files with spec in name but not extension', () => {
        expect(TestFileDiscovery.isTestFile('spec-helper.ts')).toBe(false);
      });

      it('should return false for files with test in name but not extension', () => {
        expect(TestFileDiscovery.isTestFile('test-utils.ts')).toBe(false);
      });

      it('should return false for files with spec prefix', () => {
        expect(TestFileDiscovery.isTestFile('spec.config.ts')).toBe(false);
      });

      it('should return false for files with test prefix', () => {
        expect(TestFileDiscovery.isTestFile('testing.module.ts')).toBe(false);
      });

      it('should handle full paths with .spec.ts', () => {
        expect(TestFileDiscovery.isTestFile('src/app/component.spec.ts')).toBe(
          true
        );
      });

      it('should handle full paths with .test.ts', () => {
        expect(TestFileDiscovery.isTestFile('tests/unit/service.test.ts')).toBe(
          true
        );
      });

      it('should handle Windows-style paths', () => {
        expect(
          TestFileDiscovery.isTestFile('src\\app\\component.spec.ts')
        ).toBe(true);
      });

      it('should handle deeply nested paths', () => {
        expect(
          TestFileDiscovery.isTestFile('a/b/c/d/e/component.spec.ts')
        ).toBe(true);
      });

      it('should handle mixed case extensions', () => {
        // Extensions are case-sensitive in the implementation
        expect(TestFileDiscovery.isTestFile('app.SPEC.ts')).toBe(false);
        expect(TestFileDiscovery.isTestFile('app.TEST.ts')).toBe(false);
      });

      it('should handle empty string', () => {
        expect(TestFileDiscovery.isTestFile('')).toBe(false);
      });

      it('should handle filename-only e2e spec', () => {
        expect(TestFileDiscovery.isTestFile('user.e2e-spec.ts')).toBe(true);
      });
    });
  });

  describe('findTestFiles (integration)', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = FileUtils.createTempDirectory('test-file-discovery-int-');
    });

    afterEach(() => {
      FileUtils.deleteDirectory(tempDir);
    });

    it('should return empty array when no directories exist', () => {
      const config = FileUtils.getMinimalDefaultConfig();
      const result = TestFileDiscovery.findTestFiles(tempDir, config);
      expect(result).toEqual([]);
    });

    it('should return empty array when directories are empty', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const config = FileUtils.getMinimalDefaultConfig();
      const result = TestFileDiscovery.findTestFiles(tempDir, config);
      expect(result).toEqual([]);
    });

    it('should use custom search directories when provided', () => {
      const customDir = PathOperations.join(tempDir, 'custom');
      FileUtils.createDirectory(customDir);

      const config = FileUtils.getMinimalDefaultConfig();
      // Even if no files found, it should not throw
      const result = TestFileDiscovery.findTestFiles(tempDir, config, [
        customDir,
      ]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should skip non-existent directories gracefully', () => {
      const nonExistentDirs = [
        PathOperations.join(tempDir, 'does-not-exist'),
        PathOperations.join(tempDir, 'also-not-here'),
      ];

      const config = FileUtils.getMinimalDefaultConfig();
      const result = TestFileDiscovery.findTestFiles(
        tempDir,
        config,
        nonExistentDirs
      );
      expect(result).toEqual([]);
    });
  });

  describe('findTestFilesRecursively', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = FileUtils.createTempDirectory('test-file-recursive-');
    });

    afterEach(() => {
      FileUtils.deleteDirectory(tempDir);
    });

    it('should handle empty directory without throwing', () => {
      const emptyDir = PathOperations.join(tempDir, 'empty');
      FileUtils.createDirectory(emptyDir);

      const testFiles: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      expect(() => {
        TestFileDiscovery.findTestFilesRecursively(emptyDir, testFiles, config);
      }).not.toThrow();

      expect(testFiles).toEqual([]);
    });

    it('should append to existing testFiles array', () => {
      const emptyDir = PathOperations.join(tempDir, 'empty');
      FileUtils.createDirectory(emptyDir);

      const testFiles: string[] = ['/existing/test.spec.ts'];
      const config = FileUtils.getMinimalDefaultConfig();

      TestFileDiscovery.findTestFilesRecursively(emptyDir, testFiles, config);

      expect(testFiles).toContain('/existing/test.spec.ts');
    });

    it('should not modify array reference', () => {
      const emptyDir = PathOperations.join(tempDir, 'empty');
      FileUtils.createDirectory(emptyDir);

      const testFiles: string[] = [];
      const originalRef = testFiles;
      const config = FileUtils.getMinimalDefaultConfig();

      TestFileDiscovery.findTestFilesRecursively(emptyDir, testFiles, config);

      expect(testFiles).toBe(originalRef);
    });
  });

  describe('default search directories', () => {
    it('should check standard project directories', () => {
      // Verify that findTestFiles checks these standard directories
      const tempDir = FileUtils.createTempDirectory('default-dirs-test-');

      try {
        // Create all standard directories that should be searched
        const standardDirs = ['src', 'apps', 'libs', 'test', 'tests', 'e2e'];
        standardDirs.forEach(dir => {
          FileUtils.createDirectory(PathOperations.join(tempDir, dir));
        });

        const config = FileUtils.getMinimalDefaultConfig();
        // Should not throw when all directories exist
        const result = TestFileDiscovery.findTestFiles(tempDir, config);
        expect(Array.isArray(result)).toBe(true);
      } finally {
        FileUtils.deleteDirectory(tempDir);
      }
    });
  });

  describe('file pattern matching edge cases', () => {
    it('should correctly identify .spec pattern at end', () => {
      expect(TestFileDiscovery.isTestFile('my.component.spec.ts')).toBe(true);
      expect(TestFileDiscovery.isTestFile('my.service.spec.js')).toBe(true);
    });

    it('should correctly identify .test pattern at end', () => {
      expect(TestFileDiscovery.isTestFile('my.util.test.ts')).toBe(true);
      expect(TestFileDiscovery.isTestFile('my.helper.test.js')).toBe(true);
    });

    it('should correctly identify e2e-spec pattern', () => {
      expect(TestFileDiscovery.isTestFile('app.e2e-spec.ts')).toBe(true);
      expect(TestFileDiscovery.isTestFile('feature.e2e-spec.js')).toBe(true);
      expect(TestFileDiscovery.isTestFile('flow.e2e-spec.tsx')).toBe(true);
    });

    it('should not match incomplete patterns', () => {
      expect(TestFileDiscovery.isTestFile('app.spec')).toBe(false);
      expect(TestFileDiscovery.isTestFile('app.test')).toBe(false);
      expect(TestFileDiscovery.isTestFile('app.e2e-spec')).toBe(false);
    });

    it('should not match similar but different patterns', () => {
      expect(TestFileDiscovery.isTestFile('app-spec.ts')).toBe(false);
      expect(TestFileDiscovery.isTestFile('app_test.ts')).toBe(false);
      expect(TestFileDiscovery.isTestFile('appspec.ts')).toBe(false);
      expect(TestFileDiscovery.isTestFile('apptest.ts')).toBe(false);
    });
  });
});
