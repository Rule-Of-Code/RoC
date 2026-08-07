/**
 * @fileoverview Tests for angular-routing-validation-patterns.ts
 * @description Tests for Angular routing validation patterns utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularRoutingConfiguration } from '../../../src/utils/angular/angular-routing/angular-routing-configuration';
import { AngularRoutingValidationPatterns } from '../../../src/utils/angular/angular-routing/angular-routing-validation-patterns';
import { CheckerUtils } from '../../../src/utils/checker-utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-routing/angular-routing-validation-patterns', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularRoutingValidationPatterns', () => {
    describe('validateAllRoutingPatterns', () => {
      it('should return empty results when src directory does not exist', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        existsSpy.mockReturnValue(false);

        const result =
          AngularRoutingValidationPatterns.validateAllRoutingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
      });

      it('should return empty results when no routing files found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([]);

        const result =
          AngularRoutingValidationPatterns.validateAllRoutingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
      });

      it('should analyze routing files when found', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([
          '/test/project/src/app-routing.module.ts',
        ]);
        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'home', component: HomeComponent }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const result =
          AngularRoutingValidationPatterns.validateAllRoutingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should analyze multiple routing files', () => {
        const existsSpy = jest.spyOn(FileUtils, 'exists');
        const findFilesSpy = jest.spyOn(CheckerUtils, 'findFilesByExtension');
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        existsSpy.mockReturnValue(true);
        findFilesSpy.mockReturnValue([
          '/test/project/src/app-routing.module.ts',
          '/test/project/src/feature-routing.module.ts',
        ]);
        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'home', component: HomeComponent }
          ];
        `);
        basenameSpy.mockImplementation((path: string) => {
          if (path.includes('feature')) return 'feature-routing.module.ts';
          return 'app-routing.module.ts';
        });

        const result =
          AngularRoutingValidationPatterns.validateAllRoutingPatterns(
            '/test/project',
            mockConfig
          );

        expect(result.violations.length).toBeGreaterThan(0);

        existsSpy.mockRestore();
        findFilesSpy.mockRestore();
        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });

    describe('analyzeRoutingFile', () => {
      it('should skip empty files', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');

        readFileSpy.mockReturnValue('');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);

        readFileSpy.mockRestore();
      });

      it('should detect eager loading without lazy loading', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'home', component: HomeComponent }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('lazy loading');

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not report violation for lazy loaded routes', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'feature', loadChildren: () => import('./feature/feature.module').then(m => m.FeatureModule) }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const lazyLoadingViolation = violations.find(v =>
          v.includes('No lazy loading')
        );
        expect(lazyLoadingViolation).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should detect string-based lazy loading', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'feature', loadChildren: './feature/feature.module#FeatureModule' }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        expect(
          violations.some(
            v => v.includes('String-based') || v.includes('deprecated')
          )
        ).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should detect loadChildren without dynamic import syntax', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'feature', loadChildren: someFunction }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        expect(
          violations.some(v => v.includes('Improper') || v.includes('syntax'))
        ).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest preloading strategy for RouterModule.forRoot', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @NgModule({
            imports: [RouterModule.forRoot(routes)]
          })
          export class AppRoutingModule {}
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const preloadingSuggestion = suggestions.find(s =>
          s.includes('preloading')
        );
        expect(preloadingSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest preloading when strategy is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @NgModule({
            imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })]
          })
          export class AppRoutingModule {}
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const preloadingSuggestion = suggestions.find(s =>
          s.includes('preloading')
        );
        expect(preloadingSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should detect tracing enabled in production', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          @NgModule({
            imports: [RouterModule.forRoot(routes, { enableTracing: true })]
          })
          export class AppRoutingModule {}
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        expect(violations.some(v => v.includes('tracing'))).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest route guards for lazy loaded modules without guards', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'admin', loadChildren: () => import('./admin/admin.module') }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const guardSuggestion = suggestions.find(s => s.includes('guard'));
        expect(guardSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest guards when canActivate is present', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'admin', loadChildren: () => import('./admin/admin.module'), canActivate: [AuthGuard] }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const guardSuggestion = suggestions.find(s => s.includes('guard'));
        expect(guardSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest ActivatedRoute when route data used without import', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            { path: 'user', component: UserComponent, data: { title: 'User' } }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const activatedRouteSuggestion = suggestions.find(s =>
          s.includes('ActivatedRoute')
        );
        expect(activatedRouteSuggestion).toBeDefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should not suggest ActivatedRoute when already imported', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          import { ActivatedRoute } from '@angular/router';
          const routes: Routes = [
            { path: 'user', component: UserComponent, data: { title: 'User' } }
          ];
        `);
        basenameSpy.mockReturnValue('app-routing.module.ts');

        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularRoutingValidationPatterns.analyzeRoutingFile(
          '/test/app-routing.module.ts',
          violations,
          suggestions
        );

        const activatedRouteSuggestion = suggestions.find(s =>
          s.includes('ActivatedRoute')
        );
        expect(activatedRouteSuggestion).toBeUndefined();

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });
  });

  describe('AngularRoutingConfiguration', () => {
    describe('analyzeRoutingPatterns', () => {
      it('should detect lazy loading patterns', () => {
        const content = `loadChildren: () => import('./module')`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasLazyLoading).toBe(true);
        expect(result.hasLoadChildren).toBe(true);
        expect(result.hasDynamicImportSyntax).toBe(true);
      });

      it('should detect eager loading patterns', () => {
        const content = `{ path: 'home', component: HomeComponent }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasEagerLoading).toBe(true);
        expect(result.hasLazyLoading).toBe(false);
      });

      it('should detect string-based lazy loading', () => {
        const content = `loadChildren: './module#FeatureModule'`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasStringBasedLazy).toBe(true);
      });

      it('should detect RouterModule.forRoot', () => {
        const content = `RouterModule.forRoot(routes)`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouterForRoot).toBe(true);
      });

      it('should detect preloading strategy', () => {
        const content = `RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasPreloadingStrategy).toBe(true);
      });

      it('should detect tracing enabled', () => {
        const content = `RouterModule.forRoot(routes, { enableTracing: true })`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasTracingEnabled).toBe(true);
      });

      it('should detect route guards', () => {
        const content = `{ path: 'admin', canActivate: [AuthGuard] }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteGuards).toBe(true);
      });

      it('should detect route data', () => {
        const content = `{ path: 'home', data: { title: 'Home' } }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteData).toBe(true);
      });

      it('should detect ActivatedRoute', () => {
        const content = `constructor(private route: ActivatedRoute) {}`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasActivatedRoute).toBe(true);
      });

      it('should detect canLoad guard', () => {
        const content = `{ path: 'admin', canLoad: [AuthGuard] }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteGuards).toBe(true);
      });

      it('should detect canDeactivate guard', () => {
        const content = `{ path: 'form', canDeactivate: [CanDeactivateGuard] }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteGuards).toBe(true);
      });

      it('should detect resolve in route config', () => {
        const content = `{ path: 'user', resolve: { user: UserResolver } }`;
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteData).toBe(true);
      });
    });

    describe('buildMessage', () => {
      it('should replace fileName placeholder', () => {
        const template = 'Error in {fileName}';
        const result = AngularRoutingConfiguration.buildMessage(
          template,
          'test.ts'
        );

        expect(result).toBe('Error in test.ts');
      });

      it('should handle messages without placeholder', () => {
        const template = 'Generic error message';
        const result = AngularRoutingConfiguration.buildMessage(
          template,
          'test.ts'
        );

        expect(result).toBe('Generic error message');
      });
    });
  });
});
