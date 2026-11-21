import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { CachingHeadersResult, HeaderConfig } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

/**
 * Answers whether browser caching headers are configured: a firebase.json
 * hosting `headers` entry declaring Cache-Control, ETag or Expires, or one of
 * those names in a root .htaccess, nginx.conf, server.js or apache.conf.
 */
export class CachingHeadersAnalyzerService extends PerformanceAnalyzerBase {
  static analyze(projectRoot: string): CachingHeadersResult {
    return {
      configured:
        this.hasFirebaseCachingHeaders(projectRoot) ||
        this.hasServerCachingHeaders(projectRoot),
    };
  }

  private static hasFirebaseCachingHeaders(projectRoot: string): boolean {
    const hosting = this.getFirebaseHostingConfig(projectRoot);
    if (!hosting?.headers || !Array.isArray(hosting.headers)) {
      return false;
    }

    try {
      // Firebase's `headers` entries carry an ARRAY of {key, value} pairs — the
      // only shape `firebase deploy` accepts. Indexing an array by a header
      // name is `undefined` for every array, including a correct one, so no
      // valid firebase.json could ever satisfy this check.
      const { headers } = hosting;
      const CACHING_HEADERS = ['Cache-Control', 'ETag', 'Expires'];
      return headers.some((header: HeaderConfig) =>
        this.declaresAnyHeader(header.headers, CACHING_HEADERS)
      );
    } catch {
      // Ignore JSON parsing errors
    }

    return false;
  }

  private static hasServerCachingHeaders(projectRoot: string): boolean {
    const serverConfigs = FileDiscovery.getServerConfigPaths(projectRoot);

    for (const serverConfig of serverConfigs) {
      const content = this.readServerConfigFile(serverConfig);
      if (content && this.hasCacheControlKeywords(content)) {
        return true;
      }
    }

    return false;
  }

  private static hasCacheControlKeywords(content: string): boolean {
    return CachingStrategies.CACHE_CONTROL_KEYWORDS.some(keyword =>
      content.includes(keyword)
    );
  }
}
