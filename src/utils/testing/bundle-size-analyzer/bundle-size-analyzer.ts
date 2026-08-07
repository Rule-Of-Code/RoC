import { BundleSizeValidationPatterns } from './bundle-size-validation-patterns';

/**
 * Bundle Size Testing Analyzer
 * Specialized utility for analyzing bundle size testing implementation
 */
export class BundleSizeAnalyzer {
  /**
   * Check for bundle size testing implementation
   */
  static checkBundleSizeTests(projectRoot: string): {
    hasBundleSizeTests: boolean;
    tools: string[];
    configFiles: string[];
    testFiles: string[];
    metrics: string[];
  } {
    // Use BundleSizeValidationPatterns for complete analysis
    return BundleSizeValidationPatterns.validateAllBundleSizeTestingPatterns(
      projectRoot
    );
  }
}
