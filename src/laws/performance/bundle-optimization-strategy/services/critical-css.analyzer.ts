import {
  type BundlerReport,
  WebBundlerConfig,
} from '../../../../utils/react/web-bundler-config';
import { BundleOptimizationStrategyCheckConstants } from '../constants';
import { BundleOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * CriticalCSSAnalyzerService
 *
 * Responsibility:
 * - Analyze critical CSS extraction configuration
 * - Verify critical CSS tools and inline configuration
 */
export class CriticalCSSAnalyzerService {
  /**
   * Analyze critical CSS extraction
   */
  static analyze(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
    isConfigured: boolean;
    strategies: string[];
  } {
    const result = BundleOptimizationBaseAnalyzer.analyzeWithDependencyFallback(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.CSS_EXTRACTION_PATTERNS,
      BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
        .CSS_EXTRACTION_CONFIGURED,
      BundleOptimizationStrategyCheckConstants.CRITICAL_CSS_PACKAGES,
      BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
        .CRITICAL_CSS_TOOLS_AVAILABLE
    );

    // Next.js: `experimental.optimizeCss` inlines critical CSS through
    // critters (`next/dist/server/post-process.js`). Off by default, so a Next
    // app declares it — there is no inference from the framework here.
    const report = bundler ?? WebBundlerConfig.inspect(projectRoot);
    for (const app of report.apps) {
      if (app.kind === 'next' && app.optimizeCss) {
        result.messages.push(
          `${WebBundlerConfig.label(projectRoot, app)}: experimental.optimizeCss`
        );
      }
    }

    return {
      isConfigured: result.messages.length > 0,
      strategies: result.messages,
    };
  }
}
