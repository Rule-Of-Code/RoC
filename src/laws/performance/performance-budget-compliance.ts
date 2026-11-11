import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PerformanceBudgetGates } from '../../utils/performance-budget-gates';
import {
  ReactPerformanceSource,
  unreadViolation,
} from '../../utils/react/react-performance-source';
import { WorkspaceManifests } from '../../utils/workspace-manifests';
import { PerformanceBudgetComplianceCheckConstants } from './performance-budget-compliance/constants';
import { PerformanceBudgetComplianceAnalyzerService } from './performance-budget-compliance/services';

const deduct = (check: string): number =>
  PerformanceBudgetComplianceCheckConstants.getScoreDeduction(check);

/**
 * Performance Budget Compliance Law
 *
 * One enforced budget, run by a named gate:
 * - a budget: Angular CLI `budgets`, webpack `performance` hints, Lighthouse
 *   assertions that something runs, or a size-limit check that something runs
 *   — any ONE of them. The law used to demand webpack AND Lighthouse of every
 *   project without Angular budgets, so a Next or Vite project could only pass
 *   by adding a webpack config it does not use;
 * - bundle-size monitoring (Angular budgets, webpack hints and size-limit are
 *   monitoring in themselves);
 * - a gate that runs the budget tool: a CI step, or a git hook where the
 *   project has no hosted CI;
 * - production performance monitoring.
 */
export class PerformanceBudgetComplianceLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot, config } = context;
    const analyzer = PerformanceBudgetComplianceAnalyzerService;

    const angularBudgets = analyzer.analyzeAngularBudgets(projectRoot);
    const webpackPerformance = analyzer.analyzeWebpackBudgets(projectRoot);
    const sizeLimit = PerformanceBudgetGates.enforcedSizeLimit(projectRoot, config);
    const lighthouse = PerformanceBudgetGates.enforcedLighthouse(projectRoot, config);
    const hasBudget =
      angularBudgets.configured ||
      webpackPerformance.configured ||
      sizeLimit !== null ||
      lighthouse !== null;

    // 1. A budget. An Angular project is pointed at its native mechanism.
    if (!hasBudget) {
      if (WorkspaceManifests.declares(projectRoot, '@angular/core')) {
        violations.push('Angular CLI performance budgets not configured');
        suggestions.push('Add performance budgets in angular.json build configurations');
      } else {
        violations.push(
          'No enforced performance budget: declare webpack performance hints, Lighthouse assertions, or a size-limit check, run by a script or CI'
        );
        suggestions.push(
          'Add a size-limit check with a "limit" and a script that runs it, or Lighthouse CI assertions'
        );
      }
      score -= deduct('ANGULAR') + deduct('WEBPACK') + deduct('LIGHTHOUSE');
    }

    // 2. Bundle size monitoring. Angular budgets, webpack hints and size-limit
    // fail the build or the check when the bundle grows past the limit.
    const bundleMonitoring = analyzer.analyzeBundleSize(projectRoot);
    if (
      !angularBudgets.configured &&
      !webpackPerformance.configured &&
      sizeLimit === null &&
      !bundleMonitoring.monitored
    ) {
      violations.push('Bundle size monitoring not implemented');
      suggestions.push('Implement bundle size tracking in CI/CD pipeline');
      score -= deduct('BUNDLE');
    }

    // 3. The gate that runs it.
    const gates = analyzer.analyzeCICDGates(projectRoot, config);
    if (!gates.configured) {
      violations.push(
        gates.hostedCi
          ? 'CI/CD performance gates not configured'
          : 'CI/CD performance gates not configured (no hosted CI, and no git hook runs a budget tool)'
      );
      suggestions.push(
        'Run the budget tool (lhci, size-limit, or the Angular build with maximumError budgets) from a CI step, or from a git hook where there is no hosted CI'
      );
      score -= deduct('CI_CD');
    }

    // 4. Production performance monitoring.
    const react = ReactPerformanceSource.scan(context);
    const prodMonitoring = analyzer.analyzeProductionMonitoring(
      projectRoot,
      config,
      react
    );
    if (!prodMonitoring.monitored) {
      violations.push('Production performance budget monitoring not configured');
      suggestions.push(
        'Configure alerts for performance budget violations in production'
      );
      score -= deduct('MONITORING');
    }

    // React source the scan could not read was not inspected.
    if (react.unread.length > 0) {
      violations.push(unreadViolation(react.unread));
      score -= deduct('MONITORING');
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
