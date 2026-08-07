/**
 * Tests for NgRxDevToolsFileDiscoveryConstants
 *
 * Tests file discovery patterns and helper methods.
 */
import { NgRxDevToolsFileDiscoveryConstants } from '../../../src/laws/angular/ngrx-devtools-integration-mandate/constants/file-discovery';

describe('NgRxDevToolsFileDiscoveryConstants', () => {
  describe('CONFIG_FILE_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(NgRxDevToolsFileDiscoveryConstants.CONFIG_FILE_PATTERNS)
      ).toBe(true);
      NgRxDevToolsFileDiscoveryConstants.CONFIG_FILE_PATTERNS.forEach(
        pattern => {
          expect(pattern).toBeInstanceOf(RegExp);
        }
      );
    });

    it('should match app.config.ts', () => {
      const patterns = NgRxDevToolsFileDiscoveryConstants.CONFIG_FILE_PATTERNS;
      expect(patterns.some(p => p.test('app.config.ts'))).toBe(true);
    });

    it('should match app.module.ts', () => {
      const patterns = NgRxDevToolsFileDiscoveryConstants.CONFIG_FILE_PATTERNS;
      expect(patterns.some(p => p.test('app.module.ts'))).toBe(true);
    });

    it('should match main.ts', () => {
      const patterns = NgRxDevToolsFileDiscoveryConstants.CONFIG_FILE_PATTERNS;
      expect(patterns.some(p => p.test('main.ts'))).toBe(true);
    });
  });

  describe('SKIP_DIRECTORIES', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES)
      ).toBe(true);
    });

    it('should contain node_modules', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES).toContain(
        'node_modules'
      );
    });

    it('should contain dist', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES).toContain(
        'dist'
      );
    });

    it('should contain .angular', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES).toContain(
        '.angular'
      );
    });

    it('should contain coverage', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES).toContain(
        'coverage'
      );
    });

    it('should contain build', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.SKIP_DIRECTORIES).toContain(
        'build'
      );
    });
  });

  describe('isConfigFile', () => {
    it('should return true for app.config.ts', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.isConfigFile('app.config.ts')
      ).toBe(true);
    });

    it('should return true for app.module.ts', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.isConfigFile('app.module.ts')
      ).toBe(true);
    });

    it('should return true for main.ts', () => {
      expect(NgRxDevToolsFileDiscoveryConstants.isConfigFile('main.ts')).toBe(
        true
      );
    });

    it('should return true for full paths', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.isConfigFile('src/app/app.config.ts')
      ).toBe(true);
    });

    it('should return false for non-config files', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.isConfigFile('component.ts')
      ).toBe(false);
      expect(
        NgRxDevToolsFileDiscoveryConstants.isConfigFile('service.ts')
      ).toBe(false);
    });
  });

  describe('shouldSkipDirectory', () => {
    it('should return true for node_modules', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('node_modules')
      ).toBe(true);
    });

    it('should return true for dist', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('dist')
      ).toBe(true);
    });

    it('should return true for .angular', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('.angular')
      ).toBe(true);
    });

    it('should return true for coverage', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('coverage')
      ).toBe(true);
    });

    it('should return true for build', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('build')
      ).toBe(true);
    });

    it('should return false for src', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('src')
      ).toBe(false);
    });

    it('should return false for app', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.shouldSkipDirectory('app')
      ).toBe(false);
    });
  });

  describe('getConfigFilePaths', () => {
    it('should return array of config file paths', async () => {
      const paths =
        await NgRxDevToolsFileDiscoveryConstants.getConfigFilePaths('/project');
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBe(3);
    });

    it('should include app.config.ts path', async () => {
      const paths =
        await NgRxDevToolsFileDiscoveryConstants.getConfigFilePaths('/project');
      expect(paths).toContain('/project/src/app/app.config.ts');
    });

    it('should include app.module.ts path', async () => {
      const paths =
        await NgRxDevToolsFileDiscoveryConstants.getConfigFilePaths('/project');
      expect(paths).toContain('/project/src/app/app.module.ts');
    });

    it('should include main.ts path', async () => {
      const paths =
        await NgRxDevToolsFileDiscoveryConstants.getConfigFilePaths('/project');
      expect(paths).toContain('/project/src/main.ts');
    });
  });

  describe('getPackageJsonPath', () => {
    it('should return correct package.json path', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.getPackageJsonPath('/project')
      ).toBe('/project/package.json');
    });

    it('should work with different root paths', () => {
      expect(
        NgRxDevToolsFileDiscoveryConstants.getPackageJsonPath('/my/app')
      ).toBe('/my/app/package.json');
    });
  });
});
