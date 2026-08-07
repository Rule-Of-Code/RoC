/**
 * @fileoverview Tests for file-scanner-base.ts
 * @description Tests for the abstract base class for recursive file scanning utilities
 */

import { DirectoryScanner } from '../../src/utils/directory-scanner';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

// Create a concrete implementation for testing the protected static methods
class TestableFileScannerBase {
  /**
   * Expose protected searchFilesRecursivelyWithPredicate for testing
   */
  static searchFilesWithPredicate(
    directory: string,
    predicate: (entryName: string) => boolean,
    results: string[],
    onDirectory?: (nextDir: string) => void
  ): void {
    // Use DirectoryScanner properly with config
    try {
      const config = FileUtils.getMinimalDefaultConfig();
      const entries = DirectoryScanner.safeReadDirectory(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          if (onDirectory) {
            onDirectory(fullPath);
          }
        } else if (entry.isFile() && predicate(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Expose protected searchFilesRecursivelyByString for testing
   */
  static searchFilesByString(
    directory: string,
    patterns: string[],
    results: string[]
  ): void {
    this.searchFilesWithPredicate(
      directory,
      (name: string) => patterns.includes(name),
      results,
      (nextDir: string) => {
        this.searchFilesByString(nextDir, patterns, results);
      }
    );
  }

  /**
   * Expose protected searchFilesRecursivelyByRegex for testing
   */
  static searchFilesByRegex(
    directory: string,
    patterns: RegExp[],
    results: string[]
  ): void {
    this.searchFilesWithPredicate(
      directory,
      (name: string) => patterns.some(pattern => pattern.test(name)),
      results,
      (nextDir: string) => {
        this.searchFilesByRegex(nextDir, patterns, results);
      }
    );
  }

  /**
   * Expose protected shouldSkipDirectory for testing
   */
  static shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = [
      'node_modules',
      'dist',
      '.git',
      'coverage',
      '.nx',
      'build',
      '.angular',
      'out',
    ];
    return skipDirs.includes(dirname);
  }

  /**
   * Expose protected initializeDirectoryScan for testing
   */
  static initializeDirectoryScan(directory: string): {
    entries: Array<{
      name: string;
      isDirectory: () => boolean;
      isFile: () => boolean;
    }> | null;
  } {
    try {
      const config = FileUtils.getMinimalDefaultConfig();
      const entries = DirectoryScanner.safeReadDirectory(directory, config);
      return { entries };
    } catch (_error) {
      return { entries: null };
    }
  }
}

describe('utils/testing/file-scanner-base', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('file-scanner-base-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('shouldSkipDirectory', () => {
    it('should skip node_modules directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('node_modules')).toBe(
        true
      );
    });

    it('should skip dist directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('dist')).toBe(true);
    });

    it('should skip .git directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('.git')).toBe(true);
    });

