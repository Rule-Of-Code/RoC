import type { RuleOfCodeConfig } from '../../../config/types';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import type { AngularAnalysisResult } from '../../result-interfaces';
import { ResultFactory } from '../../result-interfaces';
import { AngularConfigurationBase } from '../angular-configuration-base';
import { AngularRoutingConfiguration } from './angular-routing-configuration';

/**
 * Angular Routing Validation Patterns
 * Centralized validation methods for routing configuration analysis
 */
export class AngularRoutingValidationPatterns extends AngularConfigurationBase {
  private static readonly Config = AngularRoutingConfiguration;
  /**
   * Validate all routing configuration patterns in a project
   */
  static validateAllRoutingPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): AngularAnalysisResult {
    const {
      violations,
      suggestions,
      files: routingFiles,
    } = AngularRoutingValidationPatterns.initializeAnalysis(
      projectRoot,
      [...this.Config.ROUTING_PATTERNS.ROUTING_FILE_EXTENSIONS],
      config
    );

    if (routingFiles.length === 0) {
      return ResultFactory.createAngularResult([], []);
    }

    if (routingFiles.length === 0) {
      suggestions.push(
        this.Config.VALIDATION_MESSAGES.NO_ROUTING_MODULES_SUGGESTION
      );
      return ResultFactory.createAngularResult([], suggestions);
    }

    for (const routingFile of routingFiles) {
      this.analyzeRoutingFile(routingFile, violations, suggestions);
    }

    return ResultFactory.createAngularResult(violations, suggestions);
  }

  /**
   * Analyze a single routing file for patterns
   * RULE 1: Cache patterns analysis to eliminate duplicate calls (100% internal coverage)
   * RULE 2: Delegates to private helpers for organized complexity management
   */
  static analyzeRoutingFile(
    routingFile: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const content = FileUtils.readFile(routingFile, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });

    if (!content) {
      return; // Skip empty or unreadable files
    }

    const fileName = PathOperations.getBasename(routingFile);
    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeRoutingPatterns(content);

    // Delegate to private validation helpers with pre-computed patterns (RULE 2)
    this.checkLazyLoadingPatterns(patterns, fileName, violations, suggestions);
    this.checkLoadChildrenSyntax(patterns, fileName, violations, suggestions);
    this.checkPreloadingStrategy(patterns, fileName, violations, suggestions);
    this.checkRouteGuards(patterns, fileName, suggestions);
    this.checkRouteData(patterns, fileName, suggestions);
  }

  private static checkLazyLoadingPatterns(
    patterns: ReturnType<typeof this.Config.analyzeRoutingPatterns>,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasEagerLoading && !patterns.hasLazyLoading) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.NO_LAZY_LOADING_VIOLATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.LAZY_LOADING_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate loadChildren syntax patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkLoadChildrenSyntax(
    patterns: ReturnType<typeof this.Config.analyzeRoutingPatterns>,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasLoadChildren) {
      return;
    }

    this.validateAndReportPattern({
      condition: patterns.hasStringBasedLazy,
      violationMessage:
        this.Config.VALIDATION_MESSAGES.STRING_BASED_LAZY_VIOLATION,
      suggestionMessage:
        this.Config.VALIDATION_MESSAGES.STRING_BASED_LAZY_SUGGESTION,
      fileName,
      violations,
      suggestions,
    });

    this.validateAndReportPattern({
      condition: !patterns.hasDynamicImportSyntax,
      violationMessage:
        this.Config.VALIDATION_MESSAGES.IMPROPER_LAZY_SYNTAX_VIOLATION,
      suggestionMessage:
        this.Config.VALIDATION_MESSAGES.IMPROPER_LAZY_SYNTAX_SUGGESTION,
      fileName,
      violations,
      suggestions,
    });
  }

  /**
   * Helper: Consolidate violation/suggestion reporting
   * RULE 2: Eliminates duplicate push logic
   */
  private static validateAndReportPattern(options: {
    condition: boolean;
    violationMessage: string;
    suggestionMessage: string;
    fileName: string;
    violations: string[];
    suggestions: string[];
  }): void {
    const {
      condition,
      violationMessage,
      suggestionMessage,
      fileName,
      violations,
      suggestions,
    } = options;
    if (condition) {
      violations.push(this.Config.buildMessage(violationMessage, fileName));
      suggestions.push(this.Config.buildMessage(suggestionMessage, fileName));
    }
  }

  /**
   * Helper: Validate preloading strategy and router configuration
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkPreloadingStrategy(
    patterns: ReturnType<typeof this.Config.analyzeRoutingPatterns>,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasRouterForRoot) {
      return;
    }

    if (!patterns.hasPreloadingStrategy) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.PRELOADING_STRATEGY_SUGGESTION,
          fileName
        )
      );
    }

    // Check for enableTracing in production
    if (patterns.hasTracingEnabled) {
      violations.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.TRACING_PRODUCTION_VIOLATION,
          fileName
        )
      );
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.TRACING_PRODUCTION_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate route guard patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkRouteGuards(
    patterns: ReturnType<typeof this.Config.analyzeRoutingPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (!patterns.hasRouteGuards && patterns.hasLoadChildren) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.ROUTE_GUARDS_SUGGESTION,
          fileName
        )
      );
    }
  }

  /**
   * Helper: Validate route data and resolve patterns
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static checkRouteData(
    patterns: ReturnType<typeof this.Config.analyzeRoutingPatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasRouteData && !patterns.hasActivatedRoute) {
      suggestions.push(
        this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.ACTIVATED_ROUTE_SUGGESTION,
          fileName
        )
      );
    }
  }
}
