import { ANGULAR_CONSTANTS } from '../../constants';

/**
 * Angular cleanup patterns configuration
 * Meta-dogfooding: Centralized cleanup patterns configuration for Angular components
 */
export class AngularCleanupConfiguration {
  /**
   * Modern Angular cancellation paths. `takeUntilDestroyed(destroyRef)`,
   * `takeUntil(destroy$)` and `toSignal()` unsubscribe on destroy exactly as
   * `ngOnDestroy` + `unsubscribe()` does — a law that does not know them tells
   * a correctly written component that it leaks.
   */
  static readonly MODERN_CLEANUP =
    /takeUntilDestroyed\s*\(|DestroyRef\b|toSignal\s*\(/;

  /** Blank out comments (newlines kept) so a mention is not read as code. */
  static stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '));
  }

  /**
   * Angular file extensions for cleanup analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
    ANGULAR_CONSTANTS.DIRECTIVE_TS,
    ANGULAR_CONSTANTS.SERVICE_TS,
  ] as const;

  /**
   * Cleanup validation messages - eliminates hardcoded strings
   */
  static readonly VALIDATION_MESSAGES = {
    SUBSCRIPTIONS_WITHOUT_ONDESTROY: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Subscriptions found but ${ANGULAR_CONSTANTS.ON_DESTROY} not implemented in ${fileName}`,
      suggestionMessage: `Implement ${ANGULAR_CONSTANTS.ON_DESTROY} interface for subscription cleanup in ${fileName}`,
    }),

    SUBSCRIPTIONS_WITHOUT_CLEANUP: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Subscriptions found but no cleanup mechanism in ${ANGULAR_CONSTANTS.NG_ON_DESTROY} in ${fileName}`,
      suggestionMessage: `Add ${ANGULAR_CONSTANTS.UNSUBSCRIBE} or ${ANGULAR_CONSTANTS.TAKE_UNTIL}() for subscription cleanup in ${fileName}`,
    }),

