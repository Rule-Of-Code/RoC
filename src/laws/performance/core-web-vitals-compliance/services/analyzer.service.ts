import type { RuleOfCodeConfig } from '../../../../types';
import { ReactPerformanceSource } from '../../../../utils/react/react-performance-source';
import { WebBundlerConfig } from '../../../../utils/react/web-bundler-config';
import type { CoreWebVitalsAnalysisResult } from '../constants/types';
import { BrowserCachingAnalyzerService } from './browser-caching.analyzer';
import { BundleOptimizationAnalyzerService } from './bundle-optimization.analyzer';
import { ImageOptimizationAnalyzerService } from './image-optimization.analyzer';
import { LighthouseAnalyzerService } from './lighthouse.analyzer';
import { PerformanceBudgetsAnalyzerService } from './performance-budgets.analyzer';
import { ResourceHintsAnalyzerService } from './resource-hints.analyzer';
import { VueDynamicImports } from '../../../../utils/vue/vue-dynamic-imports';

/**
 * Runs the six Core Web Vitals Compliance checks on one project. The React/Next
 * source scan and the next.config / vite.config reading are done once here and
 * shared by the bundle, image and resource-hint checks; what either could not
 * read is passed on as `unread`.
 */
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
    // Vue source, by the React rule (#12, (c)); empty unless vue/nuxt without react/next.
    const vue = VueDynamicImports.scan({ projectRoot, config, lawId });
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
        bundler,
        vue
      ),
      browserCaching: BrowserCachingAnalyzerService.analyze(projectRoot),
      imageOptimization: ImageOptimizationAnalyzerService.analyze(
        projectRoot,
        config,
        react,
        bundler
      ),
      resourceHints: ResourceHintsAnalyzerService.analyze(projectRoot, react),
      unread: [...react.unread, ...bundler.unread, ...vue.unread],
    };
  }
}
