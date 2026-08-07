import { AngularSignalUsageConfiguration } from './angular-signal-usage-configuration';

/**
 * Angular signal usage validation patterns
 * Meta-dogfooding: Centralized signal usage validation logic for Angular components
 */
export class AngularSignalUsageValidationPatterns {
  private static readonly Config = AngularSignalUsageConfiguration;

  /**
   * Validate all signal usage patterns - master validation method
   * Meta-dogfooding: Orchestrates all validation patterns with centralized utilities
   * RULE 1 dogfooding: Inline validation logic instead of separate wrapper methods
   */
  static validateAllPatterns(
    patterns: ReturnType<
      typeof AngularSignalUsageConfiguration.analyzePatterns
    >,
    suggestions: string[]
  ): void {
    // Subject/BehaviorSubject migration opportunities
    if (patterns.hasSubjectUsage && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_SUBJECT_MIGRATION,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Reactive forms migration opportunities
    if (patterns.hasFormControl && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_REACTIVE_FORMS_MIGRATION,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Component state management with signals
    if (patterns.hasComponentState && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_STATE_MANAGEMENT,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Getter methods that could be computed signals
    if (patterns.hasGetterMethods && !patterns.hasComputedUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_COMPUTED_OVER_GETTERS,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Template optimization opportunities
    if (patterns.hasAsyncPipe && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.CONSIDER_SIGNALS_OVER_ASYNC,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    // Change detection optimization opportunities
    if (patterns.hasChangeDetectorRef && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.ELIMINATE_CHANGE_DETECTION,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }

    if (patterns.hasOnPush && !patterns.hasSignalUsage) {
      const message = this.Config.buildMessageObject(
        this.Config.VALIDATION_MESSAGES.OPTIMIZE_ONPUSH_WITH_SIGNALS,
        patterns.fileName
      );
      suggestions.push(message.suggestionMessage);
    }
  }
}
