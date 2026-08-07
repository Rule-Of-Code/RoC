import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PerformanceBudgetComplianceCheckConstants } from './performance-budget-compliance/constants';
import { PerformanceBudgetComplianceAnalyzerService } from './performance-budget-compliance/services';

/**
 * Performance Budget Compliance Law
 *
 * Comprehensive performance budget enforcement that checks for:
 * - Angular CLI performance budgets configuration
 * - Webpack performance budgets and asset size limits
 * - Lighthouse CI budget configurations
 * - Bundle size monitoring and alerts
 * - Build-time performance enforcement
 * - CI/CD performance gates
 *
 * Responsibilities:
 * - Coordinate analysis of performance budget compliance
 * - Aggregate results from specialized analyzer services
 * - Calculate final score and compile recommendations
 */
export class PerformanceBudgetComplianceLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Analyze Angular CLI performance budgets
    const angularBudgets =
      PerformanceBudgetComplianceAnalyzerService.analyzeAngularBudgets(
        projectRoot
      );
    if (!angularBudgets.configured) {
      violations.push('Angular CLI performance budgets not configured');
      suggestions.push(
        'Add performance budgets in angular.json build configurations'
      );
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('ANGULAR');
    }

    // Webpack budgets and Lighthouse CI are ALTERNATIVE ways to declare a
    // performance budget. If Angular budgets are configured (the native way, and
    // the only one that exists on the esbuild `application` builder — which has
    // no webpack.config at all), the budget concern is met; requiring webpack too
    // false-fails every modern esbuild project. So these become suggestions once
    // Angular budgets are present, and only fail the law as a fallback when no
    // budget mechanism is configured at all.

    // 2. Analyze Webpack performance configuration
    const webpackPerformance =
      PerformanceBudgetComplianceAnalyzerService.analyzeWebpackBudgets(
        projectRoot
      );
    if (!angularBudgets.configured && !webpackPerformance.configured) {
      violations.push('Webpack performance configuration not set');
      suggestions.push(
        'Configure maxAssetSize and maxEntrypointSize in webpack'
      );
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('WEBPACK');
    }

    // 3. Analyze Lighthouse CI budgets
    const lighthouseBudgets =
      PerformanceBudgetComplianceAnalyzerService.analyzeLighthouseBudgets(
        projectRoot
      );
    if (!angularBudgets.configured && !lighthouseBudgets.configured) {
      violations.push('Lighthouse CI performance budgets not configured');
      suggestions.push('Add .lighthouserc.js with budget assertions');
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction(
          'LIGHTHOUSE'
        );
    }

    // 4. Analyze bundle size monitoring. Angular budgets ARE bundle-size
    // monitoring — the build fails when maximumError is exceeded — so a project
    // with budgets configured is not missing it.
    const bundleMonitoring =
      PerformanceBudgetComplianceAnalyzerService.analyzeBundleSize(projectRoot);
    if (!angularBudgets.configured && !bundleMonitoring.monitored) {
      violations.push('Bundle size monitoring not implemented');
      suggestions.push('Implement bundle size tracking in CI/CD pipeline');
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('BUNDLE');
    }

    // 5. Analyze CI/CD performance gates
    const cicdGates =
      PerformanceBudgetComplianceAnalyzerService.analyzeCICDGates(
        projectRoot,
        context.config
      );
    if (!cicdGates.configured) {
      violations.push('CI/CD performance gates not configured');
      suggestions.push('Add performance budget checks to CI/CD pipeline');
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction('CI_CD');
    }

    // 6. Analyze production performance monitoring
    const prodMonitoring =
      PerformanceBudgetComplianceAnalyzerService.analyzeProductionMonitoring(
        projectRoot,
        context.config
      );
    if (!prodMonitoring.monitored) {
      violations.push(
        'Production performance budget monitoring not configured'
      );
      suggestions.push(
        'Configure alerts for performance budget violations in production'
      );
      score -=
        PerformanceBudgetComplianceCheckConstants.getScoreDeduction(
          'MONITORING'
        );
    }

    return Promise.resolve({
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'Performance budget compliance fully implemented'
          : `Performance budget violations found: ${violations.join(', ')}`,
      details: violations,
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    });
  }
}
