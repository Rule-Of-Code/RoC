import { AngularSignalConfiguration } from './angular-signal-configuration';

/**
 * Angular signal validation patterns
 * Meta-dogfooding: Centralized signal validation logic for Angular components
 */
export class AngularSignalValidationPatterns {
  private static readonly Config = AngularSignalConfiguration;

  /**
   * Validate all signal patterns - master validation method
   * Meta-dogfooding: Orchestrates all validation patterns with centralized utilities
   * RULE 1 dogfooding: Inline all validation logic with helper methods for complexity
   */
  static validateAllPatterns(
    patterns: ReturnType<typeof AngularSignalConfiguration.analyzePatterns>,
    violations: string[],
    suggestions: string[],
    content: string,
    config: { thresholds?: { angular?: { maxSignalMutations?: number } } }
  ): void {
    this.validateSignalUsagePatterns(patterns, violations, suggestions);
    this.validateComputedUsagePatterns(
      patterns,
      violations,
      suggestions,
      content
    );
    this.validateEffectUsagePatterns(patterns, suggestions, content);
    this.validateSignalMutabilityPatterns(patterns, suggestions, config);
  }

  /**
   * Validate signal usage patterns - helper method
   */
  private static validateSignalUsagePatterns(
    patterns: ReturnType<typeof AngularSignalConfiguration.analyzePatterns>,
    violations: string[],
    suggestions: string[]
  ): void {
    if (!patterns.hasSignal) return;

    // Signal initialization validation
    for (const signalInit of patterns.signalInitializations) {
      if (signalInit === this.Config.SIGNAL_PATTERNS.SIGNAL_CALL) {
        const message = this.Config.buildMessageObject(
          this.Config.VALIDATION_MESSAGES.SIGNAL_WITHOUT_VALUE,
          patterns.fileName
        );
        violations.push(message.violationMessage);
        suggestions.push(message.suggestionMessage);
      }
    }

    // Readonly signal validation
    if (!patterns.hasReadonly) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_READONLY_SIGNALS,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Signal typing validation
    if (!patterns.hasExplicitTyping) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_EXPLICIT_TYPING,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate computed usage patterns - helper method
   */
  private static validateComputedUsagePatterns(
    patterns: ReturnType<typeof AngularSignalConfiguration.analyzePatterns>,
    violations: string[],
    suggestions: string[],
    content: string
  ): void {
    if (!patterns.hasComputed) return;

    // Computed dependencies validation
    if (
      this.Config.PATTERN_DETECTORS.CHECK_COMPUTED_WITHOUT_DEPENDENCIES(content)
    ) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.COMPUTED_WITHOUT_DEPENDENCIES,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Computed purity validation (no side effects)
    if (patterns.computedBlocks.length > 0) {
      const hasSideEffects =
        this.Config.PATTERN_DETECTORS.CHECK_SIDE_EFFECTS_IN_COMPUTED(
          patterns.computedBlocks
        );

      if (hasSideEffects) {
        const message = this.Config.buildMessageObject(
          this.Config.VALIDATION_MESSAGES.COMPUTED_WITH_SIDE_EFFECTS,
          patterns.fileName
        );
        violations.push(message.violationMessage);
        suggestions.push(message.suggestionMessage);
      }
    }
  }

  /**
   * Validate effect usage patterns - helper method
   */
  private static validateEffectUsagePatterns(
    patterns: ReturnType<typeof AngularSignalConfiguration.analyzePatterns>,
    suggestions: string[],
    content: string
  ): void {
    if (!patterns.hasEffect) return;

    // Effect cleanup validation
    if (!patterns.hasOnDestroy) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.EFFECT_WITHOUT_CLEANUP,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Effect placement validation (not in constructor)
    if (this.Config.PATTERN_DETECTORS.CHECK_EFFECT_IN_CONSTRUCTOR(content)) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.EFFECT_IN_CONSTRUCTOR,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate signal mutability patterns - helper method
   */
  private static validateSignalMutabilityPatterns(
    patterns: ReturnType<typeof AngularSignalConfiguration.analyzePatterns>,
    suggestions: string[],
    config: { thresholds?: { angular?: { maxSignalMutations?: number } } }
  ): void {
    // Consistent update pattern validation
    if (patterns.hasUpdate && patterns.hasSet) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.INCONSISTENT_UPDATE_PATTERN,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Excessive mutations validation
    if (patterns.hasSignal && patterns.hasSet) {
      const thresholds = this.Config.getThresholds(config);
      if (patterns.signalMutations.length > thresholds.MAX_MUTATIONS) {
        const message = this.Config.buildMessageObject(
          this.Config.VALIDATION_MESSAGES.EXCESSIVE_MUTATIONS,
          patterns.fileName
        );
        suggestions.push(message.suggestionMessage);
      }
    }

    // Signal equality validation
    if (patterns.hasComplexObjects && !patterns.hasEqualityFunction) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_EQUALITY_FUNCTION,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }
  }
}
