import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from '../constants/caching-strategies';
import { CdnCachingStrategyFileDiscoveryConstants as FileDiscovery } from '../constants/file-discovery';
import type { AssetOptimizationResult } from '../constants/types';
import { NxWorkspace } from '../../../../utils/nx-workspace';
import { PerformanceAnalyzerBase } from './performance-analyzer-base';

export class AssetOptimizationAnalyzerService extends PerformanceAnalyzerBase {
  static analyze(projectRoot: string): AssetOptimizationResult {
    return {
      optimized:
        this.hasAngularAssetOptimization(projectRoot) ||
        this.hasWebpackAssetOptimization(projectRoot),
    };
  }

  /**
   * Content-addressed asset names, read across the whole workspace.
   *
   * Two things were wrong with reading `project.architect.build` directly.
   * An Nx workspace declares its build under `targets`, not `architect`, and
   * has no root `angular.json` for this to iterate. And it required BOTH
   * `optimization` and `outputHashing`: the esbuild builder optimises
   * production by default and projects do not write the first, so a workspace
   * that hashes every asset it ships answered false on the key it never needed.
   *
   * `"outputHashing": "none"` is an explicit refusal and is not accepted.
   */
  private static hasAngularAssetOptimization(projectRoot: string): boolean {
    const buildConfig = NxWorkspace.getBuildConfigContent(projectRoot);
    if (!buildConfig) return false;

    return /"outputHashing"\s*:\s*"(?!none")[^"]+"/.test(buildConfig);
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
