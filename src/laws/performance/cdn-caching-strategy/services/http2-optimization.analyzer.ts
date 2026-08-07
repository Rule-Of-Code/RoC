import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { Http2OptimizationResult } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

export class Http2OptimizationAnalyzerService extends PerformanceAnalyzerBase {
  static analyze(projectRoot: string): Http2OptimizationResult {
    return {
      optimized:
        this.hasFirebaseHttp2Push(projectRoot) ||
        this.hasServerHttp2Config(projectRoot) ||
        this.hasBundleHttp2Optimization(projectRoot),
    };
  }

  private static hasFirebaseHttp2Push(projectRoot: string): boolean {
    const hosting = this.getFirebaseHostingConfig(projectRoot);
    if (!hosting) {
      return false;
    }

    try {
      if (hosting.headers) {
        const { headers } = hosting;
        return this.hasHttp2PushHeaders(headers);
      }
    } catch {
      // Ignore JSON parsing errors
    }

    return false;
  }

  private static hasHttp2PushHeaders(headers: unknown): boolean {
    if (!Array.isArray(headers)) {
      return false;
    }
    return headers.some((header: unknown) => {
      if (typeof header === 'object' && header !== null) {
        const headerObj = header as Record<string, unknown>;
        const headerFields = headerObj.headers;
        if (
          typeof headerFields === 'object' &&
          headerFields !== null &&
          'Link' in headerFields
        ) {
          return true;
        }
      }
      return false;
    });
  }

  private static hasServerHttp2Config(projectRoot: string): boolean {
    const serverConfigs = FileDiscovery.getServerConfigPaths(projectRoot);

    for (const serverConfig of serverConfigs) {
      const content = this.readServerConfigFile(serverConfig);
      if (content && this.hasHttp2Keywords(content)) {
        return true;
      }
    }

    return false;
  }

  private static hasBundleHttp2Optimization(projectRoot: string): boolean {
    return (
      this.checkAngularNamedChunks(projectRoot) ||
      this.checkWebpackSplitChunks(projectRoot)
    );
  }

  private static checkAngularNamedChunks(projectRoot: string): boolean {
    return this.iterateAngularProjects(projectRoot, project => {
      const buildConfig = project.architect?.build?.configurations?.production;
      return !!(buildConfig && buildConfig.namedChunks !== false);
    });
  }

  private static checkWebpackSplitChunks(projectRoot: string): boolean {
    const webpackConfigs = FileDiscovery.getWebpackConfigPaths(projectRoot);
    for (const webpackConfig of webpackConfigs) {
      const content = this.readWebpackConfigFile(webpackConfig);
      if (
        content &&
        content.includes('splitChunks') &&
        content.includes('maxSize')
      ) {
        return true;
      }
    }
    return false;
  }

  private static hasHttp2Keywords(content: string): boolean {
    return CachingStrategies.HTTP2_KEYWORDS.some(keyword =>
      content.includes(keyword)
    );
  }
}
