import type { RuleOfCodeConfig } from '../../../../config/types';
import {
  ReactPerformanceSource,
  unreadViolation,
} from '../../../../utils/react/react-performance-source';
import { WebBundlerConfig } from '../../../../utils/react/web-bundler-config';
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
    config?: RuleOfCodeConfig,
    lawId?: string
  ): Promise<{
    violations: string[];
    scoreImpact: number;
  }> {
    const violations: string[] = [];
    let scoreImpact = 0;

    // Read once, shared by the sub-checks that accept React/Next evidence. On a
    // project that declares neither react nor next the scan does not run.
    const react = ReactPerformanceSource.scan({
      projectRoot,
      config: config as RuleOfCodeConfig,
      lawId,
    });
    const bundler = WebBundlerConfig.inspect(projectRoot);

    // Lighthouse analysis
    const lighthouseViolations = LighthouseAnalyzer.analyze(projectRoot);
    violations.push(...lighthouseViolations);
    if (lighthouseViolations.length > 0) scoreImpact += 25;

    // Performance budgets analysis
    const budgetsViolations = PerformanceBudgetsAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...budgetsViolations);
    if (budgetsViolations.length > 0) scoreImpact += 20;

    // Core Web Vitals analysis
    const vitalsViolations = await CoreWebVitalsAnalyzer.analyze(
      projectRoot,
      config,
      react
    );
    violations.push(...vitalsViolations);
    if (vitalsViolations.length > 0) scoreImpact += 20;

    // Bundle optimization analysis
    const bundleViolations = BundleOptimizationAnalyzer.analyze(
      projectRoot,
      bundler
    );
    violations.push(...bundleViolations);
    if (bundleViolations.length > 0) scoreImpact += 15;

    // Image optimization analysis
    const imageViolations = await ImageOptimizationAnalyzer.analyze(
      projectRoot,
      config,
      react,
      bundler
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

    // Files the React scan could not read were not inspected: say so, never
    // let their absence read as compliance.
    if (react.unread.length > 0) {
      violations.push(unreadViolation(react.unread));
      scoreImpact += 10;
    }

    return { violations, scoreImpact };
  }
}
