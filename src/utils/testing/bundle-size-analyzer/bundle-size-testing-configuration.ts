/**
 * Bundle Size Testing Configuration
 * Centralized configuration for bundle size testing patterns and validation
 */
export class BundleSizeTestingConfiguration {
  static readonly BUNDLE_ANALYSIS_TOOLS = [
    'webpack-bundle-analyzer',
    'bundle-analyzer',
    'size-limit',
    'bundlesize',
    'bundlewatch',
    '@next/bundle-analyzer',
    'rollup-plugin-analyzer',
    'vite-bundle-analyzer',
  ];

  static readonly BUNDLE_CONFIG_PATTERNS = [
    '.bundlewatch.config.js',
    '.bundlesizerc',
    '.bundlesize.json',
    'size-limit.config.js',
    'bundle-analyzer.config.js',
  ];

  static readonly TEST_DIRECTORIES = ['src', 'tests', 'test', '__tests__'];

  static readonly BUNDLE_REPORTS = [
    'bundle-report.html',
    'stats.json',
    'webpack-bundle-analyzer.html',
  ];

  static readonly BUNDLE_TEST_PATTERNS = [
    /bundle.*size.*\.(test|spec)\.(js|ts)$/i,
    /size.*test.*\.(js|ts)$/i,
    /.*\.bundle\.size\.(test|spec)\.(js|ts)$/i,
    /performance.*bundle.*\.(test|spec)\.(js|ts)$/i,
  ];

  static readonly CI_CONFIG_FILES = [
    '.github/workflows/ci.yml',
    '.github/workflows/build.yml',
    '.github/workflows/performance.yml',
    '.gitlab-ci.yml',
    'bitbucket-pipelines.yml',
    'azure-pipelines.yml',
  ];

  static readonly PERFORMANCE_KEYWORDS = {
    BUNDLE_SIZE: ['bundle', 'size'],
    LIGHTHOUSE: ['lighthouse', 'performance'],
    BUNDLE_ENFORCEMENT: ['bundlesize', 'bundlewatch'],
  };

  static readonly VALIDATION_MESSAGES = {
    NO_BUNDLE_TOOLS: 'No bundle analysis tools found in package.json',
    NO_CONFIG_FILES: 'No bundle size configuration files found',
    NO_TEST_FILES: 'No bundle size test files found',
    NO_CI_METRICS: 'No bundle size metrics tracking in CI configuration',
    MISSING_BUNDLE_TESTING: 'Bundle size testing implementation not found',
    NO_OPTIMIZATION_CONFIG: 'No bundle optimization configuration found',
    NO_OPTIMIZATION_CONFIG_SUGGESTION:
      'Configure bundle optimization in angular.json or webpack.config.js',
    HEAVY_LIBS_NO_LAZY_LOADING:
      'Heavy libraries detected ({libs}) but no lazy loading found',
    HEAVY_LIBS_SUGGESTION:
      'Implement lazy loading for heavy libraries using loadChildren',
    NO_BUNDLE_REPORTS: 'No bundle analysis reports found',
    NO_BUNDLE_REPORTS_SUGGESTION:
      'Generate bundle analysis reports using webpack-bundle-analyzer',
  } as const;

  static readonly FILE_EXTENSIONS = {
    CONFIG: ['.js', '.json'],
    TEST: ['.ts', '.js'],
    CI: ['.yml', '.yaml'],
  };

  static readonly PERFORMANCE_METRICS_TYPES = [
    'Bundle size tracking in CI',
    'Performance monitoring in CI',
    'Bundle size enforcement in CI',
  ];

  static readonly OPTIMIZATION_KEYWORDS = [
    'optimization',
    'minimize',
    'treeshake',
    'splitChunks',
    'bundleAnalyzer',
  ];

  static readonly LAZY_LOADING_KEYWORD = 'loadChildren';

  static readonly ROUTING_FILE_PATTERN = 'routing';
}
