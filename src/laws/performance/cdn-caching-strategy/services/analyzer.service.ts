import type { RuleOfCodeConfig } from '../../../../config/types';
import type { CdnCachingAnalysisResult } from '../constants/types';
import { AssetOptimizationAnalyzerService } from './asset-optimization.analyzer';
import { CachingHeadersAnalyzerService } from './caching-headers.analyzer';
import { CdnAnalyzerService } from './cdn.analyzer';
import { Http2OptimizationAnalyzerService } from './http2-optimization.analyzer';
import { ServiceWorkerAnalyzerService } from './service-worker.analyzer';

export class CdnCachingStrategyAnalyzerService {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<CdnCachingAnalysisResult> {
    return {
      cdnConfigured: CdnAnalyzerService.analyze(projectRoot),
      assetOptimization: AssetOptimizationAnalyzerService.analyze(projectRoot),
      cachingHeaders: CachingHeadersAnalyzerService.analyze(projectRoot),
      serviceWorker: await ServiceWorkerAnalyzerService.analyze(
        projectRoot,
        config
      ),
      http2Optimization: Http2OptimizationAnalyzerService.analyze(projectRoot),
    };
  }
}
