import type { RuleOfCodeConfig } from '../../../config/types';
import { RxJSFileDiscovery } from '../rxjs-file-discovery';
import {
  type AnalysisResult,
  DeprecatedOperatorAnalyzer,
  FlatteningOperatorAnalyzer,
  TransformationOperatorAnalyzer,
} from './rxjs-operator-analyzers';
import { RxJSOperatorUsageConfiguration } from './rxjs-operator-usage-configuration';

// Re-export for backward compatibility
export type { AnalysisResult };

/**
 * RxJS Operator Usage Validation Orchestrator
 * Single Responsibility: Coordinate analysis workflow and aggregate results
 *
 * Delegates to:
 * - RxJSFileDiscovery: Find NgRx files
 * - FlatteningOperatorAnalyzer: switchMap/exhaustMap analysis
 * - DeprecatedOperatorAnalyzer: deprecated operators detection
 * - TransformationOperatorAnalyzer: transformation patterns
 */
export class RxJSOperatorUsageValidation {
  /**
   * Execute complete RxJS operator usage analysis workflow
   */
  static executeAnalysisWorkflow(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AnalysisResult {
    // Validate configuration
    const validation = RxJSOperatorUsageConfiguration.validateProjectConfig(
      projectRoot,
      config
    );
    if (!validation.isValid) {
      return { violations: validation.errors, suggestions: [] };
    }

    // Discover NgRx files
    const ngrxFiles = RxJSFileDiscovery.findNgRxFiles(projectRoot, config);
    if (ngrxFiles.length === 0) {
      return {
        violations: [],
        suggestions: ['No NgRx effects files found for operator analysis'],
      };
    }

    // Execute analysis and deduplicate
    const results = this.runAnalyzers(ngrxFiles);
    return {
      violations: [...new Set(results.violations)],
      suggestions: [...new Set(results.suggestions)],
    };
  }

  /** Run enabled analyzers and merge results */
  private static runAnalyzers(files: string[]): AnalysisResult {
    const results: AnalysisResult[] = [];

    results.push(FlatteningOperatorAnalyzer.analyze(files));
    results.push(DeprecatedOperatorAnalyzer.analyze(files));
    results.push(TransformationOperatorAnalyzer.analyze(files));

    return {
      violations: results.flatMap(r => r.violations),
      suggestions: results.flatMap(r => r.suggestions),
    };
  }

  /** Get analysis summary with severity */
  static getAnalysisSummary(results: AnalysisResult): {
    totalIssues: number;
    violationsCount: number;
    suggestionsCount: number;
    severity: 'high' | 'low' | 'medium';
    operatorAreas: Record<string, number>;
  } {
    const { violations, suggestions } = results;
    const allIssues = [...violations, ...suggestions];

    const countByArea = (area: string) =>
      allIssues.filter(i => i.toLowerCase().includes(area)).length;

    return {
      totalIssues: allIssues.length,
      violationsCount: violations.length,
      suggestionsCount: suggestions.length,
      severity:
        violations.length > 8
          ? 'high'
          : violations.length > 3
            ? 'medium'
            : 'low',
      operatorAreas: {
        flattening: countByArea('flattening'),
        deprecated: countByArea('deprecated'),
        transformation: countByArea('transformation'),
        errorHandling: countByArea('error'),
      },
    };
  }

  /** Validate prerequisites before analysis */
  static validatePrerequisites(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { canProceed: boolean; issues: string[] } {
    const validation = RxJSOperatorUsageConfiguration.validateProjectConfig(
      projectRoot,
      config
    );
    return {
      canProceed: validation.isValid,
      issues: [...validation.errors, ...validation.warnings],
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Legacy API (backward compatibility - delegates to new classes)
  // ─────────────────────────────────────────────────────────────

  /** @deprecated Use FlatteningOperatorAnalyzer.analyze() */
  static analyzeFlatteningOperators(files: string[]): AnalysisResult {
    return FlatteningOperatorAnalyzer.analyze(files);
  }

  /** @deprecated Use DeprecatedOperatorAnalyzer.analyze() */
  static analyzeDeprecatedOperators(files: string[]): AnalysisResult {
    return DeprecatedOperatorAnalyzer.analyze(files);
  }

  /** @deprecated Use TransformationOperatorAnalyzer.analyze() */
  static analyzeTransformationOperators(files: string[]): AnalysisResult {
    return TransformationOperatorAnalyzer.analyze(files);
  }

  /** @deprecated Use getAnalysisSummary() */
  static getOperatorAnalysisSummary(results: AnalysisResult) {
    const summary = this.getAnalysisSummary(results);
    return {
      ...summary,
      analysisComplete: true,
      operatorAreas: {
        flatteningIssues: summary.operatorAreas.flattening,
        deprecatedIssues: summary.operatorAreas.deprecated,
        transformationIssues: summary.operatorAreas.transformation,
        errorHandlingIssues: summary.operatorAreas.errorHandling,
      },
    };
  }

  /** @deprecated Use validatePrerequisites() */
  static validateAnalysisPrerequisites(
    projectRoot: string,
    config: RuleOfCodeConfig
  ) {
    return this.validatePrerequisites(projectRoot, config);
  }
}
