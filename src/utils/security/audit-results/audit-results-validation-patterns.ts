import type { AuditResults } from '../npm-audit-simulator';
import { AuditResultsConfiguration } from './audit-results-configuration';

/**
 * Audit Results Validation Patterns
 * Validation workflow for npm audit analysis
 */
export class AuditResultsValidationPatterns {
  private static readonly Config = AuditResultsConfiguration;

  /**
   * Analyze audit results and generate violation/suggestion lists
   */
  static analyzeAuditResults(auditResults: AuditResults | null | undefined): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score: number = this.Config.DEFAULTS.INITIAL_SCORE;

    const summary = auditResults?.metadata.vulnerabilities.summary;
    if (!summary) {
      suggestions.push(this.Config.VALIDATION_MESSAGES.RUN_AUDIT_SUGGESTION);
      return { violations, suggestions, score };
    }

    // Process each severity level
    const totalVulnerabilities = this.Config.processSeverityLevels(
      summary,
      violations,
      suggestions
    );

    // Calculate final score
    score = this.Config.calculateFinalScore(summary);

    // Add overall assessment
    this.Config.addOverallAssessment(
      totalVulnerabilities,
      summary,
      violations,
      suggestions
    );

    return { violations, suggestions, score };
  }

  /**
   * Get detailed vulnerability breakdown
   */
  static getVulnerabilityBreakdown(
    auditResults: AuditResults | null | undefined
  ): {
    hasVulnerabilities: boolean;
    breakdown: Record<string, number>;
    totalCount: number;
  } {
    const summary = auditResults?.metadata.vulnerabilities.summary;
    if (!summary) {
      return {
        hasVulnerabilities: false,
        breakdown: {},
        totalCount: 0,
      };
    }

    return this.Config.extractBreakdown(summary);
  }

  /**
   * Generate priority-based action plan
   */
  static generateActionPlan(
    auditResults: AuditResults | null | undefined
  ): string[] {
    const summary = auditResults?.metadata.vulnerabilities.summary;
    if (!summary) {
      return this.Config.generateDefaultActionPlan();
    }

    return this.Config.generateActionPlanSteps(summary);
  }
}
