export class CdnCachingStrategyCachingStrategiesConstants {
  static readonly SCORE_DEDUCTIONS = {
    CDN_NOT_CONFIGURED: 30,
    ASSET_OPTIMIZATION_MISSING: 25,
    BROWSER_CACHING_NOT_CONFIGURED: 20,
    SERVICE_WORKER_NOT_IMPLEMENTED: 15,
    HTTP2_NOT_OPTIMIZED: 10,
  };

  static readonly VIOLATION_MESSAGES = {
    CDN_NOT_IMPLEMENTED: 'CDN configuration not implemented',
    ASSET_NOT_OPTIMIZED: 'Static asset optimization not configured',
    CACHING_HEADERS_NOT_CONFIGURED: 'Browser caching headers not configured',
    SERVICE_WORKER_NOT_IMPLEMENTED: 'Service worker caching not implemented',
    HTTP2_NOT_OPTIMIZED: 'HTTP/2 optimization not configured',
  };

  static readonly SUGGESTION_MESSAGES = {
    CDN_CONFIG:
      'Configure CDN for static assets (Firebase Hosting, Cloudflare, etc.)',
    ASSET_OPTIMIZATION:
      'Configure asset versioning, compression, and CDN paths',
    CACHING_HEADERS: 'Configure Cache-Control, ETag, and Expires headers',
    SERVICE_WORKER: 'Implement service worker for offline caching',
    HTTP2_OPTIMIZATION:
      'Configure HTTP/2 server push and asset bundling strategy',
  };

  static readonly CDN_PROVIDERS = [
    'cloudflare',
    'cloudfront',
    'firebase',
    'cdn',
  ];

  static readonly CACHE_CONTROL_KEYWORDS = ['Cache-Control', 'Expires', 'ETag'];

  static readonly HTTP2_KEYWORDS = ['http2', 'HTTP/2', 'push', 'Link:'];

  /**
   * Content-addressed asset names, in every vocabulary that expresses them.
   *
   * The list held webpack's three strings only. Angular's builder declares the
   * same thing as `"outputHashing": "all"` in the build target, and the word
   * `contenthash` appears nowhere in an Angular project — so this finding was
   * unreachable for that whole ecosystem, not merely inconvenient.
   *
   * It is the check that matters most for the neighbouring one: an immutable
   * `Cache-Control` is only safe BECAUSE the filenames are hashed.
   */
  static readonly OPTIMIZATION_KEYWORDS = [
    'contenthash',
    'chunkhash',
    'splitChunks',
    'outputHashing',
    'assetFileNames',
    'entryFileNames',
    'chunkFileNames',
  ];

  static readonly SERVICE_WORKER_KEYWORDS = [
    'serviceWorker',
    '@angular/service-worker',
    'registerSW',
    'SwUpdate',
  ];

  static readonly ASSET_OPTIMIZATION_INDICATORS = [
    'deployUrl',
    'baseHref',
    'optimization',
    'outputHashing',
  ];
}