    TIMERS_WITHOUT_ONDESTROY: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Timers found but ${ANGULAR_CONSTANTS.ON_DESTROY} not implemented in ${fileName}`,
      suggestionMessage: `Implement ${ANGULAR_CONSTANTS.ON_DESTROY} to clear timers in ${fileName}`,
    }),

    EVENT_LISTENERS_WITHOUT_CLEANUP: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: `Event listeners should be cleaned up in ${ANGULAR_CONSTANTS.NG_ON_DESTROY} in ${fileName}`,
    }),

    SUBJECTS_WITHOUT_COMPLETION: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: `Complete subjects in ${ANGULAR_CONSTANTS.NG_ON_DESTROY} to prevent memory leaks in ${fileName}`,
    }),

    TAKEUNTIL_WITHOUT_DESTROY_SUBJECT: (
      fileName: string
    ): { suggestionMessage: string } => ({
      suggestionMessage: `Consider using ${ANGULAR_CONSTANTS.DESTROY_SUBJECT} subject with ${ANGULAR_CONSTANTS.TAKE_UNTIL} pattern in ${fileName}`,
    }),

    MANUAL_SUBSCRIPTION_WITHOUT_UNSUBSCRIBE: (
      fileName: string
    ): { violationMessage: string; suggestionMessage: string } => ({
      violationMessage: `Manual ${ANGULAR_CONSTANTS.SUBSCRIPTION} without ${ANGULAR_CONSTANTS.UNSUBSCRIBE} in ${fileName}`,
      suggestionMessage: `Call ${ANGULAR_CONSTANTS.UNSUBSCRIBE} in ${ANGULAR_CONSTANTS.NG_ON_DESTROY} for manual subscriptions in ${fileName}`,
    }),

    CONSIDER_ASYNC_PIPE: (fileName: string): { suggestionMessage: string } => ({
      suggestionMessage: `Consider using async pipe or proper unsubscription pattern in ${fileName}`,
    }),
  };

  /**
   * Cleanup pattern detectors - centralized detection logic
   */
  static readonly PATTERN_DETECTORS = {
    /**
     * Check if content has subscriptions
     */
    hasSubscriptions: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.SUBSCRIBE) ||
      content.includes(ANGULAR_CONSTANTS.PIPE_SYNTAX),

    /**
     * Check if content implements OnDestroy
     */
    hasOnDestroy: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.IMPLEMENTS_ON_DESTROY) ||
      content.includes(ANGULAR_CONSTANTS.NG_ON_DESTROY),

    /**
     * Check if content has timers
     */
    hasTimers: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.SET_INTERVAL) ||
      content.includes(ANGULAR_CONSTANTS.SET_TIMEOUT) ||
      content.includes(ANGULAR_CONSTANTS.TIMER) ||
      content.includes(ANGULAR_CONSTANTS.INTERVAL),

    /**
     * Check if content has event listeners
     */
    hasEventListeners: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.ADD_EVENT_LISTENER) ||
      content.includes(ANGULAR_CONSTANTS.FROM_EVENT),

    /**
     * Check if content has subjects
     */
    hasSubjects: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.SUBJECT),

    /**
     * Check if content has subject completion
     */
    hasSubjectCompletion: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.COMPLETE),

    /**
     * Check if content has takeUntil pattern
     */
    hasTakeUntil: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.TAKE_UNTIL),

    /**
     * Check if content has destroy subject
     */
    hasDestroySubject: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.DESTROY_SUBJECT),

    /**
     * Check if content has manual subscriptions
     */
    hasManualSubscriptions: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.SUBSCRIPTION) &&
      content.includes(ANGULAR_CONSTANTS.SUBSCRIBE),

    /**
     * Check if content has async pipe
     */
    hasAsyncPipe: (content: string): boolean =>
      content.includes(ANGULAR_CONSTANTS.ASYNC_PIPE),
  };

  /**
   * Get all pattern detection results for content
   * Meta-dogfooding: Centralized pattern analysis
   */
  static analyzePatterns(content: string): {
    hasSubscriptions: boolean;
    hasOnDestroy: boolean;
    hasTimers: boolean;
    hasEventListeners: boolean;
    hasSubjects: boolean;
    hasSubjectCompletion: boolean;
    hasTakeUntil: boolean;
    hasDestroySubject: boolean;
    hasManualSubscriptions: boolean;
    hasAsyncPipe: boolean;
  } {
    // Two lies this analyzer used to tell (FE, v7.9.0):
    //   1. A comment that MENTIONS `.subscribe()` — "use async pipe instead of
    //      a manual .subscribe()" — was read as a subscription. Blank comments.
    //   2. `takeUntilDestroyed(destroyRef)` / `toSignal()` cancel on destroy;
    //      they ARE the cleanup. Calling them "missing OnDestroy" pushes teams
    //      toward `firstValueFrom`, which does NOT cancel on destroy — that is
    //      a regression, not an improvement. Count them as cleanup.
    content = AngularCleanupConfiguration.stripComments(content);
    const modernCleanup = AngularCleanupConfiguration.MODERN_CLEANUP.test(content);

    return {
      hasSubscriptions: this.PATTERN_DETECTORS.hasSubscriptions(content),
      hasOnDestroy:
        this.PATTERN_DETECTORS.hasOnDestroy(content) || modernCleanup,
      hasTimers: this.PATTERN_DETECTORS.hasTimers(content),
      hasEventListeners: this.PATTERN_DETECTORS.hasEventListeners(content),
      hasSubjects: this.PATTERN_DETECTORS.hasSubjects(content),
      hasSubjectCompletion:
        this.PATTERN_DETECTORS.hasSubjectCompletion(content),
      hasTakeUntil: this.PATTERN_DETECTORS.hasTakeUntil(content),
      hasDestroySubject: this.PATTERN_DETECTORS.hasDestroySubject(content),
      hasManualSubscriptions:
        this.PATTERN_DETECTORS.hasManualSubscriptions(content),
      hasAsyncPipe: this.PATTERN_DETECTORS.hasAsyncPipe(content),
    };
  }
}
