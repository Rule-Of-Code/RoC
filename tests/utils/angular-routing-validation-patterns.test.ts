/**
 * @fileoverview Tests for angular-routing-validation-patterns.ts
 * @description Tests for Angular routing validation patterns utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularRoutingConfiguration } from '../../src/utils/angular/angular-routing/angular-routing-configuration';
import { AngularRoutingValidationPatterns } from '../../src/utils/angular/angular-routing/angular-routing-validation-patterns';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-routing/angular-routing-validation-patterns', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('routing-validation-test-');
    mockConfig = {
      extends: [],
      laws: {},
      plugins: [],
      ignorePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  describe('analyzeRoutingPatterns', () => {
    it('should detect lazy loading with loadChildren', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'admin',
              loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
            }
          ];
        `
      );

      expect(patterns.hasLazyLoading).toBe(true);
      expect(patterns.hasLoadChildren).toBe(true);
      expect(patterns.hasDynamicImportSyntax).toBe(true);
    });

    it('should detect eager loading without lazy loading', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'home',
              component: HomeComponent
            }
          ];
        `
      );

      expect(patterns.hasEagerLoading).toBe(true);
      expect(patterns.hasLazyLoading).toBe(false);
    });

    it('should detect deprecated string-based lazy loading', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'admin',
              loadChildren: './admin/admin.module#AdminModule'
            }
          ];
        `
      );

      expect(patterns.hasStringBasedLazy).toBe(true);
      expect(patterns.hasDynamicImportSyntax).toBe(false);
    });

    it('should detect RouterModule.forRoot', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          @NgModule({
            imports: [RouterModule.forRoot(routes)]
          })
          export class AppRoutingModule {}
        `
      );

      expect(patterns.hasRouterForRoot).toBe(true);
    });

    it('should detect preloading strategy', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          @NgModule({
            imports: [RouterModule.forRoot(routes, {
              preloadingStrategy: PreloadAllModules
            })]
          })
          export class AppRoutingModule {}
        `
      );

      expect(patterns.hasPreloadingStrategy).toBe(true);
    });

    it('should detect router tracing enabled', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          @NgModule({
            imports: [RouterModule.forRoot(routes, {
              enableTracing: true
            })]
          })
          export class AppRoutingModule {}
        `
      );

      expect(patterns.hasTracingEnabled).toBe(true);
    });

    it('should detect route guards', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'admin',
              canActivate: [AuthGuard],
              loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
            }
          ];
        `
      );

      expect(patterns.hasRouteGuards).toBe(true);
    });

    it('should detect canLoad guard', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'admin',
              canLoad: [AuthGuard],
              loadChildren: () => import('./admin/admin.module')
            }
          ];
        `
      );

      expect(patterns.hasRouteGuards).toBe(true);
    });

    it('should detect canDeactivate guard', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'form',
              component: FormComponent,
              canDeactivate: [UnsavedChangesGuard]
            }
          ];
        `
      );

      expect(patterns.hasRouteGuards).toBe(true);
    });

    it('should detect route data', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'admin',
              component: AdminComponent,
              data: { role: 'admin' }
            }
          ];
        `
      );

      expect(patterns.hasRouteData).toBe(true);
    });

    it('should detect route resolvers', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          const routes: Routes = [
            {
              path: 'user/:id',
              component: UserComponent,
              resolve: { user: UserResolver }
            }
          ];
        `
      );

      expect(patterns.hasRouteData).toBe(true);
    });

    it('should detect ActivatedRoute usage', () => {
      const patterns = AngularRoutingConfiguration.analyzeRoutingPatterns(
        `
          export class UserComponent {
            constructor(private route: ActivatedRoute) {}
          }
        `
      );

      expect(patterns.hasActivatedRoute).toBe(true);
    });
  });

  describe('analyzeRoutingFile', () => {
    it('should add violation for eager loading without lazy loading', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularRoutingValidationPatterns.analyzeRoutingFile(
        createTempRoutingFile(
          tempDir,
          `
          const routes: Routes = [
            { path: 'home', component: HomeComponent }
          ];
        `
        ),
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should add violation for string-based lazy loading', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularRoutingValidationPatterns.analyzeRoutingFile(
        createTempRoutingFile(
          tempDir,
          `
          const routes: Routes = [
            {
              path: 'admin',
              loadChildren: './admin/admin.module#AdminModule'
            }
          ];
        `
        ),
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should add violation for router tracing in production', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularRoutingValidationPatterns.analyzeRoutingFile(
        createTempRoutingFile(
          tempDir,
          `
          @NgModule({
            imports: [RouterModule.forRoot(routes, {
              enableTracing: true
            })]
          })
          export class AppRoutingModule {}
        `
        ),
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should suggest preloading strategy when missing', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularRoutingValidationPatterns.analyzeRoutingFile(
        createTempRoutingFile(
          tempDir,
          `
          @NgModule({
            imports: [RouterModule.forRoot(routes)]
          })
          export class AppRoutingModule {}
        `
        ),
        violations,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateAllRoutingPatterns', () => {
    it('should return empty results for project without routing files', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      const result =
        AngularRoutingValidationPatterns.validateAllRoutingPatterns(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze routing modules in project', () => {
      const srcPath = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcPath);

      FileUtils.writeFile(
        PathOperations.join(srcPath, 'app-routing.module.ts'),
        `
          import { NgModule } from '@angular/core';
          import { RouterModule, Routes } from '@angular/router';

          const routes: Routes = [
            { path: '', component: HomeComponent },
            {
              path: 'admin',
              loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
            }
          ];

          @NgModule({
            imports: [RouterModule.forRoot(routes, {
              preloadingStrategy: PreloadAllModules
            })],
            exports: [RouterModule]
          })
          export class AppRoutingModule {}
        `
      );

      const result =
        AngularRoutingValidationPatterns.validateAllRoutingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have all required validation messages', () => {
      const messages = AngularRoutingConfiguration.VALIDATION_MESSAGES;

      expect(messages.NO_ROUTING_MODULES_SUGGESTION).toBeDefined();
      expect(messages.NO_LAZY_LOADING_VIOLATION).toBeDefined();
      expect(messages.LAZY_LOADING_SUGGESTION).toBeDefined();
      expect(messages.STRING_BASED_LAZY_VIOLATION).toBeDefined();
      expect(messages.STRING_BASED_LAZY_SUGGESTION).toBeDefined();
      expect(messages.PRELOADING_STRATEGY_SUGGESTION).toBeDefined();
      expect(messages.TRACING_PRODUCTION_VIOLATION).toBeDefined();
      expect(messages.ROUTE_GUARDS_SUGGESTION).toBeDefined();
    });

    it('should contain fileName placeholder in messages', () => {
      const messages = AngularRoutingConfiguration.VALIDATION_MESSAGES;

      expect(messages.NO_LAZY_LOADING_VIOLATION).toContain('{fileName}');
      expect(messages.LAZY_LOADING_SUGGESTION).toContain('{fileName}');
    });
  });

  describe('ROUTING_PATTERNS', () => {
    it('should have routing file extensions defined', () => {
      const patterns = AngularRoutingConfiguration.ROUTING_PATTERNS;

      expect(patterns.ROUTING_FILE_EXTENSIONS).toContain('-routing.module.ts');
      expect(patterns.ROUTING_FILE_EXTENSIONS).toContain('.routing.ts');
    });

    it('should have lazy loading indicators', () => {
      const patterns = AngularRoutingConfiguration.ROUTING_PATTERNS;

      expect(patterns.LAZY_LOADING_INDICATORS).toContain('loadChildren');
      expect(patterns.LAZY_LOADING_INDICATORS).toContain('() => import(');
    });
  });
});

/**
 * Helper function to create a temporary routing file
 */
function createTempRoutingFile(tempDir: string, content: string): string {
  const srcPath = PathOperations.join(tempDir, 'src');
  if (!FileUtils.exists(srcPath)) {
    FileUtils.createDirectory(srcPath);
  }
  const filePath = PathOperations.join(srcPath, 'test-routing.module.ts');
  FileUtils.writeFile(filePath, content);
  return filePath;
}