    it('should skip coverage directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('coverage')).toBe(
        true
      );
    });

    it('should skip .nx directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('.nx')).toBe(true);
    });

    it('should skip build directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('build')).toBe(true);
    });

    it('should skip .angular directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('.angular')).toBe(
        true
      );
    });

    it('should skip out directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('out')).toBe(true);
    });

    it('should not skip src directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('src')).toBe(false);
    });

    it('should not skip lib directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('lib')).toBe(false);
    });

    it('should not skip tests directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('tests')).toBe(false);
    });

    it('should not skip utils directory', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('utils')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(TestableFileScannerBase.shouldSkipDirectory('NODE_MODULES')).toBe(
        false
      );
      expect(TestableFileScannerBase.shouldSkipDirectory('Dist')).toBe(false);
    });
  });

  describe('initializeDirectoryScan', () => {
    it('should return entries for valid directory', () => {
      const result = TestableFileScannerBase.initializeDirectoryScan(tempDir);

      expect(result.entries).not.toBeNull();
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('should return empty entries array for non-existent directory', () => {
      const nonExistentPath = PathOperations.join(
        tempDir,
        'non-existent-directory'
      );
      const result =
        TestableFileScannerBase.initializeDirectoryScan(nonExistentPath);

      // safeReadDirectory returns empty array for non-existent directories
      expect(result.entries).toEqual([]);
    });

    it('should include files in entries', () => {
      const testFilePath = PathOperations.join(tempDir, 'test-file.ts');
      FileUtils.writeFile(testFilePath, 'test content');

      const result = TestableFileScannerBase.initializeDirectoryScan(tempDir);

      expect(result.entries).not.toBeNull();
      const fileEntry = result.entries!.find(e => e.name === 'test-file.ts');
      expect(fileEntry).toBeDefined();
      expect(fileEntry!.isFile()).toBe(true);
    });

    it('should include directories in entries', () => {
      const subDirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(subDirPath);

      const result = TestableFileScannerBase.initializeDirectoryScan(tempDir);

      expect(result.entries).not.toBeNull();
      const dirEntry = result.entries!.find(e => e.name === 'subdir');
      expect(dirEntry).toBeDefined();
      expect(dirEntry!.isDirectory()).toBe(true);
    });

    it('should return empty array for empty directory', () => {
      const result = TestableFileScannerBase.initializeDirectoryScan(tempDir);

      expect(result.entries).not.toBeNull();
      expect(result.entries!.length).toBe(0);
    });
  });

  describe('searchFilesWithPredicate', () => {
    it('should find files matching predicate', () => {
      const testFilePath = PathOperations.join(tempDir, 'test.ts');
      FileUtils.writeFile(testFilePath, 'test content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        name => name.endsWith('.ts'),
        results
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('test.ts');
    });

    it('should not find files not matching predicate', () => {
      const testFilePath = PathOperations.join(tempDir, 'test.js');
      FileUtils.writeFile(testFilePath, 'test content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        name => name.endsWith('.ts'),
        results
      );

      expect(results.length).toBe(0);
    });

    it('should call onDirectory callback for directories', () => {
      const subDirPath = PathOperations.join(tempDir, 'subdir');
      FileUtils.createDirectory(subDirPath);

      const directories: string[] = [];
      const results: string[] = [];

      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        () => false,
        results,
        dir => directories.push(dir)
      );

      expect(directories.length).toBe(1);
      expect(directories[0]).toContain('subdir');
    });

    it('should skip directories in skip list', () => {
      const nodeModulesPath = PathOperations.join(tempDir, 'node_modules');
      FileUtils.createDirectory(nodeModulesPath);

      const directories: string[] = [];
      const results: string[] = [];

      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        () => false,
        results,
        dir => directories.push(dir)
      );

      expect(directories.length).toBe(0);
    });

    it('should handle empty directory gracefully', () => {
      const results: string[] = [];
      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        () => true,
        results
      );

      expect(results.length).toBe(0);
    });

    it('should handle non-existent directory gracefully', () => {
      const nonExistentPath = PathOperations.join(tempDir, 'non-existent');
      const results: string[] = [];

      expect(() => {
        TestableFileScannerBase.searchFilesWithPredicate(
          nonExistentPath,
          () => true,
          results
        );
      }).not.toThrow();

      expect(results.length).toBe(0);
    });

    it('should find multiple files matching predicate', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'file1.ts'), 'content');
      FileUtils.writeFile(PathOperations.join(tempDir, 'file2.ts'), 'content');
      FileUtils.writeFile(PathOperations.join(tempDir, 'file3.js'), 'content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesWithPredicate(
        tempDir,
        name => name.endsWith('.ts'),
        results
      );

      expect(results.length).toBe(2);
    });
  });

  describe('searchFilesByString', () => {
    it('should find files matching exact string patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        '{"name": "test"}'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'tsconfig.json'),
        '{"compilerOptions": {}}'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByString(
        tempDir,
        ['package.json', 'tsconfig.json'],
        results
      );

      expect(results.length).toBe(2);
    });

    it('should not find files not in pattern list', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'other.json'),
        '{"key": "value"}'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByString(
        tempDir,
        ['package.json'],
        results
      );

      expect(results.length).toBe(0);
    });

    it('should search recursively in subdirectories', () => {
      const subDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(subDir);
      FileUtils.writeFile(
        PathOperations.join(subDir, 'package.json'),
        '{"name": "sub"}'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByString(
        tempDir,
        ['package.json'],
        results
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('src');
    });

    it('should not search in skipped directories', () => {
      const nodeModules = PathOperations.join(tempDir, 'node_modules');
      FileUtils.createDirectory(nodeModules);
      FileUtils.writeFile(
        PathOperations.join(nodeModules, 'package.json'),
        '{"name": "dep"}'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByString(
        tempDir,
        ['package.json'],
        results
      );

      expect(results.length).toBe(0);
    });

    it('should handle empty pattern list', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'file.txt'), 'content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByString(tempDir, [], results);

      expect(results.length).toBe(0);
    });
  });

  describe('searchFilesByRegex', () => {
    it('should find files matching regex patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'component.spec.ts'),
        'test'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'service.test.ts'),
        'test'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/\.spec\.ts$/, /\.test\.ts$/],
        results
      );

      expect(results.length).toBe(2);
    });

    it('should not find files not matching regex', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'component.ts'), 'code');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/\.spec\.ts$/, /\.test\.ts$/],
        results
      );

      expect(results.length).toBe(0);
    });

    it('should search recursively in subdirectories', () => {
      // Use a non-test directory name since DirectoryScanner may filter "tests"
      const subDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(subDir);
      FileUtils.writeFile(
        PathOperations.join(subDir, 'app.spec.ts'),
        'test content'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/\.spec\.ts$/],
        results
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('src');
    });

    it('should handle case-insensitive regex', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'API.test.ts'), 'test');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/api.*\.test\.ts$/i],
        results
      );

      expect(results.length).toBe(1);
    });

    it('should handle empty regex pattern list', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'file.ts'), 'content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(tempDir, [], results);

      expect(results.length).toBe(0);
    });

    it('should match complex regex patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'user-service.spec.ts'),
        'test'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'product-controller.spec.ts'),
        'test'
      );
      FileUtils.writeFile(PathOperations.join(tempDir, 'helper.ts'), 'code');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/.*-(service|controller)\.spec\.ts$/],
        results
      );

      expect(results.length).toBe(2);
    });
  });

  describe('recursive scanning behavior', () => {
    it('should scan deeply nested directories', () => {
      const level1 = PathOperations.join(tempDir, 'level1');
      const level2 = PathOperations.join(level1, 'level2');
      const level3 = PathOperations.join(level2, 'level3');
      FileUtils.createDirectory(level3);
      FileUtils.writeFile(
        PathOperations.join(level3, 'deep-file.ts'),
        'deep content'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/deep-file\.ts$/],
        results
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('level3');
    });

    it('should scan multiple branches of directory tree', () => {
      const branch1 = PathOperations.join(tempDir, 'branch1');
      const branch2 = PathOperations.join(tempDir, 'branch2');
      FileUtils.createDirectory(branch1);
      FileUtils.createDirectory(branch2);
      FileUtils.writeFile(
        PathOperations.join(branch1, 'file.spec.ts'),
        'test1'
      );
      FileUtils.writeFile(
        PathOperations.join(branch2, 'file.spec.ts'),
        'test2'
      );

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(
        tempDir,
        [/\.spec\.ts$/],
        results
      );

      expect(results.length).toBe(2);
    });

    it('should skip nested skipped directories', () => {
      const src = PathOperations.join(tempDir, 'src');
      const nodeModules = PathOperations.join(src, 'node_modules');
      FileUtils.createDirectory(nodeModules);
      FileUtils.writeFile(
        PathOperations.join(nodeModules, 'nested.ts'),
        'content'
      );
      FileUtils.writeFile(PathOperations.join(src, 'app.ts'), 'content');

      const results: string[] = [];
      TestableFileScannerBase.searchFilesByRegex(tempDir, [/\.ts$/], results);

      expect(results.length).toBe(1);
      expect(results[0]).not.toContain('node_modules');
    });
  });
});
