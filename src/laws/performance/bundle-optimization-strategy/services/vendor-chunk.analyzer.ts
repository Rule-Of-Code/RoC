import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import {
  type BundlerReport,
  WebBundlerConfig,
} from '../../../../utils/react/web-bundler-config';
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
  static analyze(
    projectRoot: string,
    bundler?: BundlerReport
  ): {
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

    const report = bundler ?? WebBundlerConfig.inspect(projectRoot);
    const optimizations: string[] = [];
    for (const app of report.apps) {
      const label = WebBundlerConfig.label(projectRoot, app);
      // Next.js decides client chunking itself — its webpack config ships a
      // `framework` cache group (`next/dist/build/webpack-config.js`) and
      // Turbopack chunks on its own. There is no vendor-chunk setting to
      // require of a Next app, so this check does not apply to one.
      if (app.kind === 'next' && app.builds) {
        optimizations.push(`${label}: not applicable — Next.js owns client chunking`);
      }
      // Vite splits vendor code only when chunk groups are configured.
      if (app.kind === 'vite' && app.builds && app.manualChunks) {
        optimizations.push(`${label}: manual chunk groups configured`);
      }
    }
    if (optimizations.length > 0) {
      return { isOptimized: true, optimizations };
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
