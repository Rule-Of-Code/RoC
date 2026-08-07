import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { AngularBudgetAnalyzerService } from './angular-budget.analyzer';
import { BundleSizeAnalyzerService } from './bundle-size.analyzer';
import { CICDPerformanceGatesAnalyzerService } from './cicd-gates.analyzer';
import { LighthouseBudgetAnalyzerService } from './lighthouse-budget.analyzer';
import { ProductionMonitoringAnalyzerService } from './production-monitoring.analyzer';
import { WebpackBudgetAnalyzerService } from './webpack-budget.analyzer';

/**
 * PerformanceBudgetComplianceAnalyzerService
 *
 * Coordinator Service
 * Responsibilities:
 * - Coordinate all specialized budget analyzers
 * - Aggregate results from individual analysis services
 * - Provide unified interface for Law check
 */
export class PerformanceBudgetComplianceAnalyzerService {
  /**
   * Analyze Angular performance budgets
   */
  static analyzeAngularBudgets(projectRoot: string): {
    configured: boolean;
    projects: string[];
  } {
    return AngularBudgetAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze Webpack performance configuration
   */
  static analyzeWebpackBudgets(projectRoot: string): {
    configured: boolean;
    configs: string[];
  } {
    return WebpackBudgetAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze Lighthouse CI budgets
   */
  static analyzeLighthouseBudgets(projectRoot: string): {
    configured: boolean;
    configFiles: string[];
  } {
    return LighthouseBudgetAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze bundle size monitoring
   */
  static analyzeBundleSize(projectRoot: string): {
    monitored: boolean;
    tools: string[];
  } {
    return BundleSizeAnalyzerService.analyze(projectRoot);
  }

  /**
   * Analyze CI/CD performance gates
   */
  static analyzeCICDGates(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    configured: boolean;
    pipelines: string[];
  } {
    return CICDPerformanceGatesAnalyzerService.analyze(projectRoot, config);
  }

  /**
   * Analyze production performance monitoring
   */
  static analyzeProductionMonitoring(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    monitored: boolean;
    services: string[];
  } {
    return ProductionMonitoringAnalyzerService.analyze(projectRoot, config);
  }
}
