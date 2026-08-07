/**
 * @fileoverview Tests for file-system-searcher.ts
 * @description Tests for the generic file system searcher utility
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';
import { FileSystemSearcher } from '../../src/utils/testing/file-system-searcher';

describe('utils/testing/file-system-searcher', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('file-system-searcher-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('matchesExactName', () => {
    it('should return true for exact match', () => {
      const result = FileSystemSearcher.matchesExactName('package.json', [
        'package.json',
        'tsconfig.json',
      ]);

      expect(result).toBe(true);
    });

    it('should return false for no match', () => {
      const result = FileSystemSearcher.matchesExactName('other.json', [
        'package.json',
        'tsconfig.json',
      ]);

      expect(result).toBe(false);
    });

    it('should return false for partial match', () => {
      const result = FileSystemSearcher.matchesExactName('package', [
        'package.json',
      ]);

      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const result = FileSystemSearcher.matchesExactName('PACKAGE.JSON', [
        'package.json',
      ]);

      expect(result).toBe(false);
    });

    it('should return false for empty names list', () => {
      const result = FileSystemSearcher.matchesExactName('file.txt', []);

      expect(result).toBe(false);
    });

    it('should match first item in list', () => {
      const result = FileSystemSearcher.matchesExactName('first.ts', [
        'first.ts',
        'second.ts',
        'third.ts',
      ]);

      expect(result).toBe(true);
    });

    it('should match last item in list', () => {
      const result = FileSystemSearcher.matchesExactName('third.ts', [
        'first.ts',
        'second.ts',
        'third.ts',
      ]);

      expect(result).toBe(true);
    });

    it('should handle empty filename', () => {
      const result = FileSystemSearcher.matchesExactName('', ['', 'file.ts']);

      expect(result).toBe(true);
    });
  });

  describe('matchesPatterns', () => {
    it('should return true when pattern matches', () => {
      const result = FileSystemSearcher.matchesPatterns('component.spec.ts', [
        /\.spec\.ts$/,
      ]);

      expect(result).toBe(true);
    });

    it('should return false when no pattern matches', () => {
      const result = FileSystemSearcher.matchesPatterns('component.ts', [
        /\.spec\.ts$/,
        /\.test\.ts$/,
      ]);

      expect(result).toBe(false);
    });

    it('should match any of multiple patterns', () => {
      const result = FileSystemSearcher.matchesPatterns('service.test.ts', [
        /\.spec\.ts$/,
        /\.test\.ts$/,
      ]);

      expect(result).toBe(true);
    });

    it('should return false for empty patterns list', () => {
      const result = FileSystemSearcher.matchesPatterns('file.ts', []);

      expect(result).toBe(false);
    });

    it('should match case-insensitive patterns', () => {
      const result = FileSystemSearcher.matchesPatterns('API.test.ts', [
        /api\.test\.ts$/i,
      ]);

      expect(result).toBe(true);
    });

    it('should match complex regex patterns', () => {
      const result = FileSystemSearcher.matchesPatterns(
        'user-service.spec.ts',
        [/^[a-z-]+\.(spec|test)\.ts$/]
      );

      expect(result).toBe(true);
    });

    it('should handle partial matches correctly', () => {
      const result = FileSystemSearcher.matchesPatterns('test-file.ts', [
        /^test/,
      ]);

      expect(result).toBe(true);
    });

    it('should match patterns at beginning of string', () => {
      const result = FileSystemSearcher.matchesPatterns('__tests__/file.ts', [
        /^__tests__/,
      ]);

      expect(result).toBe(true);
    });
  });

  describe('hasExtension', () => {
    it('should return true for matching extension', () => {
      const result = FileSystemSearcher.hasExtension('file.ts', ['.ts', '.js']);

      expect(result).toBe(true);
    });

    it('should return false for non-matching extension', () => {
      const result = FileSystemSearcher.hasExtension('file.py', ['.ts', '.js']);

      expect(result).toBe(false);
    });

    it('should return false for empty extensions list', () => {
      const result = FileSystemSearcher.hasExtension('file.ts', []);

      expect(result).toBe(false);
    });

    it('should handle files without extensions', () => {
      const result = FileSystemSearcher.hasExtension('Makefile', ['.ts']);

      expect(result).toBe(false);
    });

    it('should handle double extensions', () => {
      const result = FileSystemSearcher.hasExtension('component.spec.ts', [
        '.ts',
      ]);

      expect(result).toBe(true);
    });

    it('should be case-sensitive for extensions', () => {
      const result = FileSystemSearcher.hasExtension('file.TS', ['.ts']);

      expect(result).toBe(false);
    });

    it('should match extension with dot', () => {
      const result = FileSystemSearcher.hasExtension('styles.css', ['.css']);

      expect(result).toBe(true);
    });

    it('should not match partial extension', () => {
      const result = FileSystemSearcher.hasExtension('file.tsx', ['.ts']);

      expect(result).toBe(false);
    });

    it('should match first extension in list', () => {
      const result = FileSystemSearcher.hasExtension('app.js', [
        '.js',
        '.ts',
        '.jsx',
      ]);

      expect(result).toBe(true);
    });

    it('should match last extension in list', () => {
      const result = FileSystemSearcher.hasExtension('app.jsx', [
        '.js',
        '.ts',
        '.jsx',
      ]);

      expect(result).toBe(true);
    });
  });

  describe('containsPattern', () => {
    it('should return true when filename contains pattern', () => {
      const result = FileSystemSearcher.containsPattern('user-service.ts', [
        'service',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when filename does not contain pattern', () => {
      const result = FileSystemSearcher.containsPattern('user-controller.ts', [
        'service',
      ]);

      expect(result).toBe(false);
    });

    it('should match any of multiple patterns', () => {
      const result = FileSystemSearcher.containsPattern('data-repository.ts', [
        'service',
        'repository',
        'controller',
      ]);

      expect(result).toBe(true);
    });

    it('should return false for empty patterns list', () => {
      const result = FileSystemSearcher.containsPattern('file.ts', []);

      expect(result).toBe(false);
    });

    it('should be case-sensitive', () => {
      const result = FileSystemSearcher.containsPattern('UserService.ts', [
        'service',
      ]);

      expect(result).toBe(false);
    });

    it('should match at beginning of filename', () => {
      const result = FileSystemSearcher.containsPattern('test-helper.ts', [
        'test',
      ]);

      expect(result).toBe(true);
    });

    it('should match at end of filename', () => {
      const result = FileSystemSearcher.containsPattern('api-test.ts', [
        'test',
      ]);

      expect(result).toBe(true);
    });

    it('should match in middle of filename', () => {
      const result = FileSystemSearcher.containsPattern('user-test-helper.ts', [
        'test',
      ]);

      expect(result).toBe(true);
    });

    it('should handle empty filename', () => {
      const result = FileSystemSearcher.containsPattern('', ['test']);

      expect(result).toBe(false);
    });
  });

  describe('searchFilesRecursively', () => {
    it('should find files matching predicate in root directory', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'file.ts'), 'content');
      FileUtils.writeFile(PathOperations.join(tempDir, 'file.js'), 'content');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        () => false,
        results,
        config
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('file.ts');
    });

    it('should find files in subdirectories', () => {
      const subDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(subDir);
      FileUtils.writeFile(PathOperations.join(subDir, 'app.ts'), 'content');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        () => false,
        results,
        config
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('src');
    });

    it('should skip directories based on predicate', () => {
      const nodeModules = PathOperations.join(tempDir, 'node_modules');
      FileUtils.createDirectory(nodeModules);
      FileUtils.writeFile(
        PathOperations.join(nodeModules, 'dep.ts'),
        'content'
      );
      FileUtils.writeFile(PathOperations.join(tempDir, 'app.ts'), 'content');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        dirname => dirname === 'node_modules',
        results,
        config
      );

      expect(results.length).toBe(1);
      expect(results[0]).not.toContain('node_modules');
    });

    it('should handle empty directory', () => {
      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        () => true,
        () => false,
        results,
        config
      );

      expect(results.length).toBe(0);
    });

    it('should handle non-existent directory gracefully', () => {
      const nonExistent = PathOperations.join(tempDir, 'non-existent');
      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      expect(() => {
        FileSystemSearcher.searchFilesRecursively(
          nonExistent,
          () => true,
          () => false,
          results,
          config
        );
      }).not.toThrow();

      expect(results.length).toBe(0);
    });

    it('should find multiple files matching predicate', () => {
      FileUtils.writeFile(PathOperations.join(tempDir, 'a.ts'), 'a');
      FileUtils.writeFile(PathOperations.join(tempDir, 'b.ts'), 'b');
      FileUtils.writeFile(PathOperations.join(tempDir, 'c.ts'), 'c');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        () => false,
        results,
        config
      );

      expect(results.length).toBe(3);
    });

    it('should recursively scan deeply nested directories', () => {
      const level1 = PathOperations.join(tempDir, 'level1');
      const level2 = PathOperations.join(level1, 'level2');
      const level3 = PathOperations.join(level2, 'level3');
      FileUtils.createDirectory(level3);
      FileUtils.writeFile(PathOperations.join(level3, 'deep.ts'), 'deep');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        () => false,
        results,
        config
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('level3');
    });

    it('should skip multiple directories', () => {
      const skipDirs = ['node_modules', 'dist', '.git'];

      for (const dir of skipDirs) {
        const dirPath = PathOperations.join(tempDir, dir);
        FileUtils.createDirectory(dirPath);
        FileUtils.writeFile(PathOperations.join(dirPath, 'file.ts'), 'content');
      }

      const src = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(src);
      FileUtils.writeFile(PathOperations.join(src, 'app.ts'), 'content');

      const results: string[] = [];
      const config = FileUtils.getMinimalDefaultConfig();

      FileSystemSearcher.searchFilesRecursively(
        tempDir,
        name => name.endsWith('.ts'),
        dirname => skipDirs.includes(dirname),
        results,
        config
      );

      expect(results.length).toBe(1);
      expect(results[0]).toContain('src');
    });
  });

  describe('combined matcher usage patterns', () => {
    it('should combine hasExtension and containsPattern', () => {
      const filename = 'user-service.ts';

      const hasCorrectExtension = FileSystemSearcher.hasExtension(filename, [
        '.ts',
      ]);
      const containsService = FileSystemSearcher.containsPattern(filename, [
        'service',
      ]);

      expect(hasCorrectExtension).toBe(true);
      expect(containsService).toBe(true);
    });

    it('should use matchesPatterns for test file detection', () => {
      const testFiles = [
        'component.spec.ts',
        'service.test.ts',
        'helper.spec.js',
      ];

      const testPatterns = [/\.spec\.(ts|js)$/, /\.test\.(ts|js)$/];

      const results = testFiles.filter(file =>
        FileSystemSearcher.matchesPatterns(file, testPatterns)
      );

      expect(results.length).toBe(3);
    });

    it('should use matchesExactName for config file detection', () => {
      const files = ['package.json', 'tsconfig.json', 'readme.md', 'index.ts'];

      const configFiles = ['package.json', 'tsconfig.json', 'jest.config.js'];

      const results = files.filter(file =>
        FileSystemSearcher.matchesExactName(file, configFiles)
      );

      expect(results.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle files with special characters in names', () => {
      const result = FileSystemSearcher.containsPattern('file-with-dashes.ts', [
        '-',
      ]);

      expect(result).toBe(true);
    });

    it('should handle unicode filenames', () => {
      const result = FileSystemSearcher.matchesExactName('файл.ts', [
        'файл.ts',
      ]);

      expect(result).toBe(true);
    });

    it('should handle very long filenames', () => {
      const longName = 'a'.repeat(200) + '.ts';

      const result = FileSystemSearcher.hasExtension(longName, ['.ts']);

      expect(result).toBe(true);
    });

    it('should handle filenames with multiple dots', () => {
      const result = FileSystemSearcher.matchesPatterns(
        'component.module.spec.ts',
        [/\.spec\.ts$/]
      );

      expect(result).toBe(true);
    });

    it('should handle hidden files', () => {
      const result = FileSystemSearcher.matchesExactName('.gitignore', [
        '.gitignore',
      ]);

      expect(result).toBe(true);
    });

    it('should handle filenames starting with dot for extensions', () => {
      const result = FileSystemSearcher.hasExtension('.eslintrc', [
        '.eslintrc',
      ]);

      expect(result).toBe(true);
    });
  });
});
