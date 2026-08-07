/**
 * Bundle Optimization Strategy Policy Law
 *
 * Ensures proper bundle optimization strategies are implemented:
 * - Code splitting with lazy loading
 * - Tree shaking configuration
 * - Minification and compression
 * - Critical CSS extraction
 * - Vendor chunk optimization
 * - Bundle analysis tools setup
 *
 * Responsibilities:
 * - Coordinate analysis of bundle optimization strategies
 * - Aggregate results from specialized analyzer services
 * - Calculate final score and compile recommendations
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import type { ViolationConfig } from './bundle-optimization-strategy/constants/types';
import { BundleOptimizationStrategyAnalyzerService } from './bundle-optimization-strategy/services';

export class BundleOptimizationStrategyLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const score = this.runAllAnalyses(
      context.projectRoot,
      context.config,
      violations,
      suggestions
    );
    return this.buildResult(violations, suggestions, score, context);
  }

  /**
   * Run all bundle optimization analyses
   */
  private static runAllAnalyses(
    projectRoot: string,
    config: LawCheckContext['config'],
    violations: string[],
    suggestions: string[]
  ): number {
    let score = 100;
    const analyzer = BundleOptimizationStrategyAnalyzerService;

    // Run each analysis and add violations if not passing
    score = this.checkAnalysis(
      analyzer.analyzeCodeSplitting(projectRoot, config).isConfigured,
      violations,
      suggestions,
      score,
      {
        violation: 'CODE_SPLITTING_NOT_CONFIGURED',
        suggestion: 'CODE_SPLITTING_SUGGESTION',
        penalty: 'CODE_SPLITTING',
      }
    );
    score = this.checkAnalysis(
      analyzer.analyzeTreeShaking(projectRoot).isEnabled,
      violations,
      suggestions,
      score,
      {
        violation: 'TREE_SHAKING_NOT_CONFIGURED',
        suggestion: 'TREE_SHAKING_SUGGESTION',
        penalty: 'TREE_SHAKING',
      }
    );
    score = this.checkAnalysis(
      analyzer.analyzeMinification(projectRoot).isOptimal,
      violations,
      suggestions,
      score,
      {
        violation: 'MINIFICATION_NOT_CONFIGURED',
        suggestion: 'MINIFICATION_SUGGESTION',
        penalty: 'MINIFICATION',
      }
    );
    score = this.checkAnalysis(
      analyzer.analyzeCriticalCSS(projectRoot).isConfigured,
      violations,
      suggestions,
      score,
      {
        violation: 'CRITICAL_CSS_NOT_CONFIGURED',
        suggestion: 'CRITICAL_CSS_SUGGESTION',
        penalty: 'CRITICAL_CSS',
      }
    );
    score = this.checkAnalysis(
      analyzer.analyzeVendorChunk(projectRoot).isOptimized,
      violations,
      suggestions,
      score,
      {
        violation: 'VENDOR_CHUNK_NOT_CONFIGURED',
        suggestion: 'VENDOR_CHUNK_SUGGESTION',
        penalty: 'VENDOR_CHUNK',
      }
    );
    score = this.checkAnalysis(
      analyzer.analyzeBundleAnalysis(projectRoot).isSetup,
      violations,
      suggestions,
      score,
      {
        violation: 'BUNDLE_ANALYSIS_NOT_CONFIGURED',
        suggestion: 'BUNDLE_ANALYSIS_SUGGESTION',
        penalty: 'BUNDLE_ANALYSIS',
      }
    );

    return score;
  }

  /**
   * Check analysis result and add violation if needed
   */
  private static checkAnalysis(
    isPassing: boolean,
    violations: string[],
    suggestions: string[],
    score: number,
    violationConfig: ViolationConfig
  ): number {
    if (!isPassing) {
      return BundleOptimizationStrategyAnalyzerService.addViolation(
        violations,
        suggestions,
        score,
        violationConfig
      );
    }
    return score;
  }

  /**
   * Build the final result
   */
  private static buildResult(
    violations: string[],
    suggestions: string[],
    score: number,
    context: LawCheckContext
  ): LawResult {
    const passed = violations.length === 0;
    return {
      passed,
      score: Math.max(0, score),
      message: passed
        ? 'Bundle optimization strategy properly implemented'
        : `Bundle optimization issues found: ${violations.join(', ')}`,
      details: violations,
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }
}
