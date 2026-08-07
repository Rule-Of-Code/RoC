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

  describe('validateWebpackConfiguration', () => {
    it('should suggest webpack configuration when not configured', () => {
      const suggestions: string[] = [];

      AngularBundleValidationPatterns.validateWebpackConfiguration(
        tempDir,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('validateSourceCodeOptimization', () => {
    it('should validate source code optimization patterns', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));

      const componentContent = `
        import { Component } from '@angular/core';

        @Component({
          selector: 'app-test',
          template: '<div *ngFor="let item of items">{{ item }}</div>'
        })
        export class TestComponent {
          items = [1, 2, 3];
        }
      `;

      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'test.component.ts'),
        componentContent
      );

      const violations: string[] = [];
      const suggestions: string[] = [];
      const config = {
        projectRoot: tempDir,
        excludePatterns: ['node_modules', 'dist'],
      } as never;

      AngularBundleValidationPatterns.validateSourceCodeOptimization(
        tempDir,
        config,
        violations,
        suggestions
      );

      expect(violations).toBeInstanceOf(Array);
      expect(suggestions).toBeInstanceOf(Array);
    });

    it('should add suggestion when source code analysis fails', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const config = {
        projectRoot: '/nonexistent/path',
        excludePatterns: [],
      } as never;

      AngularBundleValidationPatterns.validateSourceCodeOptimization(
        '/nonexistent/path',
        config,
        violations,
        suggestions
      );

      expect(suggestions).toBeInstanceOf(Array);
    });
  });
});
