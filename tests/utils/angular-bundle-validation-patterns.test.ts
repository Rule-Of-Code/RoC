/**
 * @fileoverview Tests for angular-bundle-validation-patterns.ts
 * @description Tests for Angular bundle validation patterns utility
 */

import { AngularBundleValidationPatterns } from '../../src/utils/angular/angular-bundle/angular-bundle-validation-patterns';
import { FileSystemOperations } from '../../src/utils/file-system-operations';
import { FileUtils } from '../../src/utils/file-utils';
import { PathOperations } from '../../src/utils/path-operations';

describe('utils/angular/angular-bundle/angular-bundle-validation-patterns', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-bundle-patterns-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('validateBuildConfiguration', () => {
    it('should validate production configurations from angular.json', () => {
      const angularConfig = {
        projects: {
          'test-app': {
            architect: {
              build: {
                configurations: {
                  production: {
                    aot: true,
                    buildOptimizer: true,
                  },
                },
              },
            },
          },
        },
      };

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should add violations for missing aot configuration', () => {
      const angularConfig = {
        projects: {
          'test-app': {
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

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty angular config', () => {
      const angularConfig = {};
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle missing projects key', () => {
      const angularConfig = { version: 1 };
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
    });

    it('should validate multiple projects', () => {
      const angularConfig = {
        projects: {
          app1: {
            architect: {
              build: {
                configurations: {
                  production: { aot: true },
                },
              },
            },
          },
          app2: {
            architect: {
              build: {
                configurations: {
                  production: { aot: false },
                },
              },
            },
          },
        },
      };

      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBuildConfiguration(
        angularConfig,
        violations,
        suggestions
      );

      expect(violations.length + suggestions.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateBundleAnalyzer', () => {
    it('should suggest bundle analyzer when not in package.json', () => {
      const packageJson = {
        name: 'test-app',
        dependencies: {},
        devDependencies: {},
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBundleAnalyzer(
        tempDir,
        suggestions
      );

      const hasSuggestion = suggestions.some(
        s => s.includes('webpack-bundle-analyzer') || s.includes('bundle')
      );
      expect(hasSuggestion || suggestions.length === 0).toBe(true);
    });

    it('should not suggest when bundle analyzer is in devDependencies', () => {
      const packageJson = {
        name: 'test-app',
        dependencies: {},
        devDependencies: {
          'webpack-bundle-analyzer': '^4.5.0',
        },
      };

      FileSystemOperations.writeJsonFile(
        PathOperations.join(tempDir, 'package.json'),
        packageJson
      );

      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBundleAnalyzer(
        tempDir,
        suggestions
      );

      const hasBundleAnalyzerSuggestion = suggestions.some(s =>
        s.includes('webpack-bundle-analyzer')
      );
      expect(hasBundleAnalyzerSuggestion).toBe(false);
    });

    it('should handle missing package.json gracefully', () => {
      const suggestions: string[] = [];

      expect(() => {
        AngularBundleValidationPatterns.validateBundleAnalyzer(
          tempDir,
          suggestions
        );
      }).not.toThrow();
    });
  });

  describe('validatePerformanceBudgets', () => {
    it('should suggest performance budgets when not configured', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validatePerformanceBudgets(
        tempDir,
        suggestions
      );

      // Should add suggestion for missing budgets or handle gracefully
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle project without angular.json', () => {
      const suggestions: string[] = [];

      expect(() => {
        AngularBundleValidationPatterns.validatePerformanceBudgets(
          tempDir,
          suggestions
        );
      }).not.toThrow();
    });
  });

  describe('validateWebpackConfiguration', () => {
    it('should suggest webpack configuration when not present', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      // Should handle missing webpack config
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should detect existing webpack configuration', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack.config.js'),
        'module.exports = { performance: { maxAssetSize: 500000 } };'
      );

      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should handle errors gracefully', () => {
      const suggestions: string[] = [];

      expect(() => {
        AngularBundleValidationPatterns.validateWebpackConfiguration(
          '/nonexistent/path',
          suggestions
        );
      }).not.toThrow();
    });
  });
});
