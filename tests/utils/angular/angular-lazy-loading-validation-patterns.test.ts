/**
 * @fileoverview Tests for angular-lazy-loading-validation-patterns.ts
 * @description Tests for Angular lazy loading validation patterns utility
 */

import * as fs from 'fs';
import * as path from 'path';
import { AngularLazyLoadingConfiguration } from '../../../src/utils/angular/angular-lazy-loading/angular-lazy-loading-configuration';

describe('utils/angular/angular-lazy-loading/angular-lazy-loading-validation-patterns', () => {
  const testDir = path.join(__dirname, 'test-fixtures-lazy-loading-patterns');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('AngularLazyLoadingConfiguration', () => {
    describe('ANGULAR_FILE_EXTENSIONS', () => {
      it('should contain module.ts extension', () => {
        expect(
          AngularLazyLoadingConfiguration.ANGULAR_FILE_EXTENSIONS
        ).toContain('.module.ts');
      });
    });

    describe('ROUTING_FILE_EXTENSIONS', () => {
      it('should contain routing file extensions', () => {
        expect(
          AngularLazyLoadingConfiguration.ROUTING_FILE_EXTENSIONS.length
        ).toBeGreaterThan(0);
      });

      it('should include -routing.module.ts suffix', () => {
        expect(
          AngularLazyLoadingConfiguration.ROUTING_FILE_EXTENSIONS
        ).toContain('-routing.module.ts');
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
        ).toBeDefined();
      });

      it('should have ROUTING_SUFFIX pattern', () => {
        expect(
          AngularLazyLoadingConfiguration.LAZY_LOADING_PATTERNS.ROUTING_SUFFIX
        ).toBeDefined();
      });
    });

    describe('FILE_CONFIG', () => {
      it('should have ENCODING set to utf8', () => {
        expect(AngularLazyLoadingConfiguration.FILE_CONFIG.ENCODING).toBe(
          'utf8'
        );
      });

      it('should have FALLBACK_TO_EMPTY set to true', () => {
        expect(
          AngularLazyLoadingConfiguration.FILE_CONFIG.FALLBACK_TO_EMPTY
        ).toBe(true);
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have LAZY_LOADING_SUGGESTION message', () => {
        expect(
          AngularLazyLoadingConfiguration.VALIDATION_MESSAGES
            .LAZY_LOADING_SUGGESTION
        ).toBeDefined();
      });

      it('should have BARREL_EXPORT_SUGGESTION message', () => {
        expect(
          AngularLazyLoadingConfiguration.VALIDATION_MESSAGES
            .BARREL_EXPORT_SUGGESTION
        ).toBeDefined();
      });
    });

    describe('buildFileNameMessage', () => {
      it('should replace fileName placeholder in message', () => {
        const result = AngularLazyLoadingConfiguration.buildFileNameMessage(
          'Consider making {fileName} lazy loaded',
          'users.module.ts'
        );

        expect(result).toContain('users.module.ts');
        expect(result).not.toContain('{fileName}');
      });
    });

    describe('buildDirectoryNameMessage', () => {
      it('should replace directoryName placeholder in message', () => {
        const result =
          AngularLazyLoadingConfiguration.buildDirectoryNameMessage(
            'Create barrel export for {directoryName}',
            'users'
          );

        expect(result).toContain('users');
        expect(result).not.toContain('{directoryName}');
      });
    });

    describe('analyzeLazyLoadingPatterns', () => {
      it('should return fileName in result', () => {
        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '',
            'test.module.ts',
            '/path/to/test.module.ts'
          );

        expect(result.fileName).toBe('test.module.ts');
      });

      it('should return moduleFile in result', () => {
        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '',
            'test.module.ts',
            '/path/to/test.module.ts'
          );

        expect(result.moduleFile).toBe('/path/to/test.module.ts');
      });

      it('should detect app.module as AppModule', () => {
        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'app.module.ts',
            '/path/to/app.module.ts'
          );

        expect(result.isAppModule).toBe(true);
        expect(result.shouldCheckLazyLoading).toBe(false);
      });

      it('should detect feature module as not AppModule', () => {
        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        expect(result.isAppModule).toBe(false);
        expect(result.shouldCheckLazyLoading).toBe(true);
      });

      it('should detect NgModule decorator', () => {
        const content = `
          @NgModule({
            imports: [CommonModule]
          })
          export class UsersModule {}
        `;

        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            content,
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        expect(result.hasNgModule).toBe(true);
      });

      it('should not detect NgModule when absent', () => {
        const content = 'export class UsersService {}';

        const result =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            content,
            'users.service.ts',
            '/path/to/users.service.ts'
          );

        expect(result.hasNgModule).toBe(false);
      });
    });

    describe('analyzeRoutingPatterns', () => {
      it('should detect loadChildren pattern', () => {
        const content = `
          const routes: Routes = [
            {
              path: 'users',
              loadChildren: () => import('./users/users.module').then(m => m.UsersModule)
            }
          ];
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'UsersModule',
          'users.module.ts'
        );

        expect(result.hasLoadChildren).toBe(true);
      });

      it('should not detect loadChildren when absent', () => {
        const content = `
          const routes: Routes = [
            {
              path: 'users',
              component: UsersComponent
            }
          ];
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'UsersModule',
          'users.module.ts'
        );

        expect(result.hasLoadChildren).toBe(false);
      });

      it('should detect module reference by class name', () => {
        const content = `
          loadChildren: () => import('./users.module').then(m => m.UsersModule)
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'UsersModule',
          'users.module.ts'
        );

        expect(result.hasModuleReference).toBe(true);
      });

      it('should detect module reference by file name', () => {
        const content = `
          loadChildren: () => import('./users.module').then(m => m.UsersModule)
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'SomeOtherModule',
          'users.module'
        );

        expect(result.hasModuleReference).toBe(true);
      });

      it('should identify lazy loaded module', () => {
        const content = `
          const routes: Routes = [
            {
              path: 'users',
              loadChildren: () => import('./users/users.module').then(m => m.UsersModule)
            }
          ];
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'UsersModule',
          'users.module.ts'
        );

        expect(result.isLazyLoaded).toBe(true);
      });

      it('should not identify as lazy loaded without loadChildren', () => {
        const content = `
          const routes: Routes = [
            { path: 'users', component: UsersComponent }
          ];
          // Reference to UsersModule in comments
        `;

        const result = AngularLazyLoadingConfiguration.analyzeRoutingPatterns(
          content,
          'UsersModule',
          'users.module.ts'
        );

        expect(result.isLazyLoaded).toBe(false);
      });
    });

    describe('buildLazyLoadingSuggestions', () => {
      it('should suggest lazy loading for non-lazy-loaded modules', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            false,
            true
          );

        expect(suggestions.some(s => s.includes('lazy loaded'))).toBe(true);
      });

      it('should not suggest lazy loading when already lazy loaded', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            true,
            true
          );

        expect(suggestions.some(s => s.includes('lazy loaded'))).toBe(false);
      });

      it('should not suggest lazy loading for app module', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'app.module.ts',
            '/path/to/app.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            false,
            true
          );

        expect(suggestions.some(s => s.includes('lazy loaded'))).toBe(false);
      });

      it('should suggest barrel export when none exists', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            true,
            false
          );

        expect(suggestions.some(s => s.includes('barrel export'))).toBe(true);
      });

      it('should not suggest barrel export when it exists', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            true,
            true
          );

        expect(suggestions.some(s => s.includes('barrel export'))).toBe(false);
      });

      it('should not suggest barrel export for app module', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'app.module.ts',
            '/path/to/app.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            true,
            false
          );

        expect(suggestions.some(s => s.includes('barrel export'))).toBe(false);
      });

      it('should return multiple suggestions when applicable', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'users.module.ts',
            '/path/to/users.module.ts'
          );

        const suggestions =
          AngularLazyLoadingConfiguration.buildLazyLoadingSuggestions(
            patterns,
            false,
            false
          );

        expect(suggestions.length).toBe(2);
      });

      it('should return empty array when no suggestions apply', () => {
        const patterns =
          AngularLazyLoadingConfiguration.analyzeLazyLoadingPatterns(
            '@NgModule({})',
            'app.module.ts',
            '/path/to/app.module.ts'
          );

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
});
