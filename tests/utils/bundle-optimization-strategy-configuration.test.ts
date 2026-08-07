/**
 * @fileoverview Tests for bundle-optimization-strategy-configuration.ts
 * @description Tests for bundle optimization strategy configuration constants
 */

import { BundleOptimizationStrategyConfiguration } from '../../src/utils/testing/bundle-optimization-strategy-configuration';

describe('utils/testing/bundle-optimization-strategy-configuration', () => {
  describe('File paths and patterns', () => {
    it('should have ANGULAR_JSON_FILE constant', () => {
      expect(BundleOptimizationStrategyConfiguration.ANGULAR_JSON_FILE).toBe(
        'angular.json'
      );
    });

    it('should have PACKAGE_JSON_FILE constant', () => {
      expect(BundleOptimizationStrategyConfiguration.PACKAGE_JSON_FILE).toBe(
        'package.json'
      );
    });

    it('should have NGINX_CONFIG_FILE constant', () => {
      expect(BundleOptimizationStrategyConfiguration.NGINX_CONFIG_FILE).toBe(
        'nginx.conf'
      );
    });

    it('should have WEBPACK_CONFIG_FILE constant', () => {
      expect(BundleOptimizationStrategyConfiguration.WEBPACK_CONFIG_FILE).toBe(
        'webpack.config.js'
      );
    });
  });

  describe('Routing patterns', () => {
    it('should have ROUTING_FILE_PATTERN constant', () => {
      expect(BundleOptimizationStrategyConfiguration.ROUTING_FILE_PATTERN).toBe(
        'app-routing'
      );
    });

    it('should have LAZY_LOADING_PATTERN constant', () => {
      expect(BundleOptimizationStrategyConfiguration.LAZY_LOADING_PATTERN).toBe(
        'loadChildren'
      );
    });

    it('should have DYNAMIC_IMPORT_PATTERN constant', () => {
      expect(
        BundleOptimizationStrategyConfiguration.DYNAMIC_IMPORT_PATTERN
      ).toBe('import(');
    });

    it('should have THEN_PATTERN constant', () => {
      expect(BundleOptimizationStrategyConfiguration.THEN_PATTERN).toBe(
        '.then'
      );
    });
  });

  describe('Critical CSS dependencies', () => {
    it('should have CRITICAL_CSS_PACKAGES array', () => {
      const packages =
        BundleOptimizationStrategyConfiguration.CRITICAL_CSS_PACKAGES;
      expect(packages).toContain('critical');
      expect(packages).toContain('critters');
      expect(packages).toContain('@angular-devkit/build-angular');
      expect(packages).toHaveLength(3);
    });
  });

  describe('Webpack patterns', () => {
    it('should have MINIFICATION_PLUGINS array', () => {
      const plugins =
        BundleOptimizationStrategyConfiguration.MINIFICATION_PLUGINS;
      expect(plugins).toContain('TerserPlugin');
      expect(plugins).toContain('UglifyJs');
      expect(plugins).toHaveLength(2);
    });

    it('should have COMPRESSION_PATTERNS array', () => {
      const patterns =
        BundleOptimizationStrategyConfiguration.COMPRESSION_PATTERNS;
      expect(patterns).toContain('gzip');
      expect(patterns).toContain('brotli');
      expect(patterns).toHaveLength(2);
    });
  });

  describe('Angular configuration patterns', () => {
    it('should have OPTIMIZATION_PATTERNS array', () => {
      const patterns =
        BundleOptimizationStrategyConfiguration.OPTIMIZATION_PATTERNS;
      expect(patterns).toContain('optimization');
      expect(patterns).toContain('minification');
      expect(patterns).toHaveLength(2);
    });

    it('should have CSS_EXTRACTION_PATTERNS array', () => {
      const patterns =
        BundleOptimizationStrategyConfiguration.CSS_EXTRACTION_PATTERNS;
      expect(patterns).toContain('extractCss');
      expect(patterns).toContain('inlineStyleLanguage');
      expect(patterns).toHaveLength(2);
    });

    it('should have VENDOR_CHUNK_PATTERNS array', () => {
      const patterns =
        BundleOptimizationStrategyConfiguration.VENDOR_CHUNK_PATTERNS;
      expect(patterns).toContain('vendorChunk');
      expect(patterns).toContain('commonChunk');
      expect(patterns).toHaveLength(2);
    });
  });

  describe('Source and package patterns', () => {
    it('should have SOURCE_DIRECTORY constant', () => {
      expect(BundleOptimizationStrategyConfiguration.SOURCE_DIRECTORY).toBe(
        'src'
      );
    });

    it('should have MODULE_TYPE_PATTERN constant', () => {
      expect(BundleOptimizationStrategyConfiguration.MODULE_TYPE_PATTERN).toBe(
        'module'
      );
    });

    it('should have ES_MODULE_PATTERNS array', () => {
      const patterns =
        BundleOptimizationStrategyConfiguration.ES_MODULE_PATTERNS;
      expect(patterns).toContain('es6');
      expect(patterns).toContain('esm');
      expect(patterns).toHaveLength(2);
    });

    it('should have BUNDLE_ANALYSIS_SCRIPT_PATTERN constant', () => {
      expect(
        BundleOptimizationStrategyConfiguration.BUNDLE_ANALYSIS_SCRIPT_PATTERN
      ).toBe('analyze');
    });
  });

  describe('Default values', () => {
    it('should have DEFAULT_JSON_VALUE as empty object', () => {
      expect(
        BundleOptimizationStrategyConfiguration.DEFAULT_JSON_VALUE
      ).toEqual({});
    });
  });

  describe('VIOLATION_MESSAGES', () => {
    const messages = BundleOptimizationStrategyConfiguration.VIOLATION_MESSAGES;

    it('should have CODE_SPLITTING_NOT_CONFIGURED message', () => {
      expect(messages.CODE_SPLITTING_NOT_CONFIGURED).toBe(
        'Code splitting not properly configured'
      );
    });

    it('should have TREE_SHAKING_NOT_CONFIGURED message', () => {
      expect(messages.TREE_SHAKING_NOT_CONFIGURED).toBe(
        'Tree shaking optimization not configured'
      );
    });

    it('should have MINIFICATION_NOT_CONFIGURED message', () => {
      expect(messages.MINIFICATION_NOT_CONFIGURED).toBe(
        'Minification and compression not optimally configured'
      );
    });

    it('should have CRITICAL_CSS_NOT_CONFIGURED message', () => {
      expect(messages.CRITICAL_CSS_NOT_CONFIGURED).toBe(
        'Critical CSS extraction not configured'
      );
    });

    it('should have VENDOR_CHUNK_NOT_CONFIGURED message', () => {
      expect(messages.VENDOR_CHUNK_NOT_CONFIGURED).toBe(
        'Vendor chunk optimization not configured'
      );
    });

    it('should have BUNDLE_ANALYSIS_NOT_CONFIGURED message', () => {
      expect(messages.BUNDLE_ANALYSIS_NOT_CONFIGURED).toBe(
        'Bundle analysis not configured for performance monitoring'
      );
    });
  });

  describe('SUGGESTION_MESSAGES', () => {
    const messages =
      BundleOptimizationStrategyConfiguration.SUGGESTION_MESSAGES;

    it('should have CODE_SPLITTING_SUGGESTION message', () => {
      expect(messages.CODE_SPLITTING_SUGGESTION).toBe(
        'Configure dynamic imports and route-based code splitting'
      );
    });

    it('should have TREE_SHAKING_SUGGESTION message', () => {
      expect(messages.TREE_SHAKING_SUGGESTION).toBe(
        'Enable tree shaking in build configuration'
      );
    });

    it('should have MINIFICATION_SUGGESTION message', () => {
      expect(messages.MINIFICATION_SUGGESTION).toBe(
        'Enable Terser minification and gzip/brotli compression'
      );
    });

    it('should have CRITICAL_CSS_SUGGESTION message', () => {
      expect(messages.CRITICAL_CSS_SUGGESTION).toBe(
        'Configure critical CSS extraction for above-the-fold content'
      );
    });

    it('should have VENDOR_CHUNK_SUGGESTION message', () => {
      expect(messages.VENDOR_CHUNK_SUGGESTION).toBe(
        'Configure vendor chunk splitting for better caching'
      );
    });

    it('should have BUNDLE_ANALYSIS_SUGGESTION message', () => {
      expect(messages.BUNDLE_ANALYSIS_SUGGESTION).toBe(
        'Add webpack-bundle-analyzer or equivalent tool'
      );
    });
  });

  describe('STRATEGY_MESSAGES', () => {
    const messages = BundleOptimizationStrategyConfiguration.STRATEGY_MESSAGES;

    it('should have ROUTE_BASED_SPLITTING message', () => {
      expect(messages.ROUTE_BASED_SPLITTING).toBe('Route-based code splitting');
    });

    it('should have BUILD_OPTIMIZATION_ENABLED message', () => {
      expect(messages.BUILD_OPTIMIZATION_ENABLED).toBe(
        'Build optimization enabled'
      );
    });

    it('should have MANUAL_DYNAMIC_IMPORTS message', () => {
      expect(messages.MANUAL_DYNAMIC_IMPORTS).toBe(
        'Manual dynamic imports detected'
      );
    });

    it('should have ANGULAR_OPTIMIZATION_ENABLED message', () => {
      expect(messages.ANGULAR_OPTIMIZATION_ENABLED).toBe(
        'Angular optimization enabled'
      );
    });

    it('should have ES6_MODULES_CONFIGURED message', () => {
      expect(messages.ES6_MODULES_CONFIGURED).toBe('ES6 modules configured');
    });

    it('should have MINIFICATION_IN_ANGULAR message', () => {
      expect(messages.MINIFICATION_IN_ANGULAR).toBe(
        'Minification configured in Angular'
      );
    });

    it('should have SERVER_COMPRESSION_CONFIGURED message', () => {
      expect(messages.SERVER_COMPRESSION_CONFIGURED).toBe(
        'Server compression configured'
      );
    });

    it('should have WEBPACK_MINIFICATION_PLUGINS message', () => {
      expect(messages.WEBPACK_MINIFICATION_PLUGINS).toBe(
        'Webpack minification plugins'
      );
    });

    it('should have CRITICAL_CSS_TOOLS_AVAILABLE message', () => {
      expect(messages.CRITICAL_CSS_TOOLS_AVAILABLE).toBe(
        'Critical CSS extraction tools available'
      );
    });

    it('should have CSS_EXTRACTION_CONFIGURED message', () => {
      expect(messages.CSS_EXTRACTION_CONFIGURED).toBe(
        'CSS extraction configured'
      );
    });

    it('should have VENDOR_CHUNK_SPLITTING_CONFIGURED message', () => {
      expect(messages.VENDOR_CHUNK_SPLITTING_CONFIGURED).toBe(
        'Vendor chunk splitting configured'
      );
    });

    it('should have BUNDLE_ANALYSIS_SCRIPT message', () => {
      expect(messages.BUNDLE_ANALYSIS_SCRIPT).toBe('Bundle analysis script');
    });
  });

  describe('SCORE_PENALTIES', () => {
    const penalties = BundleOptimizationStrategyConfiguration.SCORE_PENALTIES;

    it('should have CODE_SPLITTING penalty of 25', () => {
      expect(penalties.CODE_SPLITTING).toBe(25);
    });

    it('should have TREE_SHAKING penalty of 20', () => {
      expect(penalties.TREE_SHAKING).toBe(20);
    });

    it('should have MINIFICATION penalty of 20', () => {
      expect(penalties.MINIFICATION).toBe(20);
    });

    it('should have CRITICAL_CSS penalty of 15', () => {
      expect(penalties.CRITICAL_CSS).toBe(15);
    });

    it('should have VENDOR_CHUNK penalty of 10', () => {
      expect(penalties.VENDOR_CHUNK).toBe(10);
    });

    it('should have BUNDLE_ANALYSIS penalty of 10', () => {
      expect(penalties.BUNDLE_ANALYSIS).toBe(10);
    });

    it('should have total penalties of 100', () => {
      const total =
        penalties.CODE_SPLITTING +
        penalties.TREE_SHAKING +
        penalties.MINIFICATION +
        penalties.CRITICAL_CSS +
        penalties.VENDOR_CHUNK +
        penalties.BUNDLE_ANALYSIS;
      expect(total).toBe(100);
    });
  });

  describe('Configuration requirements', () => {
    it('should have MIN_CONFIGURATIONS_FOR_OPTIMAL as 2', () => {
      expect(
        BundleOptimizationStrategyConfiguration.MIN_CONFIGURATIONS_FOR_OPTIMAL
      ).toBe(2);
    });
  });
});
