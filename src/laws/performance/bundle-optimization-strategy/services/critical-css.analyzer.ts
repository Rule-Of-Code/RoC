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
  static analyze(projectRoot: string): {
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

    return {
      isConfigured: result.messages.length > 0,
      strategies: result.messages,
    };
  }
}
