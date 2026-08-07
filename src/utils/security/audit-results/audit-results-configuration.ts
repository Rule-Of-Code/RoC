import { StringTemplateUtils } from '../../string-template-utils';

/**
 * Audit Results Configuration
 * Centralized patterns, messages, and thresholds for npm audit analysis
 */
export class AuditResultsConfiguration {
  /**
   * Severity levels with associated score penalties
   */
  static readonly SEVERITY_LEVELS = {
    CRITICAL: { name: 'critical', scorePenalty: -50 },
    HIGH: { name: 'high', scorePenalty: -30 },
    MODERATE: { name: 'moderate', scorePenalty: -15 },
    LOW: { name: 'low', scorePenalty: -5 },
    INFO: { name: 'info', scorePenalty: 0 },
  } as const;

  /**
   * Default configuration values
   */
  static readonly DEFAULTS = {
    INITIAL_SCORE: 100,
    MIN_SCORE: 0,
  } as const;

  /**
   * Validation messages with placeholders
   */
  static readonly VALIDATION_MESSAGES = {
    RUN_AUDIT_SUGGESTION: 'Run npm audit to check for security vulnerabilities',
    FOUND_VULNERABILITIES: 'Found {count} {severity} severity vulnerabilities',
    TOTAL_VULNERABILITIES: 'Total vulnerabilities found: {count}',
    NO_VULNERABILITIES:
      'No vulnerabilities found - maintain regular audit checks',
    REGULAR_UPDATES: 'Regular dependency updates help prevent vulnerabilities',
    USE_DEPENDABOT: 'Consider using automated security tools like Dependabot',
    REVIEW_DEPENDENCIES:
      'Review and update dependencies with high/critical vulnerabilities',
    FIND_ALTERNATIVES:
      'Consider finding alternative packages if fixes are not available',
  } as const;

  /**
   * Severity-specific action messages
   */
  static readonly ACTION_MESSAGES = {
    CRITICAL: {
      urgent: 'URGENT: Fix {count} critical vulnerabilities immediately',
      command: 'Run: npm audit fix --force',
    },
    HIGH: {
      urgent: 'Fix {count} high severity vulnerabilities within 1 week',
      command: 'Run: npm audit fix',
    },
    MODERATE: {
      action: 'Address {count} moderate vulnerabilities within 1 month',
      command: 'Consider running: npm update',
    },
    LOW: {
      action: '{count} low severity issues can be fixed when convenient',
    },
  } as const;

  /**
   * Action plan step templates
   */
  static readonly ACTION_PLAN_TEMPLATES = {
    IMMEDIATE_CRITICAL: 'IMMEDIATE: Fix {count} critical vulnerabilities',
    RUN_AUDIT_FIX_FORCE: 'Run: npm audit fix --force',
    URGENT_HIGH: 'URGENT: Address {count} high severity issues',
    RUN_AUDIT_FIX: 'Run: npm audit fix',
    PLAN_MODERATE: 'Plan to fix {count} moderate issues',
    CONSIDER_UPDATE: 'Consider: npm update',
    MONITOR_LOW: 'Monitor {count} low severity issues',
    SETUP_MONITORING: 'Set up automated security monitoring',
    SCHEDULE_REVIEWS: 'Schedule regular dependency reviews',
    RUN_AUDIT_FIRST: 'Run npm audit to identify vulnerabilities',
    SETUP_REGULAR_MONITORING: 'Set up regular security monitoring',
  } as const;

  /**
   * Action plan configuration for data-driven generation
   * Maps severity to templates and commands
   */
  static readonly ACTION_PLAN_CONFIG = [
    {
      severity: 'critical' as const,
      messageTemplate: 'IMMEDIATE_CRITICAL' as const,
      commandTemplate: 'RUN_AUDIT_FIX_FORCE' as const,
    },
    {
      severity: 'high' as const,
      messageTemplate: 'URGENT_HIGH' as const,
      commandTemplate: 'RUN_AUDIT_FIX' as const,
    },
    {
      severity: 'moderate' as const,
      messageTemplate: 'PLAN_MODERATE' as const,
      commandTemplate: 'CONSIDER_UPDATE' as const,
    },
    {
      severity: 'low' as const,
      messageTemplate: 'MONITOR_LOW' as const,
      commandTemplate: null,
    },
  ] as const;

