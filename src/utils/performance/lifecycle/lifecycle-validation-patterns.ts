/**
 * Lifecycle Validation Patterns
 * Complete validation workflow for lifecycle management analysis
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated patterns
 */

import { ObservableCleanup } from '../../observable-cleanup';
import { LifecycleConfiguration } from './lifecycle-configuration';

export class LifecycleValidationPatterns {
  private static readonly Config = LifecycleConfiguration;

  /**
   * Master orchestrator method - validates all lifecycle patterns
   * RULE 1: Single entry point for validation workflow
   * RULE 2: Pre-computes patterns to avoid duplicate analysis
   */
  static validateLifecycleManagement(content: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeLifecyclePatterns(content);

    // Delegate to private validation helpers with pre-computed patterns (RULE 2)
    this.validateOnDestroyImplementation(patterns, violations, suggestions);
    this.validateIntervalCleanup(patterns, violations, suggestions);

    // Analyze OnDestroy implementation details with pre-computed patterns (RULE 2)
    const destructorAnalysis = this.analyzeOnDestroyImplementation(
      content,
      patterns
    );
    this.validateMissingCleanups(destructorAnalysis, violations, suggestions);

    // Add general suggestions based on patterns (RULE 2)
    const cleanupSuggestions = this.generateCleanupSuggestions(patterns);
    suggestions.push(...cleanupSuggestions);

    return { violations, suggestions };
  }

  /**
   * Helper: Validate OnDestroy implementation
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static validateOnDestroyImplementation(
    patterns: ReturnType<
      typeof LifecycleConfiguration.analyzeLifecyclePatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasSubscribe && !patterns.hasOnDestroy) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.NO_ONDESTROY_WITH_SUBSCRIPTIONS
      );
      suggestions.push(this.Config.SUGGESTIONS.IMPLEMENT_ONDESTROY);
    }
  }

  /**
   * Helper: Validate interval cleanup
   * RULE 1: Uses pre-computed patterns
   * RULE 2: Private focused validation method
   */
  private static validateIntervalCleanup(
    patterns: ReturnType<
      typeof LifecycleConfiguration.analyzeLifecyclePatterns
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (patterns.hasSetInterval && !patterns.hasClearInterval) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.SETINTERVAL_WITHOUT_CLEAR
      );
      suggestions.push(this.Config.SUGGESTIONS.CLEAR_INTERVALS);
    }
  }

  /**
   * Helper: Validate missing cleanups
   * RULE 2: Private helper for organized validation
   */
  private static validateMissingCleanups(
    destructorAnalysis: ReturnType<
      typeof LifecycleValidationPatterns.analyzeOnDestroyImplementation
    >,
    violations: string[],
    suggestions: string[]
  ): void {
    if (destructorAnalysis.missingCleanups.length > 0) {
      violations.push(
        this.Config.VALIDATION_MESSAGES.MISSING_CLEANUP_IN_ONDESTROY
      );
      suggestions.push(...destructorAnalysis.missingCleanups);
    }
  }

  /**
   * Analyzes OnDestroy implementation details
   * RULE 1: Uses Configuration's extraction methods
   * RULE 2: Uses pre-computed patterns to avoid duplicate analysis
   */
  static analyzeOnDestroyImplementation(
    content: string,
    patterns: ReturnType<typeof LifecycleConfiguration.analyzeLifecyclePatterns>
  ): {
    hasOnDestroy: boolean;
    hasCleanupCode: boolean;
    cleanupActions: string[];
    missingCleanups: string[];
  } {
    const cleanupActions = this.extractCleanupActions(content);
    const missingCleanups = this.findMissingCleanups(patterns, cleanupActions);

    return {
      hasOnDestroy: patterns.hasOnDestroy,
      hasCleanupCode: cleanupActions.length > 0,
      cleanupActions,
      missingCleanups,
    };
  }

  /**
   * Helper: Extract cleanup actions from ngOnDestroy
   * RULE 1: Uses Configuration's extraction method
   * RULE 2: Private helper for focused extraction
   */
  private static extractCleanupActions(content: string): string[] {
    const cleanupActions: string[] = [];

    // Extract ngOnDestroy method content using Configuration (RULE 1)
    const onDestroyContent = this.Config.extractOnDestroyContent(content);
    if (!onDestroyContent) {
      return cleanupActions;
    }

    // Detect cleanup patterns using ObservableCleanup utility (RULE 1)
    const detectedPatterns =
      ObservableCleanup.detectCleanupPatterns(onDestroyContent);
    cleanupActions.push(...detectedPatterns);

    return cleanupActions;
  }

  /**
   * Helper: Find missing cleanup patterns
   * RULE 1: Uses Configuration's cleanup checks
   * RULE 2: Uses pre-computed patterns to avoid duplicate analysis
   */
  private static findMissingCleanups(
    patterns: ReturnType<
      typeof LifecycleConfiguration.analyzeLifecyclePatterns
    >,
    cleanupActions: string[]
  ): string[] {
    const missingCleanups: string[] = [];

    // Check subscriptions cleanup (RULE 1 - use pre-computed patterns)
    if (
      patterns.hasSubscribe &&
      !cleanupActions.includes(
        this.Config.CLEANUP_PATTERNS.SUBSCRIPTION_CLEANUP
      )
    ) {
      missingCleanups.push(
        this.Config.VALIDATION_MESSAGES.MISSING_SUBSCRIPTION_CLEANUP
      );
    }

    // Check intervals cleanup (RULE 1 - use pre-computed patterns)
    if (
      patterns.hasSetInterval &&
      !cleanupActions.includes(this.Config.CLEANUP_PATTERNS.INTERVAL_CLEANUP)
    ) {
      missingCleanups.push(
        this.Config.VALIDATION_MESSAGES.MISSING_INTERVAL_CLEANUP
      );
    }

    // Check event listeners cleanup (RULE 1 - use pre-computed patterns)
    if (
      patterns.hasAddEventListener &&
      !cleanupActions.includes(
        this.Config.CLEANUP_PATTERNS.EVENT_LISTENER_CLEANUP
      )
    ) {
      missingCleanups.push(
        this.Config.VALIDATION_MESSAGES.MISSING_EVENT_LISTENER_CLEANUP
      );
    }

    return missingCleanups;
  }

  /**
   * Helper: Generate cleanup suggestions
   * RULE 1: Uses pre-computed patterns
   * RULE 2: Private helper for organized suggestion generation
   */
  private static generateCleanupSuggestions(
    patterns: ReturnType<typeof LifecycleConfiguration.analyzeLifecyclePatterns>
  ): string[] {
    const suggestions: string[] = [];

    // Analyze current patterns and suggest improvements (RULE 1)
    if (patterns.hasSubscribe && !patterns.hasTakeUntil) {
      suggestions.push(this.Config.SUGGESTIONS.USE_TAKEUNTIL);
    }

    if (patterns.hasViewChild && !patterns.hasOnDestroy) {
      suggestions.push(this.Config.SUGGESTIONS.CLEANUP_VIEWCHILD);
    }

    if (patterns.hasObservable && !patterns.hasAsyncPipe) {
      suggestions.push(this.Config.SUGGESTIONS.USE_ASYNC_PIPE);
    }

    return suggestions;
  }

  /**
   * Generate cleanup suggestions (public version)
   * RULE 2: Pre-computes patterns and delegates to private helper
   */
  static generateCleanupSuggestionsPublic(content: string): string[] {
    const patterns = this.Config.analyzeLifecyclePatterns(content);
    return this.generateCleanupSuggestions(patterns);
  }
}
