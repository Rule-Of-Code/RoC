import type { AuditResults } from '../npm-audit-simulator';
import { AuditResultsValidationPatterns } from './audit-results-validation-patterns';

/**
 * Audit Results Analyzer
 * Facade for npm audit results analysis - delegates to specialized utilities
 */
export class AuditResultsAnalyzer {
  /**
   * Analyze audit results and generate violation/suggestion lists
   * Delegates to AuditResultsValidationPatterns
   */
  static analyzeAuditResults(auditResults: AuditResults): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    return AuditResultsValidationPatterns.analyzeAuditResults(auditResults);
  }

  /**
   * Get detailed vulnerability breakdown
   * Delegates to AuditResultsValidationPatterns
   */
  static getVulnerabilityBreakdown(auditResults: AuditResults): {
    hasVulnerabilities: boolean;
    breakdown: Record<string, number>;
    totalCount: number;
  } {
    return AuditResultsValidationPatterns.getVulnerabilityBreakdown(
      auditResults
    );
  }

  /**
   * Generate priority-based action plan
   * Delegates to AuditResultsValidationPatterns
   */
  static generateActionPlan(auditResults: AuditResults): string[] {
    return AuditResultsValidationPatterns.generateActionPlan(auditResults);
  }
}