  /**
   * Build message with placeholder replacement
   * Delegates to StringTemplateUtils (Rule 1 - 100% coverage)
   */
  static buildMessage(
    template: string,
    replacements: Record<string, number | string>
  ): string {
    return StringTemplateUtils.formatNamedTemplate(template, replacements);
  }

  /**
   * Get ordered severity levels for iteration
   */
  static getSeverityLevelsOrdered(): Array<{
    name: string;
    scorePenalty: number;
  }> {
    return [
      this.SEVERITY_LEVELS.CRITICAL,
      this.SEVERITY_LEVELS.HIGH,
      this.SEVERITY_LEVELS.MODERATE,
      this.SEVERITY_LEVELS.LOW,
      this.SEVERITY_LEVELS.INFO,
    ];
  }

  /**
   * Calculate score penalty for a severity level
   */
  static calculateScorePenalty(severityName: string, count: number): number {
    const level = this.getSeverityLevelsOrdered().find(
      l => l.name === severityName
    );
    return level ? level.scorePenalty * count : 0;
  }

  /**
   * Ensure score is within valid bounds
   */
  static clampScore(score: number): number {
    return Math.max(this.DEFAULTS.MIN_SCORE, score);
  }

  /**
   * Calculate final score based on vulnerability summary
   * (Moved from ValidationPatterns - 100% Configuration coverage)
   */
  static calculateFinalScore(summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info?: number;
  }): number {
    let score: number = this.DEFAULTS.INITIAL_SCORE;
    const { CRITICAL, HIGH, MODERATE, LOW } = this.SEVERITY_LEVELS;

    score += this.calculateScorePenalty(CRITICAL.name, summary.critical);
    score += this.calculateScorePenalty(HIGH.name, summary.high);
    score += this.calculateScorePenalty(MODERATE.name, summary.moderate);
    score += this.calculateScorePenalty(LOW.name, summary.low);

    return this.clampScore(score);
  }

  /**
   * Add severity-specific suggestions to array
   * (Moved from ValidationPatterns - 100% Configuration coverage)
   */
  static addSeveritySpecificSuggestions(
    severityName: string,
    count: number,
    suggestions: string[]
  ): void {
    const { CRITICAL, HIGH, MODERATE, LOW } = this.SEVERITY_LEVELS;

    switch (severityName) {
      case CRITICAL.name:
        suggestions.push(
          this.buildMessage(this.ACTION_MESSAGES.CRITICAL.urgent, { count })
        );
        suggestions.push(this.ACTION_MESSAGES.CRITICAL.command);
        break;
      case HIGH.name:
        suggestions.push(
          this.buildMessage(this.ACTION_MESSAGES.HIGH.urgent, { count })
        );
        suggestions.push(this.ACTION_MESSAGES.HIGH.command);
        break;
      case MODERATE.name:
        suggestions.push(
          this.buildMessage(this.ACTION_MESSAGES.MODERATE.action, { count })
        );
        suggestions.push(this.ACTION_MESSAGES.MODERATE.command);
        break;
      case LOW.name:
        suggestions.push(
          this.buildMessage(this.ACTION_MESSAGES.LOW.action, { count })
        );
        break;
    }
  }

  /**
   * Process severity levels and populate violations/suggestions
   * (Moved from ValidationPatterns - 100% Configuration coverage)
   */
  static processSeverityLevels(
    summary: {
      critical: number;
      high: number;
      moderate: number;
      low: number;
      info: number;
      total: number;
    },
    violations: string[],
    suggestions: string[]
  ): number {
    let totalVulnerabilities = 0;

    for (const level of this.getSeverityLevelsOrdered()) {
      const count = summary[level.name as keyof typeof summary] || 0;
      if (count <= 0) continue;

      totalVulnerabilities += count;

      if (level.scorePenalty < 0) {
        violations.push(
          this.buildMessage(this.VALIDATION_MESSAGES.FOUND_VULNERABILITIES, {
            count,
            severity: level.name,
          })
        );
      }

      this.addSeveritySpecificSuggestions(level.name, count, suggestions);
    }

    return totalVulnerabilities;
  }

  /**
   * Check if summary has high-priority vulnerabilities (critical or high)
   */
  static hasHighPriorityVulnerabilities(summary: {
    critical: number;
    high: number;
  }): boolean {
    return summary.critical > 0 || summary.high > 0;
  }

  /**
   * Add overall assessment based on total vulnerabilities
   * (Moved from ValidationPatterns - 100% Configuration coverage)
   */
  static addOverallAssessment(
    totalVulnerabilities: number,
    summary: { critical: number; high: number },
    violations: string[],
    suggestions: string[]
  ): void {
    if (totalVulnerabilities === 0) {
      suggestions.push(this.VALIDATION_MESSAGES.NO_VULNERABILITIES);
      return;
    }

    violations.push(
      this.buildMessage(this.VALIDATION_MESSAGES.TOTAL_VULNERABILITIES, {
        count: totalVulnerabilities,
      })
    );

    suggestions.push(this.VALIDATION_MESSAGES.REGULAR_UPDATES);
    suggestions.push(this.VALIDATION_MESSAGES.USE_DEPENDABOT);

    if (this.hasHighPriorityVulnerabilities(summary)) {
      suggestions.push(this.VALIDATION_MESSAGES.REVIEW_DEPENDENCIES);
      suggestions.push(this.VALIDATION_MESSAGES.FIND_ALTERNATIVES);
    }
  }

  /**
   * Extract vulnerability breakdown from summary
   * (Centralizes severity property names)
   */
  static extractBreakdown(summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  }): {
    hasVulnerabilities: boolean;
    breakdown: Record<string, number>;
    totalCount: number;
  } {
    const breakdown: Record<string, number> = {};

    for (const level of this.getSeverityLevelsOrdered()) {
      const count = summary[level.name as keyof typeof summary] || 0;
      breakdown[level.name] = count;
    }

    return {
      hasVulnerabilities: summary.total > 0,
      breakdown,
      totalCount: summary.total,
    };
  }

  /**
   * Generate priority-based action plan from vulnerability summary
   * (Centralizes action plan generation logic)
   */
  static generateActionPlanSteps(summary: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
  }): string[] {
    const actionPlan: string[] = [];
    const templates = this.ACTION_PLAN_TEMPLATES;
    let step = 1;

    // Data-driven action plan generation using ACTION_PLAN_CONFIG
    for (const config of this.ACTION_PLAN_CONFIG) {
      const count = summary[config.severity];
      if (count > 0) {
        actionPlan.push(
          `${step++}. ${this.buildMessage(templates[config.messageTemplate], { count })}`
        );
        if (config.commandTemplate) {
          actionPlan.push(`${step++}. ${templates[config.commandTemplate]}`);
        }
      }
    }

    actionPlan.push(`${step++}. ${templates.SETUP_MONITORING}`);
    actionPlan.push(`${step++}. ${templates.SCHEDULE_REVIEWS}`);

    return actionPlan;
  }

  /**
   * Generate default action plan when no audit data available
   */
  static generateDefaultActionPlan(): string[] {
    const templates = this.ACTION_PLAN_TEMPLATES;
    return [
      `1. ${templates.RUN_AUDIT_FIRST}`,
      `2. ${templates.SETUP_REGULAR_MONITORING}`,
    ];
  }
}
