/**
 * DirectoryScanner Tests
 * Tests for utils/directory-scanner.ts
 */

import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

import type { RuleOfCodeConfig } from '../../src/config/types';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { DirectoryScanner } from '../../src/utils/directory-scanner';

describe('utils/directory-scanner', () => {
  let tempDir: string;
  let config: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('roc-dir-scanner-');
    // Create config WITHOUT includes.global and ignores.tests to avoid filtering issues with temp directories
    config = {
      ...DEFAULT_CONFIG,
      includes: {
        global: [],
        byRule: {},
      },
      ignores: {
        ...DEFAULT_CONFIG.ignores,
        tests: [],
      },
    };
  });

  afterEach(() => {
    if (tempDir && FileUtils.exists(tempDir)) {
      FileUtils.deleteDirectory(tempDir);
    }
  });

  describe('scanDirectory', () => {
    it('should scan an empty directory', () => {
      const result = DirectoryScanner.scanDirectory(tempDir, config);

      expect(result.files).toEqual([]);
      expect(result.directories).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it('should find files in a directory', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file1.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file2.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.some(f => f.endsWith('file1.ts'))).toBe(true);
      expect(result.files.some(f => f.endsWith('file2.ts'))).toBe(true);
    });

    it('should find directories', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir1'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir2'));

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        directoriesOnly: true,
      });

      expect(result.directories).toHaveLength(2);
    });

    it('should scan recursively', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'level1'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'level1', 'level2')
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'level1', 'level2', 'deep.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('deep.ts');
    });

    it('should respect maxDepth option', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'level1'));
      FileUtils.createDirectory(
        PathOperations.join(tempDir, 'level1', 'level2')
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'root.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'level1', 'shallow.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'level1', 'level2', 'deep.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        maxDepth: 1,
      });

      expect(result.files.some(f => f.endsWith('root.ts'))).toBe(true);
      expect(result.files.some(f => f.endsWith('shallow.ts'))).toBe(true);
      expect(result.files.some(f => f.endsWith('deep.ts'))).toBe(false);
    });

    it('should skip hidden files by default', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'visible.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, '.hidden.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('visible.ts');
    });

    it('should include hidden files when requested', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'visible.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, '.hidden.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        includeHidden: true,
      });

      expect(result.files).toHaveLength(2);
    });

    it('should filter by extensions', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.js'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.json'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts', '.js'],
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.some(f => f.endsWith('.json'))).toBe(false);
    });

    it('should include all files when no extensions specified', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.js'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {});

      expect(result.files).toHaveLength(2);
    });

    it('should handle filesOnly option', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        filesOnly: true,
      });

      expect(result.files).toHaveLength(1);
      expect(result.directories).toHaveLength(0);
    });

    it('should handle directoriesOnly option', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        directoriesOnly: true,
      });

      expect(result.files).toHaveLength(0);
      expect(result.directories.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle non-existent directories gracefully', () => {
      const result = DirectoryScanner.scanDirectory(
        PathOperations.join(tempDir, 'nonexistent'),
        config
      );

      // FileSystemOperations.readDirectory returns empty array for non-existent directories
      // This is graceful handling rather than throwing errors
      expect(result.files).toEqual([]);
      expect(result.directories).toEqual([]);
    });
  });

  describe('scanForFiles', () => {
    it('should scan for files with specific extensions', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'style.css'),
        'content'
      );

      const files = DirectoryScanner.scanForFiles(tempDir, config, ['.ts']);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('app.ts');
    });

    it('should scan recursively for files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'content'
      );

      const files = DirectoryScanner.scanForFiles(tempDir, config, ['.ts']);

      expect(files).toHaveLength(1);
    });
  });

  describe('scanForDirectories', () => {
    it('should scan for directories only', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'lib'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );

      const dirs = DirectoryScanner.scanForDirectories(tempDir, config);

      expect(dirs).toHaveLength(2);
      expect(dirs.some(d => d.includes('src'))).toBe(true);
      expect(dirs.some(d => d.includes('lib'))).toBe(true);
    });
  });

  describe('scanForTypeScriptFiles', () => {
    it('should find TypeScript files', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'component.tsx'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'script.js'),
        'content'
      );

      const files = DirectoryScanner.scanForTypeScriptFiles(tempDir, config);

      expect(files).toHaveLength(2);
    });

    it('should exclude test files by default', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.spec.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.test.ts'),
        'content'
      );

      const files = DirectoryScanner.scanForTypeScriptFiles(tempDir, config);

      expect(files).toHaveLength(1);
      expect(files[0]).toContain('app.ts');
      expect(files[0]).not.toContain('.spec.');
    });

    it('should include test files when includeTests is true', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'app.spec.ts'),
        'content'
      );

      const files = DirectoryScanner.scanForTypeScriptFiles(
        tempDir,
        config,
        true // includeTests - now properly passed through to FileFilterUtils
      );

      // With includeTests=true, test files are NOT filtered out
      expect(files).toHaveLength(2);
      expect(files.some(f => f.includes('app.ts'))).toBe(true);
      expect(files.some(f => f.includes('app.spec.ts'))).toBe(true);
    });
  });

  describe('safeReadDirectory', () => {
    it('should read directory entries', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir'));

      const entries = DirectoryScanner.safeReadDirectory(tempDir, config);

      expect(entries).toHaveLength(2);
      const fileEntry = entries.find(e => e.name === 'file.ts');
      const dirEntry = entries.find(e => e.name === 'subdir');
      expect(fileEntry?.isFile()).toBe(true);
      expect(dirEntry?.isDirectory()).toBe(true);
    });

    it('should return empty array for non-existent directory', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const entries = DirectoryScanner.safeReadDirectory(
        PathOperations.join(tempDir, 'nonexistent'),
        config
      );

      expect(entries).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should return empty array for ignored directories', () => {
      const nodeModulesDir = PathOperations.join(tempDir, 'node_modules');
      FileUtils.createDirectory(nodeModulesDir);
      FileUtils.writeFileSync(
        PathOperations.join(nodeModulesDir, 'package.json'),
        '{}'
      );

      const entries = DirectoryScanner.safeReadDirectory(
        nodeModulesDir,
        config
      );

      expect(entries).toEqual([]);
    });
  });

  describe('config-based filtering', () => {
    it('should apply config filtering when useConfigFiltering is true', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.createDirectory(PathOperations.join(tempDir, 'node_modules'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'node_modules', 'lib.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        useConfigFiltering: true,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('src');
    });

    it('should skip filtering when useConfigFiltering is false', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'src', 'app.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        useConfigFiltering: false,
      });

      expect(result.files).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty extensions array', () => {
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'file.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: [],
      });

      expect(result.files).toHaveLength(1);
    });

    it('should handle maxDepth of 0', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'subdir'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'root.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'subdir', 'nested.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        maxDepth: 0,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('root.ts');
    });

    it('should handle deeply nested structures', () => {
      let currentPath = tempDir;
      for (let i = 0; i < 5; i++) {
        currentPath = PathOperations.join(currentPath, `level${i}`);
        FileUtils.createDirectory(currentPath);
      }
      FileUtils.writeFileSync(
        PathOperations.join(currentPath, 'deep.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('deep.ts');
    });

    it('should skip hidden directories', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.hidden'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, '.hidden', 'secret.ts'),
        'content'
      );
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, 'visible.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('visible.ts');
    });

    it('should include hidden directories when requested', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, '.hidden'));
      FileUtils.writeFileSync(
        PathOperations.join(tempDir, '.hidden', 'secret.ts'),
        'content'
      );

      const result = DirectoryScanner.scanDirectory(tempDir, config, {
        extensions: ['.ts'],
        includeHidden: true,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toContain('secret.ts');
    });
  });
});
