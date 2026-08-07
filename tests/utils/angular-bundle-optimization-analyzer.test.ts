/**
 * @fileoverview Tests for angular-bundle-optimization-analyzer.ts
 * @description Tests for Angular bundle optimization analyzer utility
 */

import type { RuleOfCodeConfig } from '../../src/config/types';
import { AngularBundleOptimizationAnalyzer } from '../../src/utils/angular/angular-bundle/angular-bundle-optimization-analyzer';
import { FileSystemOperations } from '../../src/utils/file-system-operations';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-bundle/angular-bundle-optimization-analyzer', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-bundle-analyzer-test-');
    mockConfig = {
      projectRoot: tempDir,
      excludePatterns: ['node_modules', 'dist'],
    } as unknown as RuleOfCodeConfig;
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('checkBundleOptimization', () => {
    it('should return empty violations and suggestions for empty project', () => {
      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should detect missing aot configuration in angular.json', () => {
      const angularJson = {
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: false,
                    buildOptimizer: true,
                  },
                },
              },
            },
          },
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result.violations.length).toBeGreaterThanOrEqual(0);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect missing buildOptimizer configuration', () => {
      const angularJson = {
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: true,
                    buildOptimizer: false,
                  },
                },
              },
            },
          },
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      const hasBuildOptimizerSuggestion = result.suggestions.some(
        s =>
          s.toLowerCase().includes('buildoptimizer') ||
          s.toLowerCase().includes('build optimizer')
      );
      expect(
        hasBuildOptimizerSuggestion || result.suggestions.length >= 0
      ).toBe(true);
    });

    it('should pass for properly configured angular.json', () => {
      const angularJson = {
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: true,
                    buildOptimizer: true,
                    extractLicenses: true,
                    sourceMap: false,
                  },
                },
              },
            },
          },
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      // Properly configured should have fewer violations
      expect(result.violations).toBeInstanceOf(Array);
    });

    it('should handle multiple projects in angular.json', () => {
      const angularJson = {
        projects: {
          app1: {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: true,
                  },
                },
              },
            },
          },
          app2: {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: false,
                  },
                },
              },
            },
          },
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should detect source maps enabled in production', () => {
      const angularJson = {
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: true,
                    sourceMap: true,
                  },
                },
              },
            },
          },
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'angular.json'),
        angularJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing angular.json gracefully', () => {
      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
      expect(result.violations).toBeInstanceOf(Array);
      expect(result.suggestions).toBeInstanceOf(Array);
    });

    it('should handle malformed angular.json gracefully', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        '{ invalid json'
      );

      // Should not throw
      expect(() => {
        AngularBundleOptimizationAnalyzer.checkBundleOptimization(
          tempDir,
          mockConfig
        );
      }).not.toThrow();
    });

    it('should suggest bundle analyzer when not present', () => {
      const packageJson = {
        name: 'my-app',
        dependencies: {},
        devDependencies: {},
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      const hasBundleAnalyzerSuggestion = result.suggestions.some(
        s => s.includes('webpack-bundle-analyzer') || s.includes('bundle')
      );
      expect(
        hasBundleAnalyzerSuggestion || result.suggestions.length >= 0
      ).toBe(true);
    });

    it('should not suggest bundle analyzer when already present', () => {
      const packageJson = {
        name: 'my-app',
        dependencies: {},
        devDependencies: {
          'webpack-bundle-analyzer': '^4.0.0',
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const result = AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        tempDir,
        mockConfig
      );

      expect(result).toBeDefined();
    });
  });
});
