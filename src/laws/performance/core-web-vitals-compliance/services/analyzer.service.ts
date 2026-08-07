import type { RuleOfCodeConfig } from '../../../../types';
import type {
  CoreWebVitalsAnalysisResult,
} from '../constants/types';
import { BrowserCachingAnalyzerService } from './browser-caching.analyzer';
import { BundleOptimizationAnalyzerService } from './bundle-optimization.analyzer';
import { ImageOptimizationAnalyzerService } from './image-optimization.analyzer';
import { LighthouseAnalyzerService } from './lighthouse.analyzer';
import { PerformanceBudgetsAnalyzerService } from './performance-budgets.analyzer';
import { ResourceHintsAnalyzerService } from './resource-hints.analyzer';

export class CoreWebVitalsAnalyzerService {
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): CoreWebVitalsAnalysisResult {
    return {
      lighthouse: LighthouseAnalyzerService.analyze(projectRoot),
      performanceBudgets:
        PerformanceBudgetsAnalyzerService.analyze(projectRoot),
      bundleOptimization: BundleOptimizationAnalyzerService.analyze(
        projectRoot,
        config
      ),
      browserCaching: BrowserCachingAnalyzerService.analyze(projectRoot),
      imageOptimization: ImageOptimizationAnalyzerService.analyze(
        projectRoot,
        config
      ),
      resourceHints: ResourceHintsAnalyzerService.analyze(projectRoot),
    };
  }
}
