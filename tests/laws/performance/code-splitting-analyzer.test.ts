/**
 * Tests for CodeSplittingAnalyzerService
 *
 * Tests for code splitting configuration detection including
 * lazy loading and dynamic imports.
 */
import { CodeSplittingAnalyzerService } from '../../../src/laws/performance/bundle-optimization-strategy/services/code-splitting.analyzer';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('CodeSplittingAnalyzerService', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('code-splitting-analyzer-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        componentPrefix: 'app',
        type: 'angular',
      },
      ignores: {
        global: ['node_modules/**', 'dist/**'],
        tests: ['**/*.spec.ts'],
        build: ['dist/**'],
        design: [],
      },
      laws: {
        paretoMode: false,
        severity: {},
      },
      hooks: {
        preCommit: false,
        prePush: false,
        commitMsg: false,
      },
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: true,
      },
      performance: {
        parallel: true,
        maxConcurrent: 4,
        cache: true,
      },
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    jest.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should return isConfigured false when no code splitting is found', () => {
      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(false);
      expect(result.strategies).toHaveLength(0);
    });

    it('should detect route-based lazy loading in routing files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      const routingContent = `
        import { NgModule } from '@angular/core';
        import { RouterModule, Routes } from '@angular/router';

        const routes: Routes = [
          {
            path: 'dashboard',
            loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardModule)
          }
        ];

        @NgModule({
          imports: [RouterModule.forRoot(routes)],
          exports: [RouterModule]
        })
        export class AppRoutingModule { }
      `;
      FileUtils.writeFile(routingFile, routingContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(true);
      expect(result.strategies).toContain(
        'Route-based code splitting with lazy loading'
      );
    });

    it('should detect dynamic imports in TypeScript files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentFile = PathOperations.join(srcDir, 'app.component.ts');
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root',
          templateUrl: './app.component.html'
        })
        export class AppComponent {
          async loadHeavyModule() {
            const module = import('./heavy-module/heavy.module').then(m => m.HeavyModule);
            return module;
          }
        }
      `;
      FileUtils.writeFile(componentFile, componentContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(true);
      expect(result.strategies).toContain('Manual dynamic imports detected');
    });

    it('should detect both lazy loading and dynamic imports', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Routing file with lazy loading
      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      const routingContent = `
        const routes = [
          { path: 'lazy', loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule) }
        ];
      `;
      FileUtils.writeFile(routingFile, routingContent);

      // Another file with dynamic imports
      const serviceFile = PathOperations.join(srcDir, 'loader.service.ts');
      const serviceContent = `
        export class LoaderService {
          loadPlugin() {
            return import('./plugins/plugin').then(p => p.default);
          }
        }
      `;
      FileUtils.writeFile(serviceFile, serviceContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(true);
      expect(result.strategies).toContain(
        'Route-based code splitting with lazy loading'
      );
      expect(result.strategies).toContain('Manual dynamic imports detected');
    });

    it('should not detect lazy loading without both loadChildren and import()', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      const routingContent = `
        const routes = [
          { path: 'dashboard', component: DashboardComponent }
        ];
      `;
      FileUtils.writeFile(routingFile, routingContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(false);
    });

    it('should not detect dynamic imports without .then() as lazy loading but might detect as dynamic import', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const componentFile = PathOperations.join(srcDir, 'app.component.ts');
      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-root'
        })
        export class AppComponent {
          // Has import( but no .then(
          async loadModule() {
            const mod = await import('./module');
            return mod;
          }
        }
      `;
      FileUtils.writeFile(componentFile, componentContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      // The implementation looks for import( and .then( patterns
      // Since await import('./module') doesn't have .then(, it should not be detected
      // as manual dynamic imports (which requires both patterns)
      expect(result.strategies).not.toContain(
        'Route-based code splitting with lazy loading'
      );
    });

    it('should handle missing src directory gracefully', () => {
      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(false);
      expect(result.strategies).toHaveLength(0);
    });

    it('should handle file read errors gracefully', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Create a directory with the name of a routing file (will cause read error)
      const routingDir = PathOperations.join(srcDir, 'app-routing.module.ts');
      FileUtils.createDirectory(routingDir);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(false);
    });

    it('should detect loadChildren in nested directories', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      const featuresDir = PathOperations.join(srcDir, 'features');
      FileUtils.createDirectory(featuresDir);

      const routingFile = PathOperations.join(
        featuresDir,
        'feature-routing.module.ts'
      );
      const routingContent = `
        const routes = [
          { path: '', loadChildren: () => import('./sub-feature/sub.module').then(m => m.SubModule) }
        ];
      `;
      FileUtils.writeFile(routingFile, routingContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(true);
      expect(result.strategies).toContain(
        'Route-based code splitting with lazy loading'
      );
    });

    it('should respect ignore patterns from config', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const specFile = PathOperations.join(srcDir, 'app.component.spec.ts');
      const specContent = `
        describe('AppComponent', () => {
          it('should load', () => {
            import('./test-module').then(m => m.TestModule);
          });
        });
      `;
      FileUtils.writeFile(specFile, specContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      // Spec files should be ignored per config
      expect(result.isConfigured).toBe(false);
    });

    it('should scan both routing files and regular TypeScript files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      // Regular TS file with dynamic import
      const serviceFile = PathOperations.join(srcDir, 'dynamic-loader.ts');
      const serviceContent = `
        export async function loadFeature() {
          return import('./feature').then(f => f.FeatureModule);
        }
      `;
      FileUtils.writeFile(serviceFile, serviceContent);

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(true);
      expect(result.strategies).toContain('Manual dynamic imports detected');
    });

    it('should handle empty routing files', () => {
      const srcDir = PathOperations.join(tempDir, 'src');
      FileUtils.createDirectory(srcDir);

      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      FileUtils.writeFile(routingFile, '');

      const result = CodeSplittingAnalyzerService.analyze(tempDir, mockConfig);

      expect(result.isConfigured).toBe(false);
    });
  });
});
