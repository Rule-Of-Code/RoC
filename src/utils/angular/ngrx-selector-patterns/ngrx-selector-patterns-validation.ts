import type { RuleOfCodeConfig } from '../../../config/types';
import { NgRxMemoizationValidationPatterns } from '../ngrx-memoization';
import { NgRxResultsProcessor } from '../ngrx-results-processor';
import { NgRxSetupConfiguration } from '../ngrx-setup';
import { NgRxSelectorPatternsConfiguration } from './ngrx-selector-patterns-configuration';

/**
 * NgRx Selector Patterns Validation Utility
 * Orchestrates comprehensive selector pattern analysis workflow
 * Delegates to specialized validation patterns utilities
 */
export class NgRxSelectorPatternsValidation {
  /**
   * Execute complete selector patterns analysis workflow
   * Delegates to NgRxMemoizationValidationPatterns for comprehensive analysis
   */
  static executeAnalysisWorkflow(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    // Validate project configuration
    const configValidation =
      NgRxSelectorPatternsConfiguration.validateProjectConfig(
        projectRoot,
        config
      );

    if (!configValidation.isValid) {
      return {
        violations: configValidation.errors,
        suggestions: [],
      };
    }

    // Delegate to comprehensive memoization validation
    const results =
      NgRxMemoizationValidationPatterns.validateAllMemoizationPatterns(
        projectRoot,
        config
      );

    // Deduplicate results using centralized utility
    return {
      violations: [...new Set(results.violations)],
      suggestions: [...new Set(results.suggestions)],
    };
  }

  /**
   * Analyze individual selector file with comprehensive patterns
   * Uses existing NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive
   */
  static analyzeIndividualSelectorFile(selectorFile: string): {
    violations: string[];
    suggestions: string[];
  } {
    return NgRxMemoizationValidationPatterns.analyzeSelectorFileComprehensive(
      selectorFile
    );
  }

  /**
   * Get comprehensive analysis summary
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
    patterns: {
      namingIssues: number;
      memoizationIssues: number;
      parameterIssues: number;
      reusabilityIssues: number;
      propsIssues: number;
    };
  } {
    const { violations, suggestions } = results;
    const {categories} = NgRxResultsProcessor.SEVERITY_CONFIG;

    return {
      totalIssues: violations.length + suggestions.length,
      violationsCount: violations.length,
      suggestionsCount: suggestions.length,
      severity: NgRxSetupConfiguration.calculateSeverity(violations.length),
      analysisComplete: true,
      patterns: {
        namingIssues: NgRxSetupConfiguration.countIssuesByCategory(
          violations,
          suggestions,
          'naming'
        ),
        memoizationIssues: NgRxSetupConfiguration.countIssuesByCategory(
          violations,
          suggestions,
          'createSelector'
        ),
        parameterIssues: NgRxSetupConfiguration.countIssuesByCategory(
          violations,
          suggestions,
          'parameter'
        ),
        reusabilityIssues: NgRxSetupConfiguration.countIssuesByCategory(
          violations,
          suggestions,
          categories.feature
        ),
        propsIssues: NgRxSetupConfiguration.countIssuesByCategory(
          violations,
          suggestions,
          'props'
        ),
      },
    };
  }

  /**
   * Validate analysis prerequisites
   */
  static validateAnalysisPrerequisites(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { canProceed: boolean; issues: string[] } {
    const configValidation =
      NgRxSelectorPatternsConfiguration.validateProjectConfig(
        projectRoot,
        config
      );

    return {
      canProceed: configValidation.isValid,
      issues: [...configValidation.errors, ...configValidation.warnings],
    };
  }
}
