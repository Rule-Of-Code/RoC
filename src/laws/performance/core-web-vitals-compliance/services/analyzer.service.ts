import type { RuleOfCodeConfig } from '../../../../types';
import { ReactPerformanceSource } from '../../../../utils/react/react-performance-source';
import { WebBundlerConfig } from '../../../../utils/react/web-bundler-config';
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
    config: RuleOfCodeConfig,
    lawId?: string
  ): CoreWebVitalsAnalysisResult {
    // Read once and shared: what a React/Next codebase writes in its source,
    // and what its next.config / vite.config says. Both are empty on a project
    // that declares neither (the scan does not run there).
    const react = ReactPerformanceSource.scan({ projectRoot, config, lawId });
    const bundler = WebBundlerConfig.inspect(projectRoot);
    return {
      lighthouse: LighthouseAnalyzerService.analyze(projectRoot),
      performanceBudgets: PerformanceBudgetsAnalyzerService.analyze(
        projectRoot,
        config
      ),
      bundleOptimization: BundleOptimizationAnalyzerService.analyze(
        projectRoot,
        config,
        react,
        bundler
      ),
      browserCaching: BrowserCachingAnalyzerService.analyze(projectRoot),
      imageOptimization: ImageOptimizationAnalyzerService.analyze(
        projectRoot,
        config,
        react,
        bundler
      ),
      resourceHints: ResourceHintsAnalyzerService.analyze(projectRoot, react),
      unread: [...react.unread, ...bundler.unread],
    };
  }
}
