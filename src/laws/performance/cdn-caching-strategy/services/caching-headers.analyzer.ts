import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { CachingHeadersResult, HeaderConfig } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

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
      const { headers } = hosting;
      return headers.some(
        (header: HeaderConfig) =>
          header.headers?.['Cache-Control'] ??
          header.headers?.['ETag'] ??
          header.headers?.['Expires']
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
