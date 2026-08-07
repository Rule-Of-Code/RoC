import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { AssetOptimizationResult } from '../constants/types';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

export class AssetOptimizationAnalyzerService extends PerformanceAnalyzerBase {
  static analyze(projectRoot: string): AssetOptimizationResult {
    return {
      optimized:
        this.hasAngularAssetOptimization(projectRoot) ||
        this.hasWebpackAssetOptimization(projectRoot),
    };
  }

  private static hasAngularAssetOptimization(projectRoot: string): boolean {
    return this.iterateAngularProjects(projectRoot, project => {
      const buildConfig = project.architect?.build?.configurations?.production;
      return !!(
        buildConfig &&
        buildConfig.optimization &&
        buildConfig.outputHashing
      );
    });
  }

  private static hasWebpackAssetOptimization(projectRoot: string): boolean {
    const webpackConfigs = FileDiscovery.getWebpackConfigPaths(projectRoot);

    for (const webpackConfig of webpackConfigs) {
      const content = this.readWebpackConfigFile(webpackConfig);
      if (content && this.hasOptimizationKeywords(content)) {
        return true;
      }
    }

    return false;
  }

  private static hasOptimizationKeywords(content: string): boolean {
    return CachingStrategies.OPTIMIZATION_KEYWORDS.some(keyword =>
      content.includes(keyword)
    );
  }
}
