import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import { BundleOptimizationStrategyCheckConstants } from '../constants';
import { BundleOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * VendorChunkAnalyzerService
 *
 * Responsibility:
 * - Analyze vendor chunk optimization configuration
 * - Verify vendor chunk splitting strategy
 */
export class VendorChunkAnalyzerService {
  /**
   * Analyze vendor chunk optimization
   */
  static analyze(projectRoot: string): {
    isOptimized: boolean;
    optimizations: string[];
  } {
    // `vendorChunk` / `splitChunks` / `namedChunks` are webpack/browser-builder
    // knobs that DO NOT EXIST on the esbuild `application` builder — it splits
    // vendor code automatically. Requiring them false-failed every esbuild
    // project; on that builder, vendor chunking is already optimal.
    if (AngularBundleConfig.usesEsbuildBuilder(projectRoot)) {
      return { isOptimized: true, optimizations: ['esbuild auto-chunking'] };
    }

    const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.VENDOR_CHUNK_PATTERNS,
      BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
        .VENDOR_CHUNK_SPLITTING_CONFIGURED
    );

    return {
      isOptimized: result.messages.length > 0,
      optimizations: result.messages,
    };
  }
}
