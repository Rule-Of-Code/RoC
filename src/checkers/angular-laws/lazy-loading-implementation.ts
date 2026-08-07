/**
 * Lazy Loading Implementation Law Implementation
 * Enforces proper lazy loading patterns for Angular modules and routes
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularBundleOptimizationAnalyzer } from '../../utils/angular/angular-bundle';
import { AngularLazyLoadingPatternsAnalyzer } from '../../utils/angular/angular-lazy-loading';
import { AngularRoutingConfigurationAnalyzer } from '../../utils/angular/angular-routing';

export class LazyLoadingImplementationLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for routing configuration using specialized utility
    const routingAnalysis =
      AngularRoutingConfigurationAnalyzer.checkRoutingConfiguration(
        context.projectRoot,
        context.config
      );
    violations.push(...routingAnalysis.violations);
    suggestions.push(...routingAnalysis.suggestions);

    // Check for lazy loading patterns using specialized utility
    const lazyLoadingAnalysis =
      AngularLazyLoadingPatternsAnalyzer.checkLazyLoadingPatterns(
        context.projectRoot,
        context.config
      );
    violations.push(...lazyLoadingAnalysis.violations);
    suggestions.push(...lazyLoadingAnalysis.suggestions);

    // Check for bundle optimization using specialized utility
    const bundleAnalysis =
      AngularBundleOptimizationAnalyzer.checkBundleOptimization(
        context.projectRoot,
        context.config
      );
    violations.push(...bundleAnalysis.violations);
    suggestions.push(...bundleAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Lazy Loading Implementation',
      message:
        violations.length === 0
          ? 'Lazy Loading Implementation compliance verified'
          : `${violations.length} Lazy Loading Implementation violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
