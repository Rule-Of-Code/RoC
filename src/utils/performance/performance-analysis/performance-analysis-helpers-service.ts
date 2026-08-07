/**
 * Performance Analysis Helpers Service
 * Specialized utility methods for performance analysis processing
 * RULE 2: Extracted from main service to eliminate code duplication and improve modularity
 */

import { PerformanceAnalysisConfiguration } from './performance-analysis-configuration';
import type { PerformanceAnalysisResult } from './performance-analysis-service';

export class PerformanceAnalysisHelpersService {
  private static readonly Config = PerformanceAnalysisConfiguration;

  /**
   * Helper: Add issues with proper type and severity
   * RULE 2: Eliminates duplicated issue mapping logic
   */
  static addIssues(
    issues: PerformanceAnalysisResult['issues'],
    violations: string[],
    type: string
  ): void {
    const severity =
      this.Config.getSeverityForType(type) ?? this.Config.SEVERITY.LOW;

    issues.push(
      ...violations.map((issue: string) => ({
        type,
        severity,
        message: issue,
        line: 0,
      }))
    );
  }

  /**
   * Helper: Process analysis result and conditionally add recommendation
   * RULE 2: Eliminates duplicated result processing logic
   */
  static processAnalysisResult(
    violations: string[],
    issues: PerformanceAnalysisResult['issues'],
    recommendations: string[],
    issueType: string,
    recommendation: string
  ): void {
    this.addIssues(issues, violations, issueType);
    if (violations.length > 0) {
      recommendations.push(recommendation);
    }
  }

  /**
   * Helper: Flatten Object.values result for analyzers that return nested structure
   * RULE 2: Eliminates duplicated Object.values().flat() operations
   */
  static flattenAnalysisResult(result: Record<string, string[]>): string[] {
    return Object.values(result).flat();
  }

  /**
   * Helper: Count issues by severity using filtering
   * RULE 2: Eliminates duplicated severity counting logic
   */
  static countIssuesBySeverity(issues: PerformanceAnalysisResult['issues']): {
    high: number;
    medium: number;
    low: number;
    total: number;
  } {
    const total = issues.length;
    const high = issues.filter(
      i => i.severity === this.Config.SEVERITY.HIGH
    ).length;
    const medium = issues.filter(
      i => i.severity === this.Config.SEVERITY.MEDIUM
    ).length;
    const low = total - high - medium;

    return { high, medium, low, total };
  }
}
