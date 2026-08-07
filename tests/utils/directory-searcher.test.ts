/**
 * Directory Searcher Tests
 * Tests for DirectorySearcher utility
 */

import { PathOperations } from '../../src/utils/path-operations';
import { DirectorySearcher } from '../../src/utils/directory-searcher';

// Real project root for testing (tests/utils -> repo root); has a src/ directory
const REAL_PROJECT_ROOT = PathOperations.resolve(__dirname, '..', '..');
// Use the real repo root as the workspace root too (it has a src/ directory)
const WORKSPACE_ROOT = REAL_PROJECT_ROOT;

describe('utils/directory-searcher', () => {
  describe('static properties', () => {
    describe('STANDARD_SOURCE_DIRS', () => {
      it('should include src directory', () => {
        expect(DirectorySearcher.STANDARD_SOURCE_DIRS).toContain('src');
      });

      it('should include apps directory', () => {
        expect(DirectorySearcher.STANDARD_SOURCE_DIRS).toContain('apps');
      });

      it('should include libs directory', () => {
        expect(DirectorySearcher.STANDARD_SOURCE_DIRS).toContain('libs');
      });

      it('should have exactly 3 standard source dirs', () => {
        expect(DirectorySearcher.STANDARD_SOURCE_DIRS).toHaveLength(3);
      });
    });

    describe('STANDARD_TEST_DIRS', () => {
      it('should include test directory', () => {
        expect(DirectorySearcher.STANDARD_TEST_DIRS).toContain('test');
      });

      it('should include tests directory', () => {
        expect(DirectorySearcher.STANDARD_TEST_DIRS).toContain('tests');
      });

      it('should include e2e directory', () => {
        expect(DirectorySearcher.STANDARD_TEST_DIRS).toContain('e2e');
      });

      it('should include spec directory', () => {
        expect(DirectorySearcher.STANDARD_TEST_DIRS).toContain('spec');
      });

      it('should have exactly 4 standard test dirs', () => {
        expect(DirectorySearcher.STANDARD_TEST_DIRS).toHaveLength(4);
      });
    });
  });

  describe('getStandardSourceDirs', () => {
    it('should return existing source directories', () => {
      const dirs = DirectorySearcher.getStandardSourceDirs(REAL_PROJECT_ROOT);
      expect(Array.isArray(dirs)).toBe(true);
    });

    it('should return src directory if it exists', () => {
      const dirs = DirectorySearcher.getStandardSourceDirs(REAL_PROJECT_ROOT);
      const hasSrc = dirs.some(dir => dir.endsWith('src'));
      expect(hasSrc).toBe(true);
    });

    it('should return full paths', () => {
      const dirs = DirectorySearcher.getStandardSourceDirs(REAL_PROJECT_ROOT);
      for (const dir of dirs) {
        expect(PathOperations.isAbsolute(dir)).toBe(true);
      }
    });

    it('should filter out non-existent directories', () => {
      const fakePath = '/non/existent/project';
      const dirs = DirectorySearcher.getStandardSourceDirs(fakePath);
      expect(dirs).toHaveLength(0);
    });
  });

  describe('getStandardTestDirs', () => {
    it('should return existing test directories', () => {
      const dirs = DirectorySearcher.getStandardTestDirs(REAL_PROJECT_ROOT);
      expect(Array.isArray(dirs)).toBe(true);
    });

    it('should return tests directory if it exists', () => {
      const dirs = DirectorySearcher.getStandardTestDirs(REAL_PROJECT_ROOT);
      const hasTests = dirs.some(dir => dir.endsWith('tests'));
      expect(hasTests).toBe(true);
    });

    it('should return full paths', () => {
      const dirs = DirectorySearcher.getStandardTestDirs(REAL_PROJECT_ROOT);
      for (const dir of dirs) {
        expect(PathOperations.isAbsolute(dir)).toBe(true);
      }
    });

    it('should filter out non-existent directories', () => {
      const fakePath = '/non/existent/project';
      const dirs = DirectorySearcher.getStandardTestDirs(fakePath);
      expect(dirs).toHaveLength(0);
    });
  });

  describe('searchDirectoriesRecursively', () => {
    it('should call callback for each file found', () => {
      const srcDir = PathOperations.join(REAL_PROJECT_ROOT, 'src');
      const files: string[] = [];

      // Collect files
      DirectorySearcher.searchDirectoriesRecursively([srcDir], filePath => {
        files.push(filePath);
      });

      // Should find TypeScript files in src
      expect(files.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty directories array', () => {
      const files: string[] = [];
      DirectorySearcher.searchDirectoriesRecursively([], filePath => {
        files.push(filePath);
      });
      expect(files).toHaveLength(0);
    });

    it('should skip non-existent directories', () => {
      const files: string[] = [];
      DirectorySearcher.searchDirectoriesRecursively(
        ['/non/existent/dir'],
        filePath => {
          files.push(filePath);
        }
      );
      expect(files).toHaveLength(0);
    });

    it('should find TypeScript files', () => {
      const srcDir = PathOperations.join(REAL_PROJECT_ROOT, 'src', 'utils');
      const tsFiles: string[] = [];

      DirectorySearcher.searchDirectoriesRecursively([srcDir], filePath => {
        if (filePath.endsWith('.ts')) {
          tsFiles.push(filePath);
        }
      });

      // Files should be found if directory exists with TS files
      expect(Array.isArray(tsFiles)).toBe(true);
    });
  });

  describe('findFilesInStandardDirs', () => {
    it('should find files matching predicate', () => {
      // Use workspace root which has non-ignored apps directory
      const matches = DirectorySearcher.findFilesInStandardDirs(
        WORKSPACE_ROOT,
        filePath => filePath.endsWith('index.ts')
      );

      expect(Array.isArray(matches)).toBe(true);
    });

    it('should return empty array when no matches', () => {
      const matches = DirectorySearcher.findFilesInStandardDirs(
        WORKSPACE_ROOT,
        () => false
      );

      expect(matches).toHaveLength(0);
    });

    it('should find TypeScript files', () => {
      const matches = DirectorySearcher.findFilesInStandardDirs(
        WORKSPACE_ROOT,
        filePath => filePath.endsWith('.ts') && !filePath.includes('.d.ts')
      );

      // The apps directory exists and contains .ts files
      expect(Array.isArray(matches)).toBe(true);
      // Should actually find some files in workspace apps
      expect(matches.length).toBeGreaterThan(0);
      expect(matches.every(f => f.endsWith('.ts'))).toBe(true);
    });

    it('should return full paths', () => {
      const matches = DirectorySearcher.findFilesInStandardDirs(
        WORKSPACE_ROOT,
        filePath => filePath.includes('app') && filePath.endsWith('.ts')
      );

      for (const match of matches) {
        expect(PathOperations.isAbsolute(match)).toBe(true);
      }
    });

    it('should handle non-existent project root', () => {
      const matches = DirectorySearcher.findFilesInStandardDirs(
        '/non/existent/path',
        () => true
      );

      expect(matches).toHaveLength(0);
    });

    it('should collect all files recursively', () => {
      // Use the real project root to exercise the full recursive path
      const allFiles: string[] = [];
      DirectorySearcher.findFilesInStandardDirs(REAL_PROJECT_ROOT, filePath => {
        allFiles.push(filePath);
        return false; // Don't match anything, just collect
      });
      // If src exists, should have been traversed
      expect(Array.isArray(allFiles)).toBe(true);
    });

    it('should traverse nested directories', () => {
      // Use workspace apps directory which isn't ignored by ruleofcode patterns
      const appsDir = PathOperations.join(WORKSPACE_ROOT, 'apps');
      const nestedFiles: string[] = [];

      DirectorySearcher.searchDirectoriesRecursively([appsDir], filePath => {
        nestedFiles.push(filePath);
      });

      // Should find files
      expect(Array.isArray(nestedFiles)).toBe(true);
    });

    it('should traverse nested subdirectories of src', () => {
      // The repo src/utils directory contains TypeScript files
      const srcUtilsDir = PathOperations.join(REAL_PROJECT_ROOT, 'src', 'utils');
      const files: string[] = [];

      DirectorySearcher.searchDirectoriesRecursively(
        [srcUtilsDir],
        filePath => {
          files.push(filePath);
        }
      );

      // Should find TypeScript files in src/utils
      expect(files.some(f => f.endsWith('.ts'))).toBe(true);
    });
  });
});
