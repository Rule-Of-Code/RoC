/**
 * @fileoverview Tests for angular-bundle-configuration.ts
 * @description Tests for Angular bundle configuration utility
 */

import { AngularBundleConfiguration } from '../../../src/utils/angular/angular-bundle/angular-bundle-configuration';

describe('utils/angular/angular-bundle/angular-bundle-configuration', () => {
  describe('VALIDATION_MESSAGES', () => {
    it('should return AOT_DISABLED message with project name', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.AOT_DISABLED('my-app');

      expect(message.violationMessage).toContain('my-app');
      expect(message.violationMessage).toContain('aot');
      expect(message.suggestionMessage).toContain('aot');
    });

    it('should return BUILD_OPTIMIZER_DISABLED message with project name', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.BUILD_OPTIMIZER_DISABLED(
          'test-project'
        );

      expect(message.suggestionMessage).toContain('test-project');
      expect(message.suggestionMessage).toContain('buildOptimizer');
    });

    it('should return LICENSE_EXTRACTION_DISABLED message with project name', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.LICENSE_EXTRACTION_DISABLED(
          'license-app'
        );

      expect(message.suggestionMessage).toContain('license-app');
      expect(message.suggestionMessage).toContain('extractLicenses');
    });

    it('should return SOURCE_MAPS_ENABLED message with project name', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.SOURCE_MAPS_ENABLED(
          'source-app'
        );

      expect(message.suggestionMessage).toContain('source-app');
      expect(message.suggestionMessage).toContain('sourceMap');
    });

    it('should return BUNDLE_ANALYZER_MISSING message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.BUNDLE_ANALYZER_MISSING();

      expect(message.suggestionMessage).toContain('webpack-bundle-analyzer');
    });

    it('should return PERFORMANCE_BUDGETS_MISSING message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.PERFORMANCE_BUDGETS_MISSING();

      expect(message.suggestionMessage).toContain('performance budgets');
    });

    it('should return WEBPACK_CONFIG_MISSING message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_CONFIG_MISSING();

      expect(message.suggestionMessage).toContain('webpack');
    });

    it('should return WEBPACK_PERFORMANCE_LIMITS_MISSING message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_LIMITS_MISSING();

      expect(message.suggestionMessage).toContain('maxAssetSize');
      expect(message.suggestionMessage).toContain('maxEntrypointSize');
    });

    it('should return ANGULAR_CONFIG_REVIEW message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.ANGULAR_CONFIG_REVIEW();

      expect(message.suggestionMessage).toContain('angular.json');
    });

    it('should return SOURCE_CODE_REVIEW message', () => {
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.SOURCE_CODE_REVIEW();

      expect(message.suggestionMessage).toContain('source code');
    });

    it('should return WEBPACK_PERFORMANCE_CONFIGURED message with configs', () => {
      const configs = ['webpack.config.js', 'webpack.prod.js'];
      const message =
        AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_CONFIGURED(
          configs
        );

      expect(message.suggestionMessage).toContain('webpack.config.js');
      expect(message.suggestionMessage).toContain('webpack.prod.js');
    });
  });

  describe('PRODUCTION_CONFIG_REQUIREMENTS', () => {
    it('should have AOT requirement with expected configuration', () => {
      const aotRequirement =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT;

      expect(aotRequirement.key).toBe('aot');
      expect(aotRequirement.expectedValue).toBe(true);
      expect(aotRequirement.required).toBe(true);
    });

    it('should have BUILD_OPTIMIZER requirement with expected configuration', () => {
      const buildOptimizerRequirement =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .BUILD_OPTIMIZER;

      expect(buildOptimizerRequirement.key).toBe('buildOptimizer');
      expect(buildOptimizerRequirement.expectedValue).toBe(true);
      expect(buildOptimizerRequirement.required).toBe(false);
    });

    it('should have EXTRACT_LICENSES requirement with expected configuration', () => {
      const extractLicensesRequirement =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .EXTRACT_LICENSES;

      expect(extractLicensesRequirement.key).toBe('extractLicenses');
      expect(extractLicensesRequirement.expectedValue).toBe(true);
      expect(extractLicensesRequirement.required).toBe(false);
    });

    it('should have SOURCE_MAP requirement with expected configuration', () => {
      const sourceMapRequirement =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.SOURCE_MAP;

      expect(sourceMapRequirement.key).toBe('sourceMap');
      expect(sourceMapRequirement.expectedValue).toBe(false);
      expect(sourceMapRequirement.required).toBe(false);
    });
  });

  describe('getProductionConfig', () => {
    it('should extract production configuration from angular.json structure', () => {
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

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(1);
      expect(result[0]?.projectName).toBe('test-app');
      expect(result[0]?.config).toEqual({
        aot: true,
        buildOptimizer: true,
      });
    });

    it('should extract multiple project configurations', () => {
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

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(2);
      expect(result[0]?.projectName).toBe('app1');
      expect(result[1]?.projectName).toBe('app2');
    });

    it('should return empty array for missing projects', () => {
      const angularConfig = {};

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toEqual([]);
    });

    it('should skip projects without production config', () => {
      const angularConfig = {
        projects: {
          app1: {
            architect: {
              build: {
                configurations: {},
              },
            },
          },
        },
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toEqual([]);
    });

    it('should skip projects without build config', () => {
      const angularConfig = {
        projects: {
          app1: {
            architect: {},
          },
        },
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toEqual([]);
    });
  });

  describe('validateProductionSetting', () => {
    it('should add violation for required setting with wrong value', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const prodConfig = { aot: false };

      AngularBundleConfiguration.validateProductionSetting(
        'test-app',
        prodConfig,
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT,
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('aot');
    });

    it('should add suggestion for optional setting with wrong value', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const prodConfig = { buildOptimizer: false };

      AngularBundleConfiguration.validateProductionSetting(
        'test-app',
        prodConfig,
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .BUILD_OPTIMIZER,
        violations,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('buildOptimizer');
    });

    it('should not add violations or suggestions for correct settings', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const prodConfig = { aot: true };

      AngularBundleConfiguration.validateProductionSetting(
        'test-app',
        prodConfig,
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });

    it('should validate sourceMap setting correctly', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const prodConfig = { sourceMap: true }; // Wrong - should be false

      AngularBundleConfiguration.validateProductionSetting(
        'test-app',
        prodConfig,
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.SOURCE_MAP,
        violations,
        suggestions
      );

      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
