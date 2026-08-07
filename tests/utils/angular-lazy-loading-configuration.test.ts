/**
 * @fileoverview Tests for angular-lazy-loading-configuration.ts
 * @description Tests for Angular lazy loading configuration utilities
 */

import { AngularLazyLoadingConfiguration } from '../../src/utils/angular/angular-lazy-loading/angular-lazy-loading-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-lazy-loading/angular-lazy-loading-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-lazy-loading-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ANGULAR_FILE_EXTENSIONS', () => {
    it('should contain module.ts extension', () => {
      expect(AngularLazyLoadingConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
        '.module.ts'
      );
    });

    it('should have at least one extension', () => {
      expect(
        AngularLazyLoadingConfiguration.ANGULAR_FILE_EXTENSIONS.length
      ).toBeGreaterThan(0);
    });
  });

  describe('ROUTING_FILE_EXTENSIONS', () => {
    it('should contain routing module extension', () => {
      expect(AngularLazyLoadingConfiguration.ROUTING_FILE_EXTENSIONS).toContain(
        '-routing.module.ts'
      );
    });

    it('should contain alternative routing extension', () => {
      expect(AngularLazyLoadingConfiguration.ROUTING_FILE_EXTENSIONS).toContain(
        '.routing.ts'
      );
    });
  });

  describe('DIRECTORIES', () => {
    it('should have SRC directory defined', () => {
      expect(AngularLazyLoadingConfiguration.DIRECTORIES.SRC).toBe('src');
    });
  });

  describe('LAZY_LOADING_PATTERNS', () => {
    it('should have NG_MODULE pattern', () => {
      expect(
        AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.NG_MODULE
      ).toBeDefined();
    });

    it('should have APP_MODULE pattern', () => {
      expect(
        AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.APP_MODULE
      ).toBeDefined();
    });

    it('should have LOAD_CHILDREN pattern', () => {
      expect(
        AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.LOAD_CHILDREN
      ).toBe('loadChildren');
    });

    it('should have ROUTING_SUFFIX pattern', () => {
      expect(
        AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.ROUTING_SUFFIX
      ).toBe('-routing.module.ts');
    });

    it('should have INDEX_TS pattern', () => {
      expect(
        AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.INDEX_TS
      ).toBe('index.ts');
    });
  });

  describe('FILE_CONFIG', () => {
    it('should have ENCODING set to utf8', () => {
      expect(AngularLazyLoadingConfiguration.FILE_CONFIG.ENCODING).toBe('utf8');
    });

    it('should have FALLBACK_TO_EMPTY set to true', () => {
      expect(
        AngularLazyLoadingConfiguration.FILE_CONFIG.FALLBACK_TO_EMPTY
      ).toBe(true);
    });
  });

  describe('buildFileNameMessage', () => {
    it('should replace {fileName} placeholder', () => {
      const result = AngularLazyLoadingConfiguration.buildFileNameMessage(
        'Error in {fileName}',
        'user.module.ts'
      );

      expect(result).toBe('Error in user.module.ts');
    });

    it('should handle message without placeholder', () => {
      const result = AngularLazyLoadingConfiguration.buildFileNameMessage(
        'Generic error',
        'user.module.ts'
      );

      expect(result).toBe('Generic error');
    });

    it('should handle empty file name', () => {
      const result = AngularLazyLoadingConfiguration.buildFileNameMessage(
        'Error in {fileName}',
        ''
      );

      expect(result).toBe('Error in ');
    });
  });

  describe('buildDirectoryNameMessage', () => {
    it('should replace {directoryName} placeholder', () => {
      const result = AngularLazyLoadingConfiguration.buildDirectoryNameMessage(
        'Create barrel in {directoryName}',
        'user'
      );

      expect(result).toBe('Create barrel in user');
    });

    it('should handle message without placeholder', () => {
      const result = AngularLazyLoadingConfiguration.buildDirectoryNameMessage(
        'Generic message',
        'user'
      );

      expect(result).toBe('Generic message');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have LAZY_LOADING_SUGGESTION message', () => {
      expect(
        AngularLazyLoadingConfiguration.VALIDATION_MESSAGES
          .LAZY_LOADING_SUGGESTION
      ).toContain('{fileName}');
    });

    it('should have BARREL_EXPORT_SUGGESTION message', () => {
      expect(
        AngularLazyLoadingConfiguration.VALIDATION_MESSAGES
          .BARREL_EXPORT_SUGGESTION
      ).toContain('{directoryName}');
    });
  });

  describe('analyzeLazyLoadingPatterns', () => {
    it('should identify app module correctly', () => {
      const content = '@NgModule({}) export class AppModule {}';
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        content,
        'app.module.ts',
        '/path/to/app.module.ts'
      );

      expect(result.isAppModule).toBe(true);
      expect(result.shouldCheckLazyLoading).toBe(false);
      expect(result.fileName).toBe('app.module.ts');
    });

    it('should identify feature module for lazy loading check', () => {
      const content = '@NgModule({}) export class UserModule {}';
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        content,
        'user.module.ts',
        '/path/to/user.module.ts'
      );

      expect(result.isAppModule).toBe(false);
      expect(result.hasNgModule).toBe(true);
      expect(result.shouldCheckLazyLoading).toBe(true);
    });

    it('should detect NgModule decorator', () => {
      const content = `
        @NgModule({
          imports: [CommonModule],
          declarations: [UserComponent]
        })
        export class UserModule {}
      `;
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        content,
        'user.module.ts',
        '/path/to/user.module.ts'
      );

      expect(result.hasNgModule).toBe(true);
    });

    it('should not detect NgModule in non-module file', () => {
      const content = `export class UserService {}`;
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        content,
        'user.service.ts',
        '/path/to/user.service.ts'
      );

      expect(result.hasNgModule).toBe(false);
    });

    it('should handle empty content', () => {
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        '',
        'empty.module.ts',
        '/path/to/empty.module.ts'
      );

      expect(result.hasNgModule).toBe(false);
      expect(result.shouldCheckLazyLoading).toBe(true);
    });

    it('should preserve file path in result', () => {
      const result = AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
        '@NgModule({}) export class TestModule {}',
        'test.module.ts',
        '/full/path/to/test.module.ts'
      );

      expect(result.moduleFile).toBe('/full/path/to/test.module.ts');
    });
  });

  describe('analyzeRoutingPatterns', () => {
    it('should detect loadChildren pattern', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'user',
            loadChildren: () => import('./user/user.module').then(m => m.UserModule)
          }
        ];
      `;
      const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
        content,
        'UserModule',
        'user'
      );

      expect(result.hasLoadChildren).toBe(true);
    });

    it('should detect module reference in routing', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'user',
            loadChildren: () => import('./user/user.module').then(m => m.UserModule)
          }
        ];
      `;
      const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
        content,
        'UserModule',
        'user'
      );

      expect(result.hasModuleReference).toBe(true);
      expect(result.isLazyLoaded).toBe(true);
    });

    it('treats a standalone loadComponent route as lazy (FE finding)', () => {
      // Angular 20 standalone lazy route: no NgModule, no module reference. The
      // wired law knew only loadChildren, so a fully lazy standalone app read as
      // "not lazy loaded".
      const content = `
        export const routes = [
          {
            path: 'home',
            loadComponent: () => import('./home').then(m => m.Home)
          }
        ];
      `;
      const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
        content,
        'NoSuchModule',
        'home'
      );

      expect(result.hasLoadChildren).toBe(false);
      expect(result.isLazyLoaded).toBe(true);
    });

    it('should return false for eager loaded module', () => {
      const content = `
        const routes: Routes = [
          { path: 'home', component: HomeComponent }
        ];
      `;
      const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
        content,
        'UserModule',
        'user'
      );

      expect(result.hasLoadChildren).toBe(false);
      expect(result.isLazyLoaded).toBe(false);
    });

    it('should not mark as lazy loaded without module reference', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'admin',
            loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
          }
        ];
      `;
      const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
        content,
        'UserModule',
        'user'
      );

      expect(result.hasLoadChildren).toBe(true);
      expect(result.hasModuleReference).toBe(false);
      expect(result.isLazyLoaded).toBe(false);
    });
  });

  describe('buildLazyLoadingSuggestions', () => {
    it('should suggest lazy loading for non-lazy loaded module', () => {
      const patterns = {
        fileName: 'user.module.ts',
        moduleFile: '/path/to/user.module.ts',
        isAppModule: false,
        hasNgModule: true,
        shouldCheckLazyLoading: true,
      };

      const suggestions =
        AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
          patterns,
          false, // not lazy loaded
          true // has barrel export
        );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('user.module.ts');
      expect(suggestions[0]).toContain('lazy loaded');
    });

    it('should not suggest lazy loading for already lazy loaded module', () => {
      const patterns = {
        fileName: 'user.module.ts',
        moduleFile: '/path/to/user.module.ts',
        isAppModule: false,
        hasNgModule: true,
        shouldCheckLazyLoading: true,
      };

      const suggestions =
        AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
          patterns,
          true, // already lazy loaded
          true // has barrel export
        );

      const lazySuggestion = suggestions.find(s => s.includes('lazy loaded'));
      expect(lazySuggestion).toBeUndefined();
    });

    it('should suggest barrel export when missing', () => {
      const patterns = {
        fileName: 'user.module.ts',
        moduleFile: '/path/to/user.module.ts',
        isAppModule: false,
        hasNgModule: true,
        shouldCheckLazyLoading: true,
      };

      const suggestions =
        AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
          patterns,
          true,
          false // no barrel export
        );

      const barrelSuggestion = suggestions.find(
        s => s.includes('barrel') || s.includes('index.ts')
      );
      expect(barrelSuggestion).toBeDefined();
    });

    it('should not suggest barrel export for app module', () => {
      const patterns = {
        fileName: 'app.module.ts',
        moduleFile: '/path/to/app.module.ts',
        isAppModule: true,
        hasNgModule: true,
        shouldCheckLazyLoading: false,
      };

      const suggestions =
        AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
          patterns,
          false,
          false
        );

      const barrelSuggestion = suggestions.find(s => s.includes('barrel'));
      expect(barrelSuggestion).toBeUndefined();
    });

    it('should return empty array when module is app module', () => {
      const patterns = {
        fileName: 'app.module.ts',
        moduleFile: '/path/to/app.module.ts',
        isAppModule: true,
        hasNgModule: true,
        shouldCheckLazyLoading: false,
      };

      const suggestions =
        AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
          patterns,
          true,
          true
        );

      expect(suggestions).toHaveLength(0);
    });
  });
});
