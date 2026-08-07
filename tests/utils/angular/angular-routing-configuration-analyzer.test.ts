/**
 * @fileoverview Tests for angular-routing-configuration-analyzer.ts
 * @description Tests for Angular routing configuration analyzer utility
 */

import type { RuleOfCodeConfig } from '../../../src/config/types';
import { AngularRoutingConfiguration } from '../../../src/utils/angular/angular-routing/angular-routing-configuration';
import { AngularRoutingConfigurationAnalyzer } from '../../../src/utils/angular/angular-routing/angular-routing-configuration-analyzer';
import { AngularRoutingValidationPatterns } from '../../../src/utils/angular/angular-routing/angular-routing-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('utils/angular/angular-routing/angular-routing-configuration-analyzer', () => {
  const mockConfig = {
    projectRoot: '/test/project',
    verbose: false,
    excludePatterns: ['node_modules', 'dist'],
    includePatterns: ['**/*.ts'],
  } as unknown as RuleOfCodeConfig;

  describe('AngularRoutingConfigurationAnalyzer', () => {
    describe('checkRoutingConfiguration', () => {
      it('should delegate to AngularRoutingValidationPatterns', () => {
        const validateSpy = jest.spyOn(
          AngularRoutingValidationPatterns,
          'validateAllRoutingPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        const result =
          AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
            '/test/project',
            mockConfig
          );

        expect(validateSpy).toHaveBeenCalledWith('/test/project', mockConfig);
        expect(result).toHaveProperty('violations');
        expect(result).toHaveProperty('suggestions');

        validateSpy.mockRestore();
      });

      it('should return violations from validation patterns', () => {
        const validateSpy = jest.spyOn(
          AngularRoutingValidationPatterns,
          'validateAllRoutingPatterns'
        );

        validateSpy.mockReturnValue({
          violations: ['No lazy loading found'],
          suggestions: ['Consider using loadChildren'],
          filesScanned: 1,
          patternsFound: 1,
        });

        const result =
          AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toContain('No lazy loading found');
        expect(result.suggestions).toContain('Consider using loadChildren');

        validateSpy.mockRestore();
      });

      it('should return empty arrays when no issues found', () => {
        const validateSpy = jest.spyOn(
          AngularRoutingValidationPatterns,
          'validateAllRoutingPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [],
          suggestions: [],
          filesScanned: 0,
          patternsFound: 0,
        });

        const result =
          AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(0);
        expect(result.suggestions).toHaveLength(0);

        validateSpy.mockRestore();
      });

      it('should handle multiple violations and suggestions', () => {
        const validateSpy = jest.spyOn(
          AngularRoutingValidationPatterns,
          'validateAllRoutingPatterns'
        );

        validateSpy.mockReturnValue({
          violations: [
            'No lazy loading in app-routing.module.ts',
            'String-based lazy loading in feature-routing.module.ts',
          ],
          suggestions: [
            'Use loadChildren for lazy loading',
            'Use dynamic imports',
          ],
          filesScanned: 2,
          patternsFound: 2,
        });

        const result =
          AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
            '/test/project',
            mockConfig
          );

        expect(result.violations).toHaveLength(2);
        expect(result.suggestions).toHaveLength(2);

        validateSpy.mockRestore();
      });
    });
  });

  describe('AngularRoutingValidationPatterns', () => {
    describe('analyzeRoutingFile', () => {
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

        expect(violations.length).toBeGreaterThan(0);
        expect(
          violations.some(
            v => v.includes('String-based') || v.includes('deprecated')
          )
        ).toBe(true);

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });

      it('should suggest preloading strategy', () => {
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

      it('should suggest route guards for lazy loaded modules', () => {
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

      it('should suggest ActivatedRoute when route data used', () => {
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

      it('should not add violations for proper lazy loading with guards', () => {
        const readFileSpy = jest.spyOn(FileUtils, 'readFile');
        const basenameSpy = jest.spyOn(PathOperations, 'getBasename');

        readFileSpy.mockReturnValue(`
          const routes: Routes = [
            {
              path: 'admin',
              loadChildren: () => import('./admin/admin.module'),
              canActivate: [AuthGuard]
            }
          ];
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

        // Should have no violations for lazy loading
        expect(violations.filter(v => v.includes('lazy loading'))).toHaveLength(
          0
        );

        readFileSpy.mockRestore();
        basenameSpy.mockRestore();
      });
    });
  });

  describe('AngularRoutingConfiguration', () => {
    describe('analyzeRoutingPatterns', () => {
      it('should detect lazy loading indicators', () => {
        const content =
          "loadChildren: () => import('./feature/feature.module')";
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasLazyLoading).toBe(true);
        expect(result.hasLoadChildren).toBe(true);
      });

      it('should detect eager loading', () => {
        const content = '{ path: "home", component: HomeComponent }';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasEagerLoading).toBe(true);
      });

      it('should detect string-based lazy loading pattern', () => {
        const content =
          "loadChildren: './feature/feature.module#FeatureModule'";
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasStringBasedLazy).toBe(true);
      });

      it('should detect dynamic import syntax', () => {
        const content = "() => import('./feature/feature.module')";
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasDynamicImportSyntax).toBe(true);
      });

      it('should detect RouterModule.forRoot', () => {
        const content = 'RouterModule.forRoot(routes)';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouterForRoot).toBe(true);
      });

      it('should detect preloading strategy', () => {
        const content = '{ preloadingStrategy: PreloadAllModules }';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasPreloadingStrategy).toBe(true);
      });

      it('should detect tracing enabled', () => {
        const content = '{ enableTracing: true }';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasTracingEnabled).toBe(true);
      });

      it('should detect route guards', () => {
        const content = '{ path: "admin", canActivate: [AuthGuard] }';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteGuards).toBe(true);
      });

      it('should detect route data', () => {
        const content = '{ path: "user", data: { title: "User Profile" } }';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasRouteData).toBe(true);
      });

      it('should detect ActivatedRoute', () => {
        const content = 'constructor(private route: ActivatedRoute) {}';
        const result =
          AngularRoutingConfiguration.analyzeRoutingPatterns(content);

        expect(result.hasActivatedRoute).toBe(true);
      });
    });

    describe('ROUTING_PATTERNS', () => {
      it('should have lazy loading indicators', () => {
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.LAZY_LOADING_INDICATORS
        ).toBeDefined();
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.LAZY_LOADING_INDICATORS
            .length
        ).toBeGreaterThan(0);
      });

      it('should have routing file extensions', () => {
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTING_FILE_EXTENSIONS
        ).toBeDefined();
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTING_FILE_EXTENSIONS
        ).toContain('-routing.module.ts');
      });

      it('should have route guards', () => {
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_GUARDS
        ).toBeDefined();
        expect(
          AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_GUARDS
        ).toContain('canActivate');
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should have no lazy loading violation message', () => {
        expect(
          AngularRoutingConfiguration.VALIDATION_MESSAGES
            .NO_LAZY_LOADING_VIOLATION
        ).toBeDefined();
      });

      it('should have string-based lazy violation message', () => {
        expect(
          AngularRoutingConfiguration.VALIDATION_MESSAGES
            .STRING_BASED_LAZY_VIOLATION
        ).toBeDefined();
      });

      it('should have preloading strategy suggestion', () => {
        expect(
          AngularRoutingConfiguration.VALIDATION_MESSAGES
            .PRELOADING_STRATEGY_SUGGESTION
        ).toBeDefined();
      });

      it('should have tracing production violation', () => {
        expect(
          AngularRoutingConfiguration.VALIDATION_MESSAGES
            .TRACING_PRODUCTION_VIOLATION
        ).toBeDefined();
      });

      it('should have route guards suggestion', () => {
        expect(
          AngularRoutingConfiguration.VALIDATION_MESSAGES
            .ROUTE_GUARDS_SUGGESTION
        ).toBeDefined();
      });
    });
  });
});
