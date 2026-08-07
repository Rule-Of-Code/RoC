/**
 * @fileoverview Tests for angular-bundle-configuration.ts
 * @description Tests for Angular bundle optimization configuration utilities
 */

import { AngularBundleConfiguration } from '../../src/utils/angular/angular-bundle/angular-bundle-configuration';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-bundle/angular-bundle-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-bundle-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('VALIDATION_MESSAGES', () => {
    describe('AOT_DISABLED', () => {
      it('should return violation message with project name', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.AOT_DISABLED('my-app');

        expect(result.violationMessage).toContain('my-app');
        expect(result.violationMessage).toContain('aot');
        expect(result.suggestionMessage).toContain('aot');
      });

      it('should handle empty project name', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.AOT_DISABLED('');

        expect(result.violationMessage).toBeDefined();
        expect(result.suggestionMessage).toBeDefined();
      });
    });

    describe('BUILD_OPTIMIZER_DISABLED', () => {
      it('should return suggestion message with project name', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.BUILD_OPTIMIZER_DISABLED(
            'my-app'
          );

        expect(result.suggestionMessage).toContain('my-app');
        expect(result.suggestionMessage).toContain('buildOptimizer');
      });
    });

    describe('LICENSE_EXTRACTION_DISABLED', () => {
      it('should return suggestion for license extraction', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.LICENSE_EXTRACTION_DISABLED(
            'my-app'
          );

        expect(result.suggestionMessage).toContain('my-app');
        expect(result.suggestionMessage).toContain('extractLicenses');
      });
    });

    describe('SOURCE_MAPS_ENABLED', () => {
      it('should return suggestion for disabling source maps', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.SOURCE_MAPS_ENABLED(
            'my-app'
          );

        expect(result.suggestionMessage).toContain('my-app');
        expect(result.suggestionMessage).toContain('sourceMap');
      });
    });

    describe('BUNDLE_ANALYZER_MISSING', () => {
      it('should return suggestion for adding bundle analyzer', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.BUNDLE_ANALYZER_MISSING();

        expect(result.suggestionMessage).toContain('webpack-bundle-analyzer');
      });
    });

    describe('PERFORMANCE_BUDGETS_MISSING', () => {
      it('should return suggestion for performance budgets', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.PERFORMANCE_BUDGETS_MISSING();

        expect(result.suggestionMessage).toContain('performance budgets');
        expect(result.suggestionMessage).toContain('angular.json');
      });
    });

    describe('WEBPACK_CONFIG_MISSING', () => {
      it('should return suggestion for webpack configuration', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_CONFIG_MISSING();

        expect(result.suggestionMessage).toContain('webpack');
        expect(result.suggestionMessage).toContain('optimization');
      });
    });

    describe('WEBPACK_PERFORMANCE_LIMITS_MISSING', () => {
      it('should return suggestion for webpack performance limits', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_LIMITS_MISSING();

        expect(result.suggestionMessage).toContain('maxAssetSize');
        expect(result.suggestionMessage).toContain('maxEntrypointSize');
      });
    });

    describe('ANGULAR_CONFIG_REVIEW', () => {
      it('should return suggestion for reviewing angular config', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.ANGULAR_CONFIG_REVIEW();

        expect(result.suggestionMessage).toContain('angular.json');
        expect(result.suggestionMessage).toContain('Review');
      });
    });

    describe('SOURCE_CODE_REVIEW', () => {
      it('should return suggestion for source code review', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.SOURCE_CODE_REVIEW();

        expect(result.suggestionMessage).toContain('source code');
        expect(result.suggestionMessage).toContain('performance');
      });
    });

    describe('WEBPACK_PERFORMANCE_CONFIGURED', () => {
      it('should return message with config file list', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_CONFIGURED(
            ['webpack.config.js', 'webpack.prod.js']
          );

        expect(result.suggestionMessage).toContain('webpack.config.js');
        expect(result.suggestionMessage).toContain('webpack.prod.js');
      });

      it('should handle single config file', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_CONFIGURED(
            ['webpack.config.js']
          );

        expect(result.suggestionMessage).toContain('webpack.config.js');
      });

      it('should handle empty config array', () => {
        const result =
          AngularBundleConfiguration.VALIDATION_MESSAGES.WEBPACK_PERFORMANCE_CONFIGURED(
            []
          );

        expect(result.suggestionMessage).toBeDefined();
      });
    });
  });

  describe('PRODUCTION_CONFIG_REQUIREMENTS', () => {
    it('should have AOT requirement with correct settings', () => {
      const aotReq =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT;

      expect(aotReq.key).toBe('aot');
      expect(aotReq.expectedValue).toBe(true);
      expect(aotReq.required).toBe(true);
    });

    it('should have BUILD_OPTIMIZER requirement', () => {
      const buildOptReq =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .BUILD_OPTIMIZER;

      expect(buildOptReq.key).toBe('buildOptimizer');
      expect(buildOptReq.expectedValue).toBe(true);
      expect(buildOptReq.required).toBe(false);
    });

    it('should have EXTRACT_LICENSES requirement', () => {
      const extractReq =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .EXTRACT_LICENSES;

      expect(extractReq.key).toBe('extractLicenses');
      expect(extractReq.expectedValue).toBe(true);
      expect(extractReq.required).toBe(false);
    });

    it('should have SOURCE_MAP requirement', () => {
      const sourceMapReq =
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.SOURCE_MAP;

      expect(sourceMapReq.key).toBe('sourceMap');
      expect(sourceMapReq.expectedValue).toBe(false);
      expect(sourceMapReq.required).toBe(false);
    });
  });

  describe('getProductionConfig', () => {
    it('should extract production config from angular.json structure', () => {
      const angularConfig = {
        projects: {
          'my-app': {
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
      expect(result[0]?.projectName).toBe('my-app');
      expect(result[0]?.config).toEqual({
        aot: true,
        buildOptimizer: true,
      });
    });

    it('should handle multiple projects', () => {
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
      expect(result.map(r => r.projectName)).toContain('app1');
      expect(result.map(r => r.projectName)).toContain('app2');
    });

    it('should skip projects without production config', () => {
      const angularConfig = {
        projects: {
          'my-app': {
            architect: {
              build: {
                configurations: {
                  development: { aot: false },
                },
              },
            },
          },
        },
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(0);
    });

    it('should handle missing projects key', () => {
      const angularConfig = {};

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(0);
    });

    it('should handle empty projects object', () => {
      const angularConfig = {
        projects: {},
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(0);
    });

    it('should handle projects without architect', () => {
      const angularConfig = {
        projects: {
          'my-app': {},
        },
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(0);
    });

    it('should handle projects without build target', () => {
      const angularConfig = {
        projects: {
          'my-app': {
            architect: {
              serve: {},
            },
          },
        },
      };

      const result =
        AngularBundleConfiguration.getProductionConfig(angularConfig);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateProductionSetting', () => {
    it('should add violation when AOT is disabled and required', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleConfiguration.validateProductionSetting(
        'my-app',
        { aot: false },
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT,
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0]).toContain('my-app');
    });

    it('should add suggestion when build optimizer is disabled', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleConfiguration.validateProductionSetting(
        'my-app',
        { buildOptimizer: false },
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS
          .BUILD_OPTIMIZER,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0); // Not required
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should not add anything when value matches expected', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleConfiguration.validateProductionSetting(
        'my-app',
        { aot: true },
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });

    it('should add suggestion when source map is enabled in production', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleConfiguration.validateProductionSetting(
        'my-app',
        { sourceMap: true },
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.SOURCE_MAP,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0); // Not required
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should handle missing key in production config', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularBundleConfiguration.validateProductionSetting(
        'my-app',
        {},
        AngularBundleConfiguration.PRODUCTION_CONFIG_REQUIREMENTS.AOT,
        violations,
        suggestions
      );

      expect(violations.length).toBeGreaterThan(0);
    });
  });
});
