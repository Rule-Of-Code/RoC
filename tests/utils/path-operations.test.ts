/**
 * PathOperations Tests
 * Tests for the path-operations utility class
 */
import { PathOperations } from '../../src/utils/path-operations';

describe('PathOperations', () => {
  describe('normalize', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(PathOperations.normalize('path\\to\\file')).toBe('path/to/file');
      expect(PathOperations.normalize('C:\\Users\\test')).toBe('C:/Users/test');
    });

    it('should keep forward slashes unchanged', () => {
      expect(PathOperations.normalize('path/to/file')).toBe('path/to/file');
    });

    it('should handle mixed slashes', () => {
      expect(PathOperations.normalize('path\\to/file\\name')).toBe(
        'path/to/file/name'
      );
    });

    it('should handle empty string', () => {
      expect(PathOperations.normalize('')).toBe('');
    });
  });

  describe('join', () => {
    it('should join path segments', () => {
      const result = PathOperations.join('path', 'to', 'file');
      expect(result).toBe('path/to/file');
    });

    it('should filter null and undefined segments', () => {
      const result = PathOperations.join(
        'path',
        null,
        'file',
        undefined,
        'name'
      );
      expect(result).toBe('path/file/name');
    });

    it('should handle empty segments', () => {
      const result = PathOperations.join('path', '', 'file');
      expect(result).toBe('path/file');
    });

    it('should return empty string for no segments', () => {
      expect(PathOperations.join()).toBe('');
    });
  });

  describe('isAbsolute', () => {
    it('should detect absolute paths on Unix', () => {
      expect(PathOperations.isAbsolute('/path/to/file')).toBe(true);
    });

    it('should detect relative paths', () => {
      expect(PathOperations.isAbsolute('path/to/file')).toBe(false);
      expect(PathOperations.isAbsolute('./relative')).toBe(false);
      expect(PathOperations.isAbsolute('../parent')).toBe(false);
    });
  });

  describe('getRelative', () => {
    it('should get relative path between directories', () => {
      const result = PathOperations.getRelative(
        '/project',
        '/project/src/file.ts'
      );
      expect(result).toBe('src/file.ts');
    });

    it('should clean leading ./ by default', () => {
      const result = PathOperations.getRelative(
        '/project/src',
        '/project/src/file.ts'
      );
      expect(result).not.toMatch(/^\.\//);
    });

    it('should respect cleanRelative option', () => {
      // Without cleaning, shorter relative paths may not start with ./
      const result = PathOperations.getRelative(
        '/project',
        '/project/file.ts',
        { cleanRelative: false }
      );
      expect(result).toBe('file.ts');
    });
  });

  describe('getWorkspaceRelative', () => {
    it('should get workspace relative path', () => {
      const result = PathOperations.getWorkspaceRelative(
        '/workspace/src/file.ts',
        '/workspace'
      );
      expect(result).toBe('src/file.ts');
    });

    it('should handle trailing slash in workspace', () => {
      const result = PathOperations.getWorkspaceRelative(
        '/workspace/src/file.ts',
        '/workspace/'
      );
      expect(result).toBe('src/file.ts');
    });
  });

  describe('parse', () => {
    it('should parse path into components', () => {
      const result = PathOperations.parse('/project/src/file.ts');
      expect(result.dir).toContain('src');
      expect(result.base).toBe('file.ts');
      expect(result.ext).toBe('.ts');
      expect(result.name).toBe('file');
    });

    it('should handle paths without extension', () => {
      const result = PathOperations.parse('/project/Makefile');
      expect(result.base).toBe('Makefile');
      expect(result.ext).toBe('');
      expect(result.name).toBe('Makefile');
    });
  });

  describe('getDirectory', () => {
    it('should get directory from path', () => {
      const result = PathOperations.getDirectory('/project/src/file.ts');
      expect(result).toContain('src');
    });

    it('should normalize slashes in result', () => {
      const result = PathOperations.getDirectory('path\\to\\file.ts');
      expect(result).not.toContain('\\');
    });
  });

  describe('getParent', () => {
    it('should get parent directory', () => {
      const result = PathOperations.getParent('/project/src/file.ts');
      expect(result).toContain('src');
    });
  });

  describe('getFilename', () => {
    it('should get filename with extension', () => {
      expect(PathOperations.getFilename('/project/src/file.ts')).toBe(
        'file.ts'
      );
    });

    it('should handle paths without directory', () => {
      expect(PathOperations.getFilename('file.ts')).toBe('file.ts');
    });
  });

  describe('getBasename', () => {
    it('should get filename without extension', () => {
      expect(PathOperations.getBasename('/project/src/file.ts')).toBe('file');
    });

    it('should handle multiple dots in filename', () => {
      expect(PathOperations.getBasename('/project/file.test.ts')).toBe(
        'file.test'
      );
    });
  });

  describe('getExtension', () => {
    it('should get file extension', () => {
      expect(PathOperations.getExtension('/project/file.ts')).toBe('.ts');
    });

    it('should return empty string for no extension', () => {
      expect(PathOperations.getExtension('/project/Makefile')).toBe('');
    });
  });

  describe('getExtensionWithoutDot', () => {
    it('should get extension without leading dot', () => {
      expect(PathOperations.getExtensionWithoutDot('/project/file.ts')).toBe(
        'ts'
      );
    });

    it('should return empty string for no extension', () => {
      expect(PathOperations.getExtensionWithoutDot('/project/Makefile')).toBe(
        ''
      );
    });
  });

  describe('changeExtension', () => {
    it('should change file extension', () => {
      const result = PathOperations.changeExtension('/project/file.ts', '.js');
      expect(result).toContain('file.js');
    });

    it('should add dot if not provided', () => {
      const result = PathOperations.changeExtension('/project/file.ts', 'js');
      expect(result).toContain('file.js');
    });

    it('should handle files without extension', () => {
      const result = PathOperations.changeExtension(
        '/project/Makefile',
        '.txt'
      );
      expect(result).toContain('Makefile.txt');
    });
  });

  describe('addSuffix', () => {
    it('should add suffix before extension', () => {
      const result = PathOperations.addSuffix('/project/file.ts', '.test');
      expect(result).toContain('file.test.ts');
    });

    it('should handle paths without extension', () => {
      const result = PathOperations.addSuffix('/project/Makefile', '.bak');
      expect(result).toContain('Makefile.bak');
    });
  });

  describe('addPrefix', () => {
    it('should add prefix to filename', () => {
      const result = PathOperations.addPrefix('/project/file.ts', 'test-');
      expect(result).toContain('test-file.ts');
    });

    it('should preserve directory path', () => {
      const result = PathOperations.addPrefix('/project/src/file.ts', '_');
      expect(result).toContain('_file.ts');
    });
  });

  describe('hasExtension', () => {
    it('should detect matching extension', () => {
      expect(PathOperations.hasExtension('/file.ts', ['.ts', '.tsx'])).toBe(
        true
      );
    });

    it('should be case insensitive', () => {
      expect(PathOperations.hasExtension('/file.TS', ['.ts'])).toBe(true);
      expect(PathOperations.hasExtension('/file.ts', ['.TS'])).toBe(true);
    });

    it('should handle extensions without dot', () => {
      expect(PathOperations.hasExtension('/file.ts', ['ts', 'tsx'])).toBe(true);
    });

    it('should return false for non-matching extension', () => {
      expect(PathOperations.hasExtension('/file.ts', ['.js', '.jsx'])).toBe(
        false
      );
    });

    it('matches compound extensions (.reducer.ts, .module.ts)', () => {
      // Regression: getExtension() only returns ".ts", so compound extensions
      // must match via suffix — otherwise NgRx/lazy-loading file discovery finds
      // nothing and those laws silently pass.
      expect(
        PathOperations.hasExtension('/a/app.reducer.ts', ['.reducer.ts'])
      ).toBe(true);
      expect(
        PathOperations.hasExtension('/a/app.module.ts', ['.module.ts'])
      ).toBe(true);
      expect(
        PathOperations.hasExtension('/a/app.component.ts', ['.reducer.ts'])
      ).toBe(false);
      // a compound pattern must not match a plain .ts file
      expect(
        PathOperations.hasExtension('/a/plain.ts', ['.reducer.ts'])
      ).toBe(false);
    });
  });

  describe('matchesPattern', () => {
    it('should match wildcard patterns', () => {
      expect(PathOperations.matchesPattern('file.ts', '*.ts')).toBe(true);
      expect(PathOperations.matchesPattern('file.ts', '*.js')).toBe(false);
    });

    it('should match exact patterns', () => {
      expect(
        PathOperations.matchesPattern('package.json', 'package.json')
      ).toBe(true);
    });

    it('should match question mark wildcard', () => {
      expect(PathOperations.matchesPattern('file1.ts', 'file?.ts')).toBe(true);
      expect(PathOperations.matchesPattern('file12.ts', 'file?.ts')).toBe(
        false
      );
    });

    it('should be case insensitive', () => {
      expect(PathOperations.matchesPattern('File.TS', '*.ts')).toBe(true);
    });
  });

  describe('getCommonPaths', () => {
    it('should return common project paths', () => {
      const paths = PathOperations.getCommonPaths('/project');

      expect(paths.packageJson).toContain('package.json');
      expect(paths.nodeModules).toContain('node_modules');
      expect(paths.srcDir).toContain('src');
      expect(paths.distDir).toContain('dist');
      expect(paths.testsDir).toContain('tests');
    });

    it('should include hidden directories', () => {
      const paths = PathOperations.getCommonPaths('/project');

      expect(paths.githubDir).toContain('.github');
      expect(paths.gitDir).toContain('.git');
    });
  });
});
