import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Caching Strategy Constants
 *
 * Single Responsibility: Caching strategy and service worker configuration validation
 */
export class CachingStrategyConstants {
  static readonly SERVICE_WORKER_PATHS = [
    'src/sw.js',
    'src/service-worker.js',
    'public/sw.js',
  ];

  static readonly SERVICE_WORKER_FILE_PATTERNS: string[] = [
    'sw.js',
    'service-worker.js',
  ];

  static readonly SERVICE_WORKER_CONFIG_PATTERNS: string[] = [
    'serviceWorker',
    '@angular/service-worker',
  ];

  static readonly SERVICE_WORKER_MARKERS = [
    'serviceWorker',
    '@angular/service-worker',
    'cache.put',
    'cache.match',
  ];

  /**
   * Check if file is a service worker file
   */
  static isServiceWorkerFile(filePath: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      filePath,
      this.SERVICE_WORKER_FILE_PATTERNS
    );
  }

  /**
   * Check if configuration has service worker
   */
  static hasServiceWorkerConfig(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.SERVICE_WORKER_CONFIG_PATTERNS
    );
  }
}
