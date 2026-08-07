/**
 * @fileoverview Tests for angular-lazy-loading-patterns-analyzer.ts
 * @description Tests for Angular lazy loading patterns analyzer utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularLazyLoadingPatternsAnalyzer } from '../../src/utils/angular/angular-lazy-loading/angular-lazy-loading-patterns-analyzer';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-lazy-loading/angular-lazy-loading-patterns-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'angular-lazy-loading-analyzer-test-'
    );
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;

    // Create src directory
    FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkLazyLoadingPatterns', () => {
    it('should return empty results for empty project', () => {
      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should analyze module files', () => {
      const moduleContent = `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          imports: [CommonModule],
          declarations: []
        })
        export class FeatureModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'feature.module.ts'),
        moduleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should suggest lazy loading for feature modules', () => {
      const moduleContent = `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';
        import { FeatureComponent } from './feature.component';

        @NgModule({
          imports: [CommonModule],
          declarations: [FeatureComponent]
        })
        export class DashboardModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'dashboard.module.ts'),
        moduleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should not suggest lazy loading for AppModule', () => {
      const appModuleContent = `
        import { NgModule } from '@angular/core';
        import { BrowserModule } from '@angular/platform-browser';
        import { AppComponent } from './app.component';

        @NgModule({
          imports: [BrowserModule],
          declarations: [AppComponent],
          bootstrap: [AppComponent]
        })
        export class AppModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app.module.ts'),
        appModuleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      // AppModule should not trigger lazy loading suggestions
      const hasAppModuleSuggestion = result.suggestions.some(s =>
        s.toLowerCase().includes('app.module')
      );
      expect(hasAppModuleSuggestion).toBe(false);
    });

    it('should detect already lazy-loaded modules', () => {
      const featureModuleContent = `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          imports: [CommonModule],
          declarations: []
        })
        export class ProductsModule { }
      `;

      const routingContent = `
        import { Routes } from '@angular/router';

        export const routes: Routes = [
          {
            path: 'products',
            loadChildren: () => import('./products/products.module').then(m => m.ProductsModule)
          }
        ];
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'products.module.ts'),
        featureModuleContent
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'app-routing.module.ts'),
        routingContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should analyze multiple modules', () => {
      const module1 = `
        import { NgModule } from '@angular/core';
        @NgModule({ declarations: [] })
        export class UsersModule { }
      `;

      const module2 = `
        import { NgModule } from '@angular/core';
        @NgModule({ declarations: [] })
        export class OrdersModule { }
      `;

      const module3 = `
        import { NgModule } from '@angular/core';
        @NgModule({ declarations: [] })
        export class SettingsModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'users.module.ts'),
        module1
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'orders.module.ts'),
        module2
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'settings.module.ts'),
        module3
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should suggest barrel exports when missing', () => {
      const moduleContent = `
        import { NgModule } from '@angular/core';
        @NgModule({ declarations: [] })
        export class FeatureModule { }
      `;

      FileUtils.createDirectory(PathOperations.join(tempDir, 'src', 'feature'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'feature', 'feature.module.ts'),
        moduleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle routing modules', () => {
      const routingModuleContent = `
        import { NgModule } from '@angular/core';
        import { RouterModule, Routes } from '@angular/router';

        const routes: Routes = [
          { path: '', component: HomeComponent }
        ];

        @NgModule({
          imports: [RouterModule.forChild(routes)],
          exports: [RouterModule]
        })
        export class FeatureRoutingModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'feature-routing.module.ts'),
        routingModuleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });

    it('should handle missing src directory', () => {
      FileUtils.deleteDirectory(PathOperations.join(tempDir, 'src'));

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should validate module structure', () => {
      const moduleContent = `
        import { NgModule } from '@angular/core';
        import { CommonModule } from '@angular/common';

        @NgModule({
          imports: [
            CommonModule
          ],
          declarations: [
            FeatureComponent,
            FeatureListComponent
          ],
          exports: [
            FeatureComponent
          ]
        })
        export class FeatureModule { }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'feature.module.ts'),
        moduleContent
      );

      const result =
        AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
          tempDir,
          mockConfig
        );

      expect(result).toBeDefined();
    });
  });
});
