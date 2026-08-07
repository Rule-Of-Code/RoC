/**
 * Bundle Optimization Strategy Configuration
 * Centralized configuration for bundle optimization patterns and validation messages
 * Follows RULE 1: Single Source of Truth
 */
export class BundleOptimizationStrategyConfiguration {
  // File paths and patterns
  static readonly ANGULAR_JSON_FILE = 'angular.json';
  static readonly PACKAGE_JSON_FILE = 'package.json';
  static readonly NGINX_CONFIG_FILE = 'nginx.conf';
  static readonly WEBPACK_CONFIG_FILE = 'webpack.config.js';

  // Routing patterns
  static readonly ROUTING_FILE_PATTERN = 'app-routing';
  static readonly LAZY_LOADING_PATTERN = 'loadChildren';
  static readonly DYNAMIC_IMPORT_PATTERN = 'import(';
  static readonly THEN_PATTERN = '.then';

  // Critical CSS dependencies
  static readonly CRITICAL_CSS_PACKAGES = [
    'critical',
    'critters',
    '@angular-devkit/build-angular',
  ];

  // Webpack minification patterns
  static readonly MINIFICATION_PLUGINS = ['TerserPlugin', 'UglifyJs'];

  // Server compression patterns
  static readonly COMPRESSION_PATTERNS = ['gzip', 'brotli'];

  // Angular configuration patterns
  static readonly OPTIMIZATION_PATTERNS = ['optimization', 'minification'];

  static readonly CSS_EXTRACTION_PATTERNS = [
    'extractCss',
    'inlineStyleLanguage',
  ];

  static readonly VENDOR_CHUNK_PATTERNS = ['vendorChunk', 'commonChunk'];

  // Source directory
  static readonly SOURCE_DIRECTORY = 'src';

  // Package.json patterns
  static readonly MODULE_TYPE_PATTERN = 'module';
  static readonly ES_MODULE_PATTERNS = ['es6', 'esm'];
  static readonly BUNDLE_ANALYSIS_SCRIPT_PATTERN = 'analyze';

  // Default values for JSON parsing
  static readonly DEFAULT_JSON_VALUE = {};

  // Validation messages for RULE 1: Single Source of Truth
  static readonly VIOLATION_MESSAGES = {
    CODE_SPLITTING_NOT_CONFIGURED: 'Code splitting not properly configured',
    TREE_SHAKING_NOT_CONFIGURED: 'Tree shaking optimization not configured',
    MINIFICATION_NOT_CONFIGURED:
      'Minification and compression not optimally configured',
    CRITICAL_CSS_NOT_CONFIGURED: 'Critical CSS extraction not configured',
    VENDOR_CHUNK_NOT_CONFIGURED: 'Vendor chunk optimization not configured',
    BUNDLE_ANALYSIS_NOT_CONFIGURED:
      'Bundle analysis not configured for performance monitoring',
  } as const;

  static readonly SUGGESTION_MESSAGES = {
    CODE_SPLITTING_SUGGESTION:
      'Configure dynamic imports and route-based code splitting',
    TREE_SHAKING_SUGGESTION: 'Enable tree shaking in build configuration',
    MINIFICATION_SUGGESTION:
      'Enable Terser minification and gzip/brotli compression',
    CRITICAL_CSS_SUGGESTION:
      'Configure critical CSS extraction for above-the-fold content',
    VENDOR_CHUNK_SUGGESTION:
      'Configure vendor chunk splitting for better caching',
    BUNDLE_ANALYSIS_SUGGESTION:
      'Add webpack-bundle-analyzer or equivalent tool',
  } as const;

  // Success messages for strategy findings
  static readonly STRATEGY_MESSAGES = {
    ROUTE_BASED_SPLITTING: 'Route-based code splitting',
    BUILD_OPTIMIZATION_ENABLED: 'Build optimization enabled',
    MANUAL_DYNAMIC_IMPORTS: 'Manual dynamic imports detected',
    ANGULAR_OPTIMIZATION_ENABLED: 'Angular optimization enabled',
    ES6_MODULES_CONFIGURED: 'ES6 modules configured',
    MINIFICATION_IN_ANGULAR: 'Minification configured in Angular',
    SERVER_COMPRESSION_CONFIGURED: 'Server compression configured',
    WEBPACK_MINIFICATION_PLUGINS: 'Webpack minification plugins',
    CRITICAL_CSS_TOOLS_AVAILABLE: 'Critical CSS extraction tools available',
    CSS_EXTRACTION_CONFIGURED: 'CSS extraction configured',
    VENDOR_CHUNK_SPLITTING_CONFIGURED: 'Vendor chunk splitting configured',
    BUNDLE_ANALYSIS_SCRIPT: 'Bundle analysis script',
  } as const;

  // Score penalties for violations (RULE 2: Optimize internals)
  static readonly SCORE_PENALTIES = {
    CODE_SPLITTING: 25,
    TREE_SHAKING: 20,
    MINIFICATION: 20,
    CRITICAL_CSS: 15,
    VENDOR_CHUNK: 10,
    BUNDLE_ANALYSIS: 10,
  } as const;

  // Configuration requirements
  static readonly MIN_CONFIGURATIONS_FOR_OPTIMAL = 2;
}
