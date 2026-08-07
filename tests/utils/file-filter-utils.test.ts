/**
 * @fileoverview Tests for file-filter-utils.ts
 * @description Tests for FileFilterUtils class
 */

import { ConfigFileUtils } from '../../src/utils/config-file-utils';
import { FileFilterUtils } from '../../src/utils/file-filter-utils';

const createConfig = () => ConfigFileUtils.getMinimalDefaultConfig();

describe('utils/file-filter-utils', () => {
  describe('FileFilterUtils.filterFilesByConfig', () => {
    it('should return all files when no includes specified', () => {
      const config = createConfig();
      const files = ['src/app.ts', 'src/main.ts', 'lib/util.ts'];

      const result = FileFilterUtils.filterFilesByConfig(files, config);

      expect(result).toEqual(files);
    });

    it('should filter files by global include patterns', () => {
      const config = createConfig();
      config.includes = { global: ['src/**'] };
      const files = ['src/app.ts', 'lib/util.ts', 'src/main.ts'];

      const result = FileFilterUtils.filterFilesByConfig(files, config);

      expect(result).toContain('src/app.ts');
      expect(result).toContain('src/main.ts');
      expect(result).not.toContain('lib/util.ts');
    });

    it('should include law-specific patterns', () => {
      const config = createConfig();
      config.includes = {
        global: ['src/**'],
        byRule: { 'law-001': ['lib/**'] },
      };
      const files = ['src/app.ts', 'lib/util.ts'];

      const result = FileFilterUtils.filterFilesByConfig(
        files,
        config,
        'law-001'
      );

      expect(result).toContain('src/app.ts');
      expect(result).toContain('lib/util.ts');
    });

    it('should return all files when includes.global is empty', () => {
      const config = createConfig();
      config.includes = { global: [] };
      const files = ['src/app.ts', 'lib/util.ts'];

      const result = FileFilterUtils.filterFilesByConfig(files, config);

      expect(result).toEqual(files);
    });
  });

  describe('FileFilterUtils.getIgnorePatterns', () => {
    it('should return base patterns', () => {
      const config = createConfig();
      const patterns = FileFilterUtils.getIgnorePatterns(config);

      expect(patterns).toContain('**/node_modules/**');
      expect(patterns).toContain('**/dist/**');
    });

    it('should include global ignores from config', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        global: ['**/custom-ignore/**'],
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config);

      expect(patterns).toContain('**/custom-ignore/**');
    });

    it('should include tests ignores from config', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        tests: ['**/*.spec.ts'],
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config);

      expect(patterns).toContain('**/*.spec.ts');
    });

    it('should include build ignores from config', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        build: ['**/out/**'],
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config);

      expect(patterns).toContain('**/out/**');
    });

    it('should include design ignores from config', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        design: ['**/*.design.ts'],
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config);

      expect(patterns).toContain('**/*.design.ts');
    });

    it('should include law-specific ignores', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        byRule: { 'law-002': ['**/special/**'] },
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config, 'law-002');

      expect(patterns).toContain('**/special/**');
    });

    it('should not include law-specific ignores for different law', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        byRule: { 'law-002': ['**/special/**'] },
      };

      const patterns = FileFilterUtils.getIgnorePatterns(config, 'law-001');

      expect(patterns).not.toContain('**/special/**');
    });
  });

  describe('FileFilterUtils.shouldIgnoreFile', () => {
    it('should ignore files in node_modules', () => {
      const config = createConfig();

      expect(
        FileFilterUtils.shouldIgnoreFile('node_modules/lib/index.ts', config)
      ).toBe(true);
    });

    it('should ignore files in dist', () => {
      const config = createConfig();

      expect(FileFilterUtils.shouldIgnoreFile('dist/app.js', config)).toBe(
        true
      );
    });

    it('should not ignore regular source files', () => {
      const config = createConfig();

      expect(FileFilterUtils.shouldIgnoreFile('src/app.ts', config)).toBe(
        false
      );
    });

    it('should ignore files matching global ignore patterns', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        global: ['**/ignore-me/**'],
      };

      expect(
        FileFilterUtils.shouldIgnoreFile('src/ignore-me/file.ts', config)
      ).toBe(true);
    });

    it('should respect law-specific ignores', () => {
      const config = createConfig();
      config.ignores = {
        ...config.ignores,
        byRule: { 'law-003': ['**/skip-for-law-003/**'] },
      };

      expect(
        FileFilterUtils.shouldIgnoreFile(
          'src/skip-for-law-003/file.ts',
          config,
          'law-003'
        )
      ).toBe(true);
    });

    it('should not ignore when includes are specified and file matches', () => {
      const config = createConfig();
      config.includes = { global: ['src/**'] };

      expect(FileFilterUtils.shouldIgnoreFile('src/app.ts', config)).toBe(
        false
      );
    });

    it('should ignore when includes are specified and file does not match', () => {
      const config = createConfig();
      config.includes = { global: ['src/**'] };

      expect(FileFilterUtils.shouldIgnoreFile('lib/util.ts', config)).toBe(
        true
      );
    });
  });

  describe('FileFilterUtils.applyInclusionFilters', () => {
    it('should return all files when no patterns', () => {
      const files = ['a.ts', 'b.ts', 'c.ts'];
      const result = FileFilterUtils.applyInclusionFilters(files, []);

      expect(result).toEqual(files);
    });

    it('should filter files matching pattern', () => {
      const files = ['src/app.ts', 'lib/util.ts', 'src/main.ts'];
      const result = FileFilterUtils.applyInclusionFilters(files, ['src/**']);

      expect(result).toEqual(['src/app.ts', 'src/main.ts']);
    });

    it('should support multiple patterns', () => {
      const files = ['src/app.ts', 'lib/util.ts', 'test/spec.ts'];
      const result = FileFilterUtils.applyInclusionFilters(files, [
        'src/**',
        'lib/**',
      ]);

      expect(result).toContain('src/app.ts');
      expect(result).toContain('lib/util.ts');
      expect(result).not.toContain('test/spec.ts');
    });

    it('should handle extension patterns', () => {
      const files = ['app.ts', 'app.js', 'app.html'];
      const result = FileFilterUtils.applyInclusionFilters(files, ['*.ts']);

      expect(result).toEqual(['app.ts']);
    });

    it('should handle glob star patterns', () => {
      const files = ['src/deep/nested/file.ts', 'src/shallow.ts'];
      const result = FileFilterUtils.applyInclusionFilters(files, [
        'src/**/*.ts',
      ]);

      expect(result).toContain('src/deep/nested/file.ts');
      expect(result).toContain('src/shallow.ts');
    });

    it('should return empty array when no files match', () => {
      const files = ['app.js', 'util.js'];
      const result = FileFilterUtils.applyInclusionFilters(files, ['*.ts']);

      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty files array', () => {
      const config = createConfig();
      const result = FileFilterUtils.filterFilesByConfig([], config);

      expect(result).toEqual([]);
    });

    it('should handle files with special characters', () => {
      const config = createConfig();
      const files = ['src/[component].ts', 'src/(group)/file.ts'];

      const result = FileFilterUtils.filterFilesByConfig(files, config);

      expect(result).toEqual(files);
    });

    it('should handle deeply nested paths', () => {
      const config = createConfig();
      config.includes = { global: ['src/**'] };
      const files = ['src/a/b/c/d/e/f/g/file.ts'];

      const result = FileFilterUtils.filterFilesByConfig(files, config);

      expect(result).toContain('src/a/b/c/d/e/f/g/file.ts');
    });
  });
});
