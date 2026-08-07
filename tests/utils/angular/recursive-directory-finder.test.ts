/**
 * @fileoverview Tests for recursive-directory-finder.ts
 * @description Tests for Recursive Directory Finder utility
 */

import type { Dirent } from 'fs';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { findDirectoriesRecursively } from '../../../src/utils/angular/recursive-directory-finder';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/recursive-directory-finder', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findDirectoriesRecursively', () => {
    const mockConfig = {
      projectRoot: '/test/project',
      laws: {},
    } as unknown as RuleOfCodeConfig;

    const createMockDirent = (name: string, isDir: boolean): Dirent => ({
      name,
      isDirectory: () => isDir,
      isFile: () => !isDir,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isSymbolicLink: () => false,
      path: '',
      parentPath: '',
    });

    it('should return empty array when directory is empty', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      safeReadDirSpy.mockReturnValue([]);

      const result = findDirectoriesRecursively('/test/project', mockConfig);

      expect(result).toEqual([]);
    });

    it('should find directories without filter', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      // Root directory has two subdirectories
      safeReadDirSpy.mockImplementation((path: string) => {
        if (path === '/test/project') {
          return [
            createMockDirent('src', true),
            createMockDirent('lib', true),
            createMockDirent('file.ts', false),
          ];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const result = findDirectoriesRecursively('/test/project', mockConfig);

      expect(result).toContain('/test/project/src');
      expect(result).toContain('/test/project/lib');
      expect(result).not.toContain('/test/project/file.ts');
    });

    it('should filter directories when shouldInclude is provided', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      safeReadDirSpy.mockImplementation((path: string) => {
        if (path === '/test/project') {
          return [
            createMockDirent('store', true),
            createMockDirent('components', true),
            createMockDirent('effects', true),
          ];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const shouldInclude = (dirName: string) =>
        dirName === 'store' || dirName === 'effects';

      const result = findDirectoriesRecursively(
        '/test/project',
        mockConfig,
        shouldInclude
      );

      expect(result).toContain('/test/project/store');
      expect(result).toContain('/test/project/effects');
      expect(result).not.toContain('/test/project/components');
    });

    it('should recurse into subdirectories', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      safeReadDirSpy.mockImplementation((path: string) => {
        if (path === '/test/project') {
          return [createMockDirent('src', true)];
        }
        if (path === '/test/project/src') {
          return [createMockDirent('app', true)];
        }
        if (path === '/test/project/src/app') {
          return [createMockDirent('store', true)];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const result = findDirectoriesRecursively('/test/project', mockConfig);

      expect(result).toContain('/test/project/src');
      expect(result).toContain('/test/project/src/app');
      expect(result).toContain('/test/project/src/app/store');
    });

    it('should handle errors gracefully', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      safeReadDirSpy.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = findDirectoriesRecursively('/test/project', mockConfig);

      expect(result).toEqual([]);
    });

    it('should ignore files and only return directories', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      // Return files and one directory only for the root, empty for subdirectory
      let callCount = 0;
      safeReadDirSpy.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return [
            createMockDirent('actions.ts', false),
            createMockDirent('reducer.ts', false),
            createMockDirent('effects.ts', false),
            createMockDirent('store', true),
          ];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const result = findDirectoriesRecursively('/test/project', mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toContain('store');
    });

    it('should filter at each recursion level', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      safeReadDirSpy.mockImplementation((path: string) => {
        if (path === '/test/project') {
          return [
            createMockDirent('feature1', true),
            createMockDirent('feature2', true),
          ];
        }
        if (path === '/test/project/feature1') {
          return [
            createMockDirent('store', true),
            createMockDirent('utils', true),
          ];
        }
        if (path === '/test/project/feature2') {
          return [
            createMockDirent('store', true),
            createMockDirent('components', true),
          ];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const shouldInclude = (dirName: string) => dirName === 'store';

      const result = findDirectoriesRecursively(
        '/test/project',
        mockConfig,
        shouldInclude
      );

      expect(result).toContain('/test/project/feature1/store');
      expect(result).toContain('/test/project/feature2/store');
      expect(result).not.toContain('/test/project/feature1/utils');
      expect(result).not.toContain('/test/project/feature2/components');
    });

    it('should still recurse into non-matching directories', () => {
      const safeReadDirSpy = jest.spyOn(FileUtils, 'safeReadDirectory');
      const joinSpy = jest.spyOn(PathOperations, 'join');

      safeReadDirSpy.mockImplementation((path: string) => {
        if (path === '/test/project') {
          return [createMockDirent('src', true)];
        }
        if (path === '/test/project/src') {
          return [createMockDirent('store', true)];
        }
        return [];
      });

      joinSpy.mockImplementation((...args) => args.join('/'));

      const shouldInclude = (dirName: string) => dirName === 'store';

      const result = findDirectoriesRecursively(
        '/test/project',
        mockConfig,
        shouldInclude
      );

      // Should find store inside src even though src doesn't match
      expect(result).toContain('/test/project/src/store');
      expect(result).not.toContain('/test/project/src');
    });
  });
});
