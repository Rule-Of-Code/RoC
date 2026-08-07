import { ObservableCleanup } from '../../observable-cleanup';
import { AngularCleanupConfiguration } from './angular-cleanup-configuration';

/**
 * Angular cleanup validation patterns
 * Meta-dogfooding: Centralized cleanup validation logic for Angular components
 */
export class AngularCleanupValidationPatterns {
  private static readonly Config = AngularCleanupConfiguration;
  /**
   * Validate subscription cleanup patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateSubscriptionCleanup(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzePatterns(content);
    // `takeUntilDestroyed(destroyRef)` / `toSignal()` unsubscribe on destroy —
    // they are the cancellation, not a substitute for it. Without this, a
    // correctly-cleaned component was told it "has no cleanup mechanism" (FE).
    const hasUnsubscribe =
      ObservableCleanup.hasUnsubscribePattern(content) ||
      this.Config.MODERN_CLEANUP.test(this.Config.stripComments(content));

    this.validateBasicSubscriptionCleanup({
      hasSubscriptions: patterns.hasSubscriptions,
      hasOnDestroy: patterns.hasOnDestroy,
      hasUnsubscribe,
      fileName,
      violations,
      suggestions,
    });

    this.validateTakeUntilPattern(patterns, fileName, suggestions);
    this.validateManualSubscriptions(
      patterns,
      content,
      fileName,
      violations,
      suggestions
    );
    this.validateAsyncPipeUsage(
      patterns,
      hasUnsubscribe,
      fileName,
      suggestions
    );
  }

  /**
   * Validate timer cleanup patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateTimerCleanup(
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzePatterns(content);

    if (patterns.hasTimers && !patterns.hasOnDestroy) {
      const message =
        this.Config.VALIDATION_MESSAGES.TIMERS_WITHOUT_ONDESTROY(fileName);
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate event listener cleanup patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateEventListenerCleanup(
    content: string,
    fileName: string,
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzePatterns(content);

    if (patterns.hasEventListeners && !patterns.hasOnDestroy) {
      const message =
        this.Config.VALIDATION_MESSAGES.EVENT_LISTENERS_WITHOUT_CLEANUP(
          fileName
        );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate subject completion patterns
   * Meta-dogfooding: Uses centralized pattern detection and validation messages
   */
  static validateSubjectCompletion(
    content: string,
    fileName: string,
    suggestions: string[]
  ): void {
    const patterns = this.Config.analyzePatterns(content);

    if (
      patterns.hasSubjects &&
      patterns.hasOnDestroy &&
      !patterns.hasSubjectCompletion
    ) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUBJECTS_WITHOUT_COMPLETION(fileName);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate basic subscription cleanup requirements
   */
  private static validateBasicSubscriptionCleanup(params: {
    hasSubscriptions: boolean;
    hasOnDestroy: boolean;
    hasUnsubscribe: boolean;
    fileName: string;
    violations: string[];
    suggestions: string[];
  }): void {
    const {
      hasSubscriptions,
      hasOnDestroy,
      hasUnsubscribe,
      fileName,
      violations,
      suggestions,
    } = params;

    if (hasSubscriptions && !hasOnDestroy) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUBSCRIPTIONS_WITHOUT_ONDESTROY(
          fileName
        );
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }

    if (hasSubscriptions && hasOnDestroy && !hasUnsubscribe) {
      const message =
        this.Config.VALIDATION_MESSAGES.SUBSCRIPTIONS_WITHOUT_CLEANUP(fileName);
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate takeUntil pattern usage
   */
  private static validateTakeUntilPattern(
    patterns: ReturnType<typeof AngularCleanupConfiguration.analyzePatterns>,
    fileName: string,
    suggestions: string[]
  ): void {
    if (patterns.hasTakeUntil && !patterns.hasDestroySubject) {
      const message =
        this.Config.VALIDATION_MESSAGES.TAKEUNTIL_WITHOUT_DESTROY_SUBJECT(
          fileName
        );
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate manual subscription patterns
   */
  private static validateManualSubscriptions(
    patterns: ReturnType<typeof AngularCleanupConfiguration.analyzePatterns>,
    content: string,
    fileName: string,
    violations: string[],
    suggestions: string[]
  ): void {
    if (
      patterns.hasManualSubscriptions &&
      !ObservableCleanup.hasUnsubscribePattern(content)
    ) {
      const message =
        this.Config.VALIDATION_MESSAGES.MANUAL_SUBSCRIPTION_WITHOUT_UNSUBSCRIBE(
          fileName
        );
      violations.push(message.violationMessage);
      suggestions.push(message.suggestionMessage);
    }
  }

  /**
   * Validate async pipe usage recommendations
   */
  private static validateAsyncPipeUsage(
    patterns: ReturnType<typeof AngularCleanupConfiguration.analyzePatterns>,
    hasUnsubscribe: boolean,
    fileName: string,
    suggestions: string[]
  ): void {
    if (
      patterns.hasSubscriptions &&
      !patterns.hasAsyncPipe &&
      !hasUnsubscribe
    ) {
      const message =
        this.Config.VALIDATION_MESSAGES.CONSIDER_ASYNC_PIPE(fileName);
      suggestions.push(message.suggestionMessage);
    }
  }
}
