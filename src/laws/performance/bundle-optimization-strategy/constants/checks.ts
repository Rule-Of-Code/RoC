/**
 * BundleOptimizationStrategyCheckConstants
 *
 * Responsibility:
 * - Define all bundle optimization patterns and checks
 * - Centralize all hardcoded rules and patterns
 */
export class BundleOptimizationStrategyCheckConstants {
  /**
   * File patterns for various bundle optimization configs
   */
  static readonly ANGULAR_JSON_FILE = 'angular.json';
  static readonly PACKAGE_JSON_FILE = 'package.json';
  static readonly WEBPACK_CONFIG_FILE = 'webpack.config.js';
  static readonly NGINX_CONFIG_FILE = 'nginx.conf';

  /**
   * Module type pattern for ES6 modules
   */
  static readonly MODULE_TYPE_PATTERN = 'module';

  /**
   * Default JSON value for safe reading
   */
  static readonly DEFAULT_JSON_VALUE = {};

  /**
   * Minimum configurations for optimal minification
   */
  static readonly MIN_CONFIGURATIONS_FOR_OPTIMAL = 2;

  /**
   * Lazy loading pattern for route-based code splitting
   */
  static readonly LAZY_LOADING_PATTERN = 'loadChildren';

  /**
   * Dynamic import pattern
   */
  static readonly DYNAMIC_IMPORT_PATTERN = 'import(';

  /**
   * Then pattern for async imports
   */
  static readonly THEN_PATTERN = '.then(';

  /**
   * Optimization patterns in configuration files
   */
  static readonly OPTIMIZATION_PATTERNS = [
    'optimization',
    'minify',
    'compress',
    'uglify',
  ];

  /**
   * Compression patterns in nginx/server config
   */
  static readonly COMPRESSION_PATTERNS = [
    'gzip on',
    'gzip_types',
    'brotli',
    'compress',
  ];

  /**
   * Minification plugin patterns
   */
  static readonly MINIFICATION_PLUGINS = [
    'TerserPlugin',
    'MiniCssExtractPlugin',
    'UglifyJsPlugin',
    'minify',
  ];

  /**
   * Critical CSS extraction patterns
   */
  static readonly CRITICAL_CSS_PACKAGES = [
    'critical',
    'penthouse',
    'critical-css',
    '@critters/critters',
  ];

  /**
   * CSS/SCSS extraction patterns in config
   */
  static readonly CSS_EXTRACTION_PATTERNS = [
    'extractCss',
    'extractStyles',
    'inlineStyles',
    'styles', // Angular optimization.styles config
    'scss',
    'sass',
  ];

  /**
   * Vendor chunk optimization patterns
   */
  static readonly VENDOR_CHUNK_PATTERNS = [
    'vendorChunk',
    'splitChunks',
    'vendor',
  ];

  /**
   * Bundle analysis script pattern
   */
  static readonly BUNDLE_ANALYSIS_SCRIPT_PATTERN = 'bundle';

  /**
   * ES Module patterns for tree shaking
   */
  static readonly ES_MODULE_PATTERNS = ['@', 'ng-', 'ngx-'];

  /**
   * Strategy messages
   */
  static readonly STRATEGY_MESSAGES = {
    ROUTE_BASED_SPLITTING: 'Route-based code splitting with lazy loading',
    BUILD_OPTIMIZATION_ENABLED: 'Build optimization enabled',
    MANUAL_DYNAMIC_IMPORTS: 'Manual dynamic imports detected',
    ANGULAR_OPTIMIZATION_ENABLED: 'Angular build optimization enabled',
    ES6_MODULES_CONFIGURED: 'ES6 modules configured',
    MINIFICATION_IN_ANGULAR: 'Minification configured in Angular',
    SERVER_COMPRESSION_CONFIGURED: 'Server compression configured',
    WEBPACK_MINIFICATION_PLUGINS: 'Webpack minification plugins detected',
    CRITICAL_CSS_TOOLS_AVAILABLE: 'Critical CSS tools available',
    CSS_EXTRACTION_CONFIGURED: 'CSS extraction configured',
    VENDOR_CHUNK_SPLITTING_CONFIGURED: 'Vendor chunk splitting configured',
    BUNDLE_ANALYSIS_SCRIPT: 'Bundle analysis script in npm scripts',
  } as const;
}
