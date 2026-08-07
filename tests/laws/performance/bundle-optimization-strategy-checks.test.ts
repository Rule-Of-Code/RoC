/**
 * Tests for BundleOptimizationStrategyCheckConstants
 *
 * Tests the bundle optimization patterns and configuration checks.
 */
import { BundleOptimizationStrategyCheckConstants } from '../../../src/laws/performance/bundle-optimization-strategy/constants/checks';

describe('BundleOptimizationStrategyCheckConstants', () => {
  describe('File patterns', () => {
    it('should have ANGULAR_JSON_FILE', () => {
      expect(BundleOptimizationStrategyCheckConstants.ANGULAR_JSON_FILE).toBe(
        'angular.json'
      );
    });

    it('should have PACKAGE_JSON_FILE', () => {
      expect(BundleOptimizationStrategyCheckConstants.PACKAGE_JSON_FILE).toBe(
        'package.json'
      );
    });

    it('should have WEBPACK_CONFIG_FILE', () => {
      expect(BundleOptimizationStrategyCheckConstants.WEBPACK_CONFIG_FILE).toBe(
        'webpack.config.js'
      );
    });

    it('should have NGINX_CONFIG_FILE', () => {
      expect(BundleOptimizationStrategyCheckConstants.NGINX_CONFIG_FILE).toBe(
        'nginx.conf'
      );
    });
  });

  describe('Pattern constants', () => {
    it('should have MODULE_TYPE_PATTERN', () => {
      expect(BundleOptimizationStrategyCheckConstants.MODULE_TYPE_PATTERN).toBe(
        'module'
      );
    });

    it('should have LAZY_LOADING_PATTERN', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.LAZY_LOADING_PATTERN
      ).toBe('loadChildren');
    });

    it('should have DYNAMIC_IMPORT_PATTERN', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.DYNAMIC_IMPORT_PATTERN
      ).toBe('import(');
    });

    it('should have THEN_PATTERN', () => {
      expect(BundleOptimizationStrategyCheckConstants.THEN_PATTERN).toBe(
        '.then('
      );
    });
  });

  describe('Configuration constants', () => {
    it('should have DEFAULT_JSON_VALUE as empty object', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.DEFAULT_JSON_VALUE
      ).toEqual({});
    });

    it('should have MIN_CONFIGURATIONS_FOR_OPTIMAL', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.MIN_CONFIGURATIONS_FOR_OPTIMAL
      ).toBe(2);
    });
  });

  describe('OPTIMIZATION_PATTERNS', () => {
    it('should include optimization', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.OPTIMIZATION_PATTERNS
      ).toContain('optimization');
    });

    it('should include minify', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.OPTIMIZATION_PATTERNS
      ).toContain('minify');
    });

    it('should include compress', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.OPTIMIZATION_PATTERNS
      ).toContain('compress');
    });

    it('should include uglify', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.OPTIMIZATION_PATTERNS
      ).toContain('uglify');
    });
  });

  describe('COMPRESSION_PATTERNS', () => {
    it('should include gzip on', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.COMPRESSION_PATTERNS
      ).toContain('gzip on');
    });

    it('should include gzip_types', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.COMPRESSION_PATTERNS
      ).toContain('gzip_types');
    });

    it('should include brotli', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.COMPRESSION_PATTERNS
      ).toContain('brotli');
    });
  });

  describe('MINIFICATION_PLUGINS', () => {
    it('should include TerserPlugin', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.MINIFICATION_PLUGINS
      ).toContain('TerserPlugin');
    });

    it('should include MiniCssExtractPlugin', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.MINIFICATION_PLUGINS
      ).toContain('MiniCssExtractPlugin');
    });

    it('should include UglifyJsPlugin', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.MINIFICATION_PLUGINS
      ).toContain('UglifyJsPlugin');
    });
  });

  describe('CRITICAL_CSS_PACKAGES', () => {
    it('should include critical', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CRITICAL_CSS_PACKAGES
      ).toContain('critical');
    });

    it('should include penthouse', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CRITICAL_CSS_PACKAGES
      ).toContain('penthouse');
    });

    it('should include @critters/critters', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CRITICAL_CSS_PACKAGES
      ).toContain('@critters/critters');
    });
  });

  describe('CSS_EXTRACTION_PATTERNS', () => {
    it('should include extractCss', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CSS_EXTRACTION_PATTERNS
      ).toContain('extractCss');
    });

    it('should include extractStyles', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CSS_EXTRACTION_PATTERNS
      ).toContain('extractStyles');
    });

    it('should include inlineStyles', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.CSS_EXTRACTION_PATTERNS
      ).toContain('inlineStyles');
    });
  });

  describe('VENDOR_CHUNK_PATTERNS', () => {
    it('should include vendorChunk', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.VENDOR_CHUNK_PATTERNS
      ).toContain('vendorChunk');
    });

    it('should include splitChunks', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.VENDOR_CHUNK_PATTERNS
      ).toContain('splitChunks');
    });

    it('should include vendor', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.VENDOR_CHUNK_PATTERNS
      ).toContain('vendor');
    });
  });

  describe('Other patterns', () => {
    it('should have BUNDLE_ANALYSIS_SCRIPT_PATTERN', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.BUNDLE_ANALYSIS_SCRIPT_PATTERN
      ).toBe('bundle');
    });

    it('should have ES_MODULE_PATTERNS', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.ES_MODULE_PATTERNS
      ).toContain('@');
      expect(
        BundleOptimizationStrategyCheckConstants.ES_MODULE_PATTERNS
      ).toContain('ng-');
      expect(
        BundleOptimizationStrategyCheckConstants.ES_MODULE_PATTERNS
      ).toContain('ngx-');
    });
  });

  describe('STRATEGY_MESSAGES', () => {
    it('should have ROUTE_BASED_SPLITTING message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .ROUTE_BASED_SPLITTING
      ).toContain('Route-based code splitting');
    });

    it('should have BUILD_OPTIMIZATION_ENABLED message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .BUILD_OPTIMIZATION_ENABLED
      ).toContain('Build optimization');
    });

    it('should have ANGULAR_OPTIMIZATION_ENABLED message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .ANGULAR_OPTIMIZATION_ENABLED
      ).toContain('Angular');
    });

    it('should have SERVER_COMPRESSION_CONFIGURED message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .SERVER_COMPRESSION_CONFIGURED
      ).toContain('compression');
    });

    it('should have VENDOR_CHUNK_SPLITTING_CONFIGURED message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .VENDOR_CHUNK_SPLITTING_CONFIGURED
      ).toContain('Vendor chunk');
    });

    it('should have BUNDLE_ANALYSIS_SCRIPT message', () => {
      expect(
        BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
          .BUNDLE_ANALYSIS_SCRIPT
      ).toContain('Bundle analysis');
    });
  });
});
