/**
 * Core Web Vitals Compliance Law
 * Ensures application meets Google's Core Web Vitals standards
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CoreWebVitalsPerformanceChecksConstants as Checks } from './core-web-vitals-compliance/constants/performance-checks';
import { CoreWebVitalsAnalyzerService } from './core-web-vitals-compliance/services/analyzer.service';

export class CoreWebVitalsComplianceLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const analysis = CoreWebVitalsAnalyzerService.analyze(
      context.projectRoot,
      context.config
    );

    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // Lighthouse configuration check
    if (!analysis.lighthouse.hasConfig) {
      violations.push(Checks.VIOLATION_MESSAGES.LIGHTHOUSE_NOT_FOUND);
      suggestions.push(Checks.SUGGESTION_MESSAGES.LIGHTHOUSE);
      score -= Checks.SCORE_DEDUCTIONS.LIGHTHOUSE_NOT_CONFIGURED;
    }

    // Performance budgets check
    if (!analysis.performanceBudgets.hasBudgets) {
      violations.push(Checks.VIOLATION_MESSAGES.BUDGETS_NOT_CONFIGURED);
      suggestions.push(Checks.SUGGESTION_MESSAGES.BUDGETS);
      score -= Checks.SCORE_DEDUCTIONS.PERFORMANCE_BUDGETS_MISSING;
    }

    // Bundle optimization check
    if (!analysis.bundleOptimization.isOptimized) {
      violations.push(Checks.VIOLATION_MESSAGES.BUNDLE_NOT_OPTIMIZED);
      suggestions.push(Checks.SUGGESTION_MESSAGES.BUNDLE_OPTIMIZATION);
      score -= Checks.SCORE_DEDUCTIONS.BUNDLE_NOT_OPTIMIZED;
    }

    // Browser caching check
    if (!analysis.browserCaching.hasStrategy) {
      violations.push(Checks.VIOLATION_MESSAGES.CACHING_NOT_IMPLEMENTED);
      suggestions.push(Checks.SUGGESTION_MESSAGES.CACHING);
      score -= Checks.SCORE_DEDUCTIONS.CACHING_STRATEGY_MISSING;
    }

    // Image optimization check
    if (!analysis.imageOptimization.isOptimized) {
      violations.push(Checks.VIOLATION_MESSAGES.IMAGES_NOT_OPTIMIZED);
      suggestions.push(Checks.SUGGESTION_MESSAGES.IMAGE_OPTIMIZATION);
      score -= Checks.SCORE_DEDUCTIONS.IMAGE_NOT_OPTIMIZED;
    }

    // Resource hints check
    if (!analysis.resourceHints.hasHints) {
      violations.push(Checks.VIOLATION_MESSAGES.HINTS_NOT_CONFIGURED);
      suggestions.push(Checks.SUGGESTION_MESSAGES.RESOURCE_HINTS);
      score -= Checks.SCORE_DEDUCTIONS.RESOURCE_HINTS_MISSING;
    }

    return Promise.resolve({
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Core Web Vitals compliance properly configured'
          : `Core Web Vitals compliance issues found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    });
  }
}
