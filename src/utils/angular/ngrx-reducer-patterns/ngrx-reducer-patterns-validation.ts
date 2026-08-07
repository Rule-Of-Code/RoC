import { NgRxReducerPatternsConfiguration } from '.';
import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxActionHandlingAnalyzer } from '../ngrx-action-handling';
import { NgRxImmutabilityComplianceAnalyzer } from '../ngrx-immutability';

/**
 * NgRx Reducer Patterns Validation Utility
 * Orchestrates comprehensive reducer pattern analysis workflow
 */
export class NgRxReducerPatternsValidation {
  /**
   * Execute complete reducer patterns analysis workflow
   */
  static executeAnalysisWorkflow(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Validate project configuration
    const configValidation =
      NgRxReducerPatternsConfiguration.validateProjectConfig(
        projectRoot,
        config
      );

    if (!configValidation.isValid) {
      violations.push(...configValidation.errors);
      return { violations, suggestions };
    }

    // Check if source path exists
    const srcPath = NgRxReducerPatternsConfiguration.getSourcePath(projectRoot);
    if (!srcPath) {
      return { violations, suggestions };
    }

    // Execute orchestrated analysis
    const analysisResults = this.orchestrateAnalyzers(projectRoot, config);
    violations.push(...analysisResults.violations);
    suggestions.push(...analysisResults.suggestions);

    return this.processAnalysisResults({ violations, suggestions });
  }

  /**
   * Orchestrate multiple analyzers for comprehensive analysis
   */
  private static orchestrateAnalyzers(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const orchestration =
      NgRxReducerPatternsConfiguration.getAnalyzerOrchestration();

    // Execute action handling analysis
    if (orchestration.actionHandling.enabled) {
      const actionAnalysis = NgRxActionHandlingAnalyzer.checkActionHandling(
        projectRoot,
        config
      );
      violations.push(...actionAnalysis.violations);
      suggestions.push(...actionAnalysis.suggestions);
    }

    // Execute immutability compliance analysis
    if (orchestration.immutabilityCompliance.enabled) {
      const immutabilityAnalysis =
        NgRxImmutabilityComplianceAnalyzer.checkImmutabilityCompliance(
          projectRoot,
          config
        );
      violations.push(...immutabilityAnalysis.violations);
      suggestions.push(...immutabilityAnalysis.suggestions);
    }

    return { violations, suggestions };
  }

  /**
   * Process and optimize analysis results
   */
  private static processAnalysisResults(results: {
    violations: string[];
    suggestions: string[];
  }): { violations: string[]; suggestions: string[] } {
    const aggregationConfig =
      NgRxReducerPatternsConfiguration.getResultAggregationConfig();

    let { violations, suggestions } = results;

    if (aggregationConfig.deduplicateResults) {
      violations = [...new Set(violations)];
      suggestions = [...new Set(suggestions)];
    }

    if (aggregationConfig.prioritizeViolations && violations.length > 0) {
      // Sort violations by severity (implementation can be expanded)
      violations = violations.sort((a, b) => a.localeCompare(b));
    }

    return { violations, suggestions };
  }

  /**
   * Get analysis summary
   */
  static getAnalysisSummary(results: {
    violations: string[];
    suggestions: string[];
  }): {
    totalIssues: number;
    violationsCount: number;
    suggestionsCount: number;
    severity: 'high' | 'low' | 'medium';
    analysisComplete: boolean;
  } {
    const { violations, suggestions } = results;
    const totalIssues = violations.length + suggestions.length;

    let severity: 'high' | 'low' | 'medium' = 'low';
    if (violations.length > 10) {
      severity = 'high';
    } else if (violations.length > 3) {
      severity = 'medium';
    }

    return {
      totalIssues,
      violationsCount: violations.length,
      suggestionsCount: suggestions.length,
      severity,
      analysisComplete: true,
    };
  }

  /**
   * Validate analysis prerequisites
   */
  static validateAnalysisPrerequisites(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { canProceed: boolean; issues: string[] } {
    const issues: string[] = [];

    const configValidation =
      NgRxReducerPatternsConfiguration.validateProjectConfig(
        projectRoot,
        config
      );

    if (!configValidation.isValid) {
      issues.push(...configValidation.errors);
    }

    issues.push(...configValidation.warnings);

    return {
      canProceed: configValidation.isValid,
      issues,
    };
  }

  /**
   * Get analyzer orchestration status
   */
  static getOrchestratorStatus(): {
    actionHandlingAnalyzer: boolean;
    immutabilityComplianceAnalyzer: boolean;
    totalEnabledAnalyzers: number;
  } {
    const orchestration =
      NgRxReducerPatternsConfiguration.getAnalyzerOrchestration();

    return {
      actionHandlingAnalyzer: orchestration.actionHandling.enabled,
      immutabilityComplianceAnalyzer:
        orchestration.immutabilityCompliance.enabled,
      totalEnabledAnalyzers: Object.values(orchestration).filter(
        analyzer => analyzer.enabled
      ).length,
    };
  }
}
