import { AngularBundleConfig } from '../../../../utils/angular-bundle-config';
import { BundleOptimizationStrategyCheckConstants } from '../constants';
import { BundleOptimizationBaseAnalyzer } from './base.analyzer';

/**
 * MinificationAnalyzerService
 *
 * Responsibility:
 * - Analyze minification and compression configuration
 * - Verify webpack and server compression settings
 */
export class MinificationAnalyzerService {
  /**
   * Analyze minification and compression
   */
  static analyze(projectRoot: string): {
    isOptimal: boolean;
    configurations: string[];
  } {
    // The esbuild `application` builder minifies (and tree-shakes) production
    // builds by default — there is no `optimization`/`minify` knob to grep for,
    // so a correct esbuild project read as un-minified.
    if (AngularBundleConfig.usesEsbuildBuilder(projectRoot)) {
      return { isOptimal: true, configurations: ['esbuild minification'] };
    }

    const result = BundleOptimizationBaseAnalyzer.analyzeAngularConfiguration(
      projectRoot,
      BundleOptimizationStrategyCheckConstants.OPTIMIZATION_PATTERNS,
      BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
        .MINIFICATION_IN_ANGULAR
    );

    return {
      isOptimal: result.messages.length > 0,
      configurations: result.messages,
    };
  }
}
