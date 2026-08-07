/**
 * Tests for BundleOptimizationAnalyzerService
 *
 * Tests bundle optimization detection including lazy loading routes and build optimization.
 */
import { BundleOptimizationAnalyzerService } from '../../../src/laws/performance/core-web-vitals-compliance/services/bundle-optimization.analyzer';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileSystemOperations } from '../../../src/utils';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('BundleOptimizationAnalyzerService', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory(
      'bundle-optimization-analyzer-test-'
    );
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
  });

  describe('analyze', () => {
    it('should return isOptimized false when no optimizations are found', () => {
      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(false);
      expect(result.optimizations).toHaveLength(0);
    });

    it('should detect lazy loading routes with loadChildren', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      const content = `
const routes: Routes = [
  {
    path: 'lazy',
    loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)
  }
];
`;
      FileUtils.writeFile(routingFile, content);

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain('Lazy loading routes detected');
    });

    it('should detect lazy loading routes with dynamic import', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      const content = `
const routes: Routes = [
  {
    path: 'feature',
    component: import('./feature/feature.component')
  }
];
`;
      FileUtils.writeFile(routingFile, content);

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain('Lazy loading routes detected');
    });

    it('should detect lazy loading in routing.ts files', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const routingFile = PathOperations.join(srcDir, 'app.routing.ts');
      const content = `
export const routes: Routes = [
  { path: 'home', loadChildren: () => import('./home/home.module') }
];
`;
      FileUtils.writeFile(routingFile, content);

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain('Lazy loading routes detected');
    });

    it('should detect build optimization in angular.json', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain('Build optimization enabled');
    });

    it('should detect build optimization with optimization object', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      const angularJson = {
        version: 1,
        projects: {
          'my-app': {
            architect: {
              build: {
                options: {
                  optimization: {
                    scripts: true,
                    styles: true,
                  },
                },
              },
            },
          },
        },
      };
      FileSystemOperations.writeJsonFile(angularJsonPath, angularJson);

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toContain('Build optimization enabled');
    });

    it('should detect multiple optimizations', () => {
      // Create routing file with lazy loading
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      FileUtils.writeFile(routingFile, 'loadChildren: () => import("./lazy")');

      // Create angular.json with optimization
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          app: {
            architect: {
              build: {
                configurations: {
                  production: {
                    optimization: true,
                  },
                },
              },
            },
          },
        },
      });

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations).toHaveLength(2);
      expect(result.optimizations).toContain('Lazy loading routes detected');
      expect(result.optimizations).toContain('Build optimization enabled');
    });

    it('should not detect lazy loading in non-routing files', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const serviceFile = PathOperations.join(srcDir, 'data.service.ts');
      FileUtils.writeFile(serviceFile, 'loadChildren: () => import("./lazy")');

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain(
        'Lazy loading routes detected'
      );
    });

    it('should return isOptimized true with single optimization', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileSystemOperations.writeJsonFile(angularJsonPath, {
        version: 1,
        projects: {
          app: {
            architect: {
              build: {
                options: { optimization: true },
              },
            },
          },
        },
      });

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.isOptimized).toBe(true);
      expect(result.optimizations.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle file read errors gracefully for routing files', () => {
      const srcDir = PathOperations.join(tempDir, 'src', 'app');
      FileUtils.createDirectory(srcDir);
      const routingFile = PathOperations.join(srcDir, 'app-routing.module.ts');
      FileUtils.writeFile(routingFile, 'loadChildren: () => import("./lazy")');

      const readFileSpy = jest
        .spyOn(FileUtils, 'readFile')
        .mockImplementation(() => {
          throw new Error('Permission denied');
        });

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain(
        'Lazy loading routes detected'
      );

      readFileSpy.mockRestore();
    });

    it('should handle angular.json parse errors gracefully', () => {
      const angularJsonPath = PathOperations.join(tempDir, 'angular.json');
      FileUtils.writeFile(angularJsonPath, 'not valid json');

      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain('Build optimization enabled');
    });

    it('should not detect optimization when angular.json does not exist', () => {
      const result = BundleOptimizationAnalyzerService.analyze(
        tempDir,
        mockConfig
      );

      expect(result.optimizations).not.toContain('Build optimization enabled');
    });
  });
});
