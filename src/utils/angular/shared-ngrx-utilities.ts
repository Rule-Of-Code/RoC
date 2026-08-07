import { SEVERITY_THRESHOLDS } from '../constants';

/**
 * Shared NgRx Analysis Utilities
 * Common patterns and operations for NgRx analysis
 */
export class NgRxAnalysisUtilities {
  /**
   * Standard severity configuration for NgRx analysis
   */
  static readonly SEVERITY_CONFIG = {
    thresholds: {
      high: SEVERITY_THRESHOLDS.HIGH,
      medium: SEVERITY_THRESHOLDS.MEDIUM,
    },
    levels: {
      high: SEVERITY_THRESHOLDS.LEVELS.HIGH as 'high',
      medium: SEVERITY_THRESHOLDS.LEVELS.MEDIUM as 'medium',
      low: SEVERITY_THRESHOLDS.LEVELS.LOW as 'low',
    },
    categories: {
      dependency: SEVERITY_THRESHOLDS.CATEGORIES.DEPENDENCY,
      module: SEVERITY_THRESHOLDS.CATEGORIES.MODULE,
      devtools: SEVERITY_THRESHOLDS.CATEGORIES.DEVTOOLS,
      feature: SEVERITY_THRESHOLDS.CATEGORIES.FEATURE,
    },
  } as const;

  /**
   * Calculate severity based on violation count
   */
  static calculateSeverity(violationsCount: number): 'high' | 'low' | 'medium' {
    const config = this.SEVERITY_CONFIG;
    if (violationsCount > config.thresholds.high) return config.levels.high;
    if (violationsCount > config.thresholds.medium) return config.levels.medium;
    return config.levels.low;
  }

  /**
   * Case-insensitive string matching utility
   */
  static matchesCategoryIgnoreCase(text: string, category: string): boolean {
    return text.toLowerCase().includes(category.toLowerCase());
  }

  /**
   * Count issues by category with cached array operations
   */
  static countIssuesByCategory(
    violations: string[],
    suggestions: string[],
    category: string
  ): number {
    const allIssues = [...violations, ...suggestions];
    return allIssues.filter(issue =>
      this.matchesCategoryIgnoreCase(issue, category)
    ).length;
  }

  /**
   * Calculate all setup areas in one pass
   */
  static calculateSetupAreas(
    violations: string[],
    suggestions: string[]
  ): {
    dependencyIssues: number;
    moduleConfigIssues: number;
    devtoolsIssues: number;
    featureStoreIssues: number;
  } {
    const {categories} = this.SEVERITY_CONFIG;
    const allIssues = [...violations, ...suggestions];

    const countByCategory = (category: string) =>
      allIssues.filter(issue => this.matchesCategoryIgnoreCase(issue, category))
        .length;

    return {
      dependencyIssues: countByCategory(categories.dependency),
      moduleConfigIssues: countByCategory(categories.module),
      devtoolsIssues: countByCategory(categories.devtools),
      featureStoreIssues: countByCategory(categories.feature),
    };
  }

  /**
   * Standard result deduplication
   */
  static deduplicateResults(results: {
    violations: string[];
    suggestions: string[];
  }): { violations: string[]; suggestions: string[] } {
    return {
      violations: [...new Set(results.violations)],
      suggestions: [...new Set(results.suggestions)],
    };
  }

  /**
   * Generate comprehensive setup analysis summary
   */
  static getSetupAnalysisSummary(results: {
    violations: string[];
    suggestions: string[];
  }): {
    totalIssues: number;
    violationsCount: number;
    suggestionsCount: number;
    severity: 'high' | 'low' | 'medium';
    analysisComplete: boolean;
    setupAreas: {
      dependencyIssues: number;
      moduleConfigIssues: number;
      devtoolsIssues: number;
      featureStoreIssues: number;
    };
  } {
    const { violations, suggestions } = results;

    // Cache calculated values to avoid repeated access
    const violationsCount = violations.length;
    const suggestionsCount = suggestions.length;
    const totalIssues = violationsCount + suggestionsCount;
    const severity = this.calculateSeverity(violationsCount);

    // Use optimized helper method
    const setupAreas = this.calculateSetupAreas(violations, suggestions);

    return {
      totalIssues,
      violationsCount,
      suggestionsCount,
      severity,
      analysisComplete: true,
      setupAreas,
    };
  }
}
