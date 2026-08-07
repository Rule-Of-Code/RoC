import type { RuleOfCodeConfig } from '../../../../config/types';
import { BundleOptimizationAnalyzer } from './bundle-optimization.analyzer';
import { CachingStrategyAnalyzer } from './caching-strategy.analyzer';
import { CoreWebVitalsAnalyzer } from './core-web-vitals.analyzer';
import { ImageOptimizationAnalyzer } from './image-optimization.analyzer';
import { LighthouseAnalyzer } from './lighthouse.analyzer';
import { PerformanceBudgetsAnalyzer } from './performance-budgets.analyzer';

/**
 * Performance Analyzer Service
 *
 * Single Responsibility: Orchestrating all performance analyzers
 */
export class PerformanceAnalyzerService {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig
  ): Promise<{
    violations: string[];
    scoreImpact: number;
  }> {
    const violations: string[] = [];
    let scoreImpact = 0;

    // Lighthouse analysis
    const lighthouseViolations = LighthouseAnalyzer.analyze(projectRoot);
    violations.push(...lighthouseViolations);
    if (lighthouseViolations.length > 0) scoreImpact += 25;

    // Performance budgets analysis
    const budgetsViolations = PerformanceBudgetsAnalyzer.analyze(projectRoot);
    violations.push(...budgetsViolations);
    if (budgetsViolations.length > 0) scoreImpact += 20;

    // Core Web Vitals analysis
    const vitalsViolations = await CoreWebVitalsAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...vitalsViolations);
    if (vitalsViolations.length > 0) scoreImpact += 20;

    // Bundle optimization analysis
    const bundleViolations = BundleOptimizationAnalyzer.analyze(projectRoot);
    violations.push(...bundleViolations);
    if (bundleViolations.length > 0) scoreImpact += 15;

    // Image optimization analysis
    const imageViolations = await ImageOptimizationAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...imageViolations);
    if (imageViolations.length > 0) scoreImpact += 10;

    // Caching strategy analysis
    const cachingViolations = await CachingStrategyAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...cachingViolations);
    if (cachingViolations.length > 0) scoreImpact += 10;

    return { violations, scoreImpact };
  }
}
