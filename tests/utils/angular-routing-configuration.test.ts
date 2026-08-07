/**
 * @fileoverview Tests for angular-routing-configuration.ts
 * @description Tests for Angular routing configuration utilities
 */

import { AngularRoutingConfiguration } from '../../src/utils/angular/angular-routing/angular-routing-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-routing/angular-routing-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-routing-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('ROUTING_PATTERNS', () => {
    it('should have LAZY_LOADING_INDICATORS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.LAZY_LOADING_INDICATORS
      ).toBeDefined();
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.LAZY_LOADING_INDICATORS
      ).toContain('loadChildren');
    });

    it('should have EAGER_LOADING_INDICATORS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.EAGER_LOADING_INDICATORS
      ).toBeDefined();
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.EAGER_LOADING_INDICATORS
      ).toContain('component:');
    });

    it('should have STRING_BASED_LAZY_PATTERN as regex', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.STRING_BASED_LAZY_PATTERN
      ).toBeInstanceOf(RegExp);
    });

    it('should have ROUTER_CONFIG with RouterModule.forRoot', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTER_CONFIG
      ).toContain('RouterModule.forRoot');
    });

    it('should have PRELOADING_INDICATORS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.PRELOADING_INDICATORS
      ).toContain('preloadingStrategy');
    });

    it('should have TRACING_INDICATORS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.TRACING_INDICATORS
      ).toContain('enableTracing: true');
    });

    it('should have ROUTE_GUARDS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_GUARDS
      ).toContain('canActivate');
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_GUARDS
      ).toContain('canLoad');
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_GUARDS
      ).toContain('canDeactivate');
    });

    it('should have ROUTE_DATA defined', () => {
      expect(AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_DATA).toContain(
        'data:'
      );
      expect(AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTE_DATA).toContain(
        'resolve:'
      );
    });

    it('should have ACTIVATED_ROUTE defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ACTIVATED_ROUTE
      ).toContain('ActivatedRoute');
    });

    it('should have ROUTING_FILE_EXTENSIONS defined', () => {
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTING_FILE_EXTENSIONS
      ).toContain('-routing.module.ts');
      expect(
        AngularRoutingConfiguration.ROUTING_PATTERNS.ROUTING_FILE_EXTENSIONS
      ).toContain('.routing.ts');
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have NO_ROUTING_MODULES_SUGGESTION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .NO_ROUTING_MODULES_SUGGESTION
      ).toContain('routing');
    });

    it('should have NO_LAZY_LOADING_VIOLATION with placeholder', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .NO_LAZY_LOADING_VIOLATION
      ).toContain('{fileName}');
    });

    it('should have LAZY_LOADING_SUGGESTION with placeholder', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES.LAZY_LOADING_SUGGESTION
      ).toContain('{fileName}');
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES.LAZY_LOADING_SUGGESTION
      ).toContain('loadChildren');
    });

    it('should have STRING_BASED_LAZY_VIOLATION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .STRING_BASED_LAZY_VIOLATION
      ).toContain('deprecated');
    });

    it('should have STRING_BASED_LAZY_SUGGESTION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .STRING_BASED_LAZY_SUGGESTION
      ).toContain('dynamic imports');
    });

    it('should have IMPROPER_LAZY_SYNTAX_VIOLATION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .IMPROPER_LAZY_SYNTAX_VIOLATION
      ).toContain('{fileName}');
    });

    it('should have PRELOADING_STRATEGY_SUGGESTION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .PRELOADING_STRATEGY_SUGGESTION
      ).toContain('preloading');
    });

    it('should have TRACING_PRODUCTION_VIOLATION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .TRACING_PRODUCTION_VIOLATION
      ).toContain('production');
    });

    it('should have ROUTE_GUARDS_SUGGESTION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES.ROUTE_GUARDS_SUGGESTION
      ).toContain('route guards');
    });

    it('should have ACTIVATED_ROUTE_SUGGESTION', () => {
      expect(
        AngularRoutingConfiguration.VALIDATION_MESSAGES
          .ACTIVATED_ROUTE_SUGGESTION
      ).toContain('ActivatedRoute');
    });
  });

  describe('analyzeRoutingPatterns', () => {
    it('should detect lazy loading with loadChildren', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'admin',
            loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
          }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasLazyLoading).toBe(true);
      expect(result.hasLoadChildren).toBe(true);
    });

    it('should detect eager loading with component', () => {
      const content = `
        const routes: Routes = [
          { path: 'home', component: HomeComponent }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasEagerLoading).toBe(true);
      expect(result.hasLazyLoading).toBe(false);
    });

    it('should not mark eager loading when loadChildren also present', () => {
      const content = `
        const routes: Routes = [
          { path: 'home', component: HomeComponent },
          { path: 'admin', loadChildren: () => import('./admin/admin.module') }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasEagerLoading).toBe(false);
      expect(result.hasLazyLoading).toBe(true);
    });

    it('should detect deprecated string-based lazy loading', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'admin',
            loadChildren: './admin/admin.module#AdminModule'
          }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasStringBasedLazy).toBe(true);
    });

    it('should detect dynamic import syntax', () => {
      const content = `
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasDynamicImportSyntax).toBe(true);
    });

    it('should detect RouterModule.forRoot', () => {
      const content = `
        @NgModule({
          imports: [RouterModule.forRoot(routes)]
        })
        export class AppRoutingModule {}
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasRouterForRoot).toBe(true);
    });

    it('should detect preloading strategy', () => {
      const content = `
        RouterModule.forRoot(routes, {
          preloadingStrategy: PreloadAllModules
        })
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasPreloadingStrategy).toBe(true);
    });

    it('should detect router tracing enabled', () => {
      const content = `
        RouterModule.forRoot(routes, {
          enableTracing: true
        })
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasTracingEnabled).toBe(true);
    });

    it('should detect route guards', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'admin',
            canActivate: [AuthGuard],
            canLoad: [RoleGuard],
            canDeactivate: [UnsavedChangesGuard]
          }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasRouteGuards).toBe(true);
    });

    it('should detect route data', () => {
      const content = `
        const routes: Routes = [
          {
            path: 'user',
            data: { title: 'User Page' },
            resolve: { user: UserResolver }
          }
        ];
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasRouteData).toBe(true);
    });

    it('should detect ActivatedRoute usage', () => {
      const content = `
        constructor(private route: ActivatedRoute) {}
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasActivatedRoute).toBe(true);
    });

    it('should handle empty content', () => {
      const result = AngularRoutingConfiguration.analyzeRoutingPatterns('');

      expect(result.hasLazyLoading).toBe(false);
      expect(result.hasEagerLoading).toBe(false);
      expect(result.hasLoadChildren).toBe(false);
      expect(result.hasRouterForRoot).toBe(false);
    });

    it('should return all routing pattern flags for full routing module', () => {
      const content = `
        import { RouterModule, Routes, ActivatedRoute } from '@angular/router';

        const routes: Routes = [
          {
            path: 'dashboard',
            loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule),
            canActivate: [AuthGuard],
            data: { title: 'Dashboard' }
          }
        ];

        @NgModule({
          imports: [RouterModule.forRoot(routes, {
            preloadingStrategy: PreloadAllModules
          })]
        })
        export class AppRoutingModule {}
      `;
      const result =
        AngularRoutingConfiguration.analyzeRoutingPatterns(content);

      expect(result.hasLazyLoading).toBe(true);
      expect(result.hasLoadChildren).toBe(true);
      expect(result.hasDynamicImportSyntax).toBe(true);
      expect(result.hasRouterForRoot).toBe(true);
      expect(result.hasPreloadingStrategy).toBe(true);
      expect(result.hasRouteGuards).toBe(true);
      expect(result.hasRouteData).toBe(true);
      expect(result.hasActivatedRoute).toBe(true);
    });
  });

  describe('buildMessage (inherited from SignalConfigurationBase)', () => {
    it('should replace {fileName} placeholder', () => {
      const result = AngularRoutingConfiguration.buildMessage(
        'Error in {fileName}',
        'app-routing.module.ts'
      );

      expect(result).toBe('Error in app-routing.module.ts');
    });

    it('should handle message without placeholder', () => {
      const result = AngularRoutingConfiguration.buildMessage(
        'Generic error',
        'test.ts'
      );

      expect(result).toBe('Generic error');
    });
  });
});
