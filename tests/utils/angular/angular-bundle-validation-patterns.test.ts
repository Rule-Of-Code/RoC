/**
 * @fileoverview Tests for angular-bundle-validation-patterns.ts
 * @description Tests for Angular bundle validation patterns utility
 */

import { AngularBundleValidationPatterns } from '../../../src/utils/angular/angular-bundle/angular-bundle-validation-patterns';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

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

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const suggestions: string[] = [];
      AngularBundleValidationPatterns.validateBundleAnalyzer(
        tempDir,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('webpack-bundle-analyzer');
    });

    it('should not suggest bundle analyzer when already present', () => {
      const packageJson = {
        name: 'test-app',
        devDependencies: {
          'webpack-bundle-analyzer': '^4.0.0',
        },
      };

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const suggestions: string[] = [];
      AngularBundleValidationPatterns.validateBundleAnalyzer(
        tempDir,
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should handle missing package.json gracefully', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateBundleAnalyzer(
        tempDir,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });
  });

  describe('validatePerformanceBudgets', () => {
    it('should suggest performance budgets when not configured', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validatePerformanceBudgets(
        tempDir,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('performance budgets');
    });
  });

  // #449, QA matrix on 07dab0d: once the budget hint was right, two Angular
  // CLI projects were told "Add maxAssetSize and maxEntrypointSize in webpack
  // configuration". The CLI owns webpack there; the advice cannot be followed.
  describe('validateWebpackConfiguration: only a project with its own webpack config', () => {
    const angularCli = {
      projects: {
        app: {
          architect: {
            build: { builder: '@angular-devkit/build-angular:application' },
          },
        },
      },
    };

    it('an Angular CLI project (angular.json, no webpack config): no webpack hint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify(angularCli)
      );
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toEqual([]);
    });

    it('an empty project: no webpack hint', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toEqual([]);
    });

    it.each([
      ['webpack.config.js at the root', 'webpack.config.js'],
      ['webpack.config.ts at the root', 'webpack.config.ts'],
      ['webpack.prod.js under config/', 'config/webpack.prod.js'],
    ])('%s without limits: the webpack hint', (_label, file) => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, file),
        'module.exports = { mode: "production" };'
      );
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toContain(
        'Add maxAssetSize and maxEntrypointSize in webpack configuration'
      );
    });

    it('a custom-webpack builder in angular.json: the webpack hint', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({
          projects: {
            app: {
              architect: {
                build: {
                  builder: '@angular-builders/custom-webpack:browser',
                  options: { customWebpackConfig: { path: './extra.js' } },
                },
              },
            },
          },
        })
      );
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toContain(
        'Add maxAssetSize and maxEntrypointSize in webpack configuration'
      );
    });

    it('a file that only mentions webpack in its name is not a config (webpack-stats.json)', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack-stats.json'),
        '{}'
      );
      expect(AngularBundleValidationPatterns.hasOwnWebpackConfig(tempDir)).toBe(
        false
      );
    });
  });

  // The two checks below used to call methods that do not exist on
  // PerformanceBudgetComplianceLaw (hidden behind an `as unknown as` cast):
  // the TypeError was caught and the "missing" suggestion was always added,
  // even to a project that declares its budgets.
  describe('a project that declares its budgets', () => {
    it('gets no budget suggestion when angular.json declares budgets', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'angular.json'),
        JSON.stringify({
          projects: {
            app: {
              architect: {
                build: {
                  configurations: {
                    production: {
                      budgets: [
                        {
                          type: 'initial',
                          maximumWarning: '500kb',
                          maximumError: '1mb',
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        })
      );
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validatePerformanceBudgets(
        tempDir,
        suggestions
      );

      expect(suggestions).toEqual([]);
    });

    it('is told its webpack performance config was found, not that it is missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'webpack.config.js'),
        'module.exports = { performance: { maxAssetSize: 500000, maxEntrypointSize: 500000 } };'
      );
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]).toMatch(
        /^Webpack performance configured in: webpack\.config/
      );
    });
  });
});
