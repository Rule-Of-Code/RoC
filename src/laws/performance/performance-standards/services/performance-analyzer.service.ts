import type { ViolationDetail } from '../../../../types/law.types';
import type { RuleOfCodeConfig } from '../../../../config/types';
import {
  ReactPerformanceSource,
  pushUnread,
} from '../../../../utils/react/react-performance-source';
import { WebBundlerConfig } from '../../../../utils/react/web-bundler-config';
import { BundleOptimizationAnalyzer } from './bundle-optimization.analyzer';
import { CachingStrategyAnalyzer } from './caching-strategy.analyzer';
import { CoreWebVitalsAnalyzer } from './core-web-vitals.analyzer';
import { ImageOptimizationAnalyzer } from './image-optimization.analyzer';
import { LighthouseAnalyzer } from './lighthouse.analyzer';
import { PerformanceBudgetsAnalyzer } from './performance-budgets.analyzer';

/** Points each kind of performance finding takes off the score. */
const PENALTY = {
  lighthouse: 25,
  budgets: 20,
  vitals: 20,
  bundle: 15,
  images: 10,
  caching: 10,
  unread: 10,
} as const;

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
    /** Every file behind a "NOT read … (+N more)" line (#43). */
    details: ViolationDetail[];
  }> {
    const violations: string[] = [];
    const details: ViolationDetail[] = [];
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
    if (lighthouseViolations.length > 0) scoreImpact += PENALTY.lighthouse;

    // Performance budgets analysis
    const budgetsViolations = PerformanceBudgetsAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...budgetsViolations);
    if (budgetsViolations.length > 0) scoreImpact += PENALTY.budgets;

    // Core Web Vitals analysis
    const vitalsViolations = await CoreWebVitalsAnalyzer.analyze(
      projectRoot,
      config,
      react,
      lawId
    );
    violations.push(...vitalsViolations);
    if (vitalsViolations.length > 0) scoreImpact += PENALTY.vitals;

    // Bundle optimization analysis
    const bundleViolations = BundleOptimizationAnalyzer.analyze(
      projectRoot,
      bundler,
      details
    );
    violations.push(...bundleViolations);
    if (bundleViolations.length > 0) scoreImpact += PENALTY.bundle;

    // Image optimization analysis
    const imageViolations = await ImageOptimizationAnalyzer.analyze(
      projectRoot,
      config,
      react,
      bundler
    );
    violations.push(...imageViolations);
    if (imageViolations.length > 0) scoreImpact += PENALTY.images;

    // Caching strategy analysis
    const cachingViolations = await CachingStrategyAnalyzer.analyze(
      projectRoot,
      config
    );
    violations.push(...cachingViolations);
    if (cachingViolations.length > 0) scoreImpact += PENALTY.caching;

    // Files the React scan could not read were not inspected: say so, never
    // let their absence read as compliance.
    if (react.unread.length > 0) {
      pushUnread(violations, details, react.unread);
      scoreImpact += PENALTY.unread;
    }

    return { violations, scoreImpact, details };
  }
}
