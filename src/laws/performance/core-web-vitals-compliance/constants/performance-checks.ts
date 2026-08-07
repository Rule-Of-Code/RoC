export class CoreWebVitalsPerformanceChecksConstants {
  static readonly SCORE_DEDUCTIONS = {
    LIGHTHOUSE_NOT_CONFIGURED: 25,
    PERFORMANCE_BUDGETS_MISSING: 20,
    BUNDLE_NOT_OPTIMIZED: 20,
    CACHING_STRATEGY_MISSING: 15,
    IMAGE_NOT_OPTIMIZED: 10,
    RESOURCE_HINTS_MISSING: 10,
  };

  static readonly VIOLATION_MESSAGES = {
    LIGHTHOUSE_NOT_FOUND: 'Lighthouse performance configuration not found',
    BUDGETS_NOT_CONFIGURED: 'Performance budgets not configured',
    BUNDLE_NOT_OPTIMIZED: 'Bundle optimization not properly configured',
    CACHING_NOT_IMPLEMENTED: 'Browser caching strategy not implemented',
    IMAGES_NOT_OPTIMIZED:
      'Image optimization not configured (WebP, lazy loading)',
    HINTS_NOT_CONFIGURED: 'Missing critical resource hints (preload/prefetch)',
  };

  static readonly SUGGESTION_MESSAGES = {
    LIGHTHOUSE: 'Add lighthouse.config.js with Core Web Vitals thresholds',
    BUDGETS:
      'Configure performance budgets in angular.json or webpack.config.js',
    BUNDLE_OPTIMIZATION:
      'Enable code splitting, lazy loading, and tree shaking',
    CACHING: 'Implement service worker and HTTP caching headers',
    IMAGE_OPTIMIZATION: 'Implement next-gen image formats and lazy loading',
    RESOURCE_HINTS: 'Add preload/prefetch hints for critical resources',
  };

  static readonly OPTIMIZATION_KEYWORDS = {
    LAZY_LOADING: 'loadChildren',
    DYNAMIC_IMPORT: 'import(',
    BUILD_OPTIMIZATION: 'optimization',
    PERFORMANCE_BUDGETS: 'budgets',
    MAX_ASSET_SIZE: 'maxAssetSize',
  };

  static readonly CACHING_KEYWORDS = {
    CACHE_CONTROL: 'Cache-Control',
    EXPIRES: 'expires',
    SERVICE_WORKER: 'serviceWorker',
    PWA: 'manifest',
  };

  static readonly RESOURCE_HINT_KEYWORDS = {
    PRELOAD: 'rel="preload"',
    PREFETCH: 'rel="prefetch"',
    DNS_PREFETCH: 'rel="dns-prefetch"',
    PRECONNECT: 'rel="preconnect"',
  };

  static readonly IMAGE_KEYWORDS = {
    LOADING_LAZY: 'loading="lazy"',
    INTERSECTION_OBSERVER: 'IntersectionObserver',
    WEBP: '.webp',
  };
}
