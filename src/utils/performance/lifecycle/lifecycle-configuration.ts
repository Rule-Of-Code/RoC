/**
 * Lifecycle Configuration
 * Centralized patterns, messages and thresholds for lifecycle management analysis
 * RULE 1: Uses ANGULAR_CONSTANTS to avoid hardcoded strings
 */

import { ANGULAR_CONSTANTS } from '../../angular-constants';
import { SignalConfigurationBase } from '../../angular/signal-configuration-base';
import { PatternMatchingUtils } from '../../pattern-matching-utils';

export class LifecycleConfiguration extends SignalConfigurationBase {
  static readonly LIFECYCLE_PATTERNS = {
    SUBSCRIBE: ANGULAR_CONSTANTS.SUBSCRIBE,
    ON_DESTROY: `${ANGULAR_CONSTANTS.NG_ON_DESTROY}()`,
    SET_INTERVAL: ANGULAR_CONSTANTS.SET_INTERVAL,
    CLEAR_INTERVAL: ANGULAR_CONSTANTS.CLEAR_INTERVAL,
    TAKE_UNTIL: ANGULAR_CONSTANTS.TAKE_UNTIL,
    VIEW_CHILD: ANGULAR_CONSTANTS.VIEW_CHILD,
    ADD_EVENT_LISTENER: ANGULAR_CONSTANTS.ADD_EVENT_LISTENER,
    ASYNC_PIPE: ANGULAR_CONSTANTS.ASYNC_PIPE,
    OBSERVABLE: ANGULAR_CONSTANTS.OBSERVABLE,
  } as const;

  static readonly CLEANUP_PATTERNS = {
    SUBSCRIPTION_CLEANUP: 'Subscription cleanup',
    INTERVAL_CLEANUP: 'Interval cleanup',
    EVENT_LISTENER_CLEANUP: 'Event listener cleanup',
  } as const;

  static readonly ONDESTROY_METHOD_REGEX = /ngOnDestroy\(\)[^{]*{([^}]+)}/;

  /**
   * Build validation message from VALIDATION_MESSAGES with fileName
   * RULE 2: Convenience method for direct message access
   */
  static buildValidationMessage(
    messageKey: keyof typeof LifecycleConfiguration.VALIDATION_MESSAGES,
    fileName: string
  ): string {
    return this.buildMessage(this.VALIDATION_MESSAGES[messageKey], fileName);
  }

  /**
   * Build suggestion message from SUGGESTIONS with fileName
   * RULE 2: Convenience method for direct suggestion access
   */
  static buildSuggestionMessage(
    suggestionKey: keyof typeof LifecycleConfiguration.SUGGESTIONS,
    fileName: string
  ): string {
    return this.buildMessage(this.SUGGESTIONS[suggestionKey], fileName);
  }

  static readonly VALIDATION_MESSAGES = {
    NO_ONDESTROY_WITH_SUBSCRIPTIONS:
      'Component {fileName} has subscriptions but no ngOnDestroy',
    MISSING_CLEANUP_IN_ONDESTROY:
      'Missing cleanup in ngOnDestroy in {fileName}',
    SETINTERVAL_WITHOUT_CLEAR:
      'setInterval without corresponding clearInterval in {fileName}',
    MISSING_SUBSCRIPTION_CLEANUP: 'Missing subscription cleanup in {fileName}',
    MISSING_INTERVAL_CLEANUP: 'Missing interval cleanup in {fileName}',
    MISSING_EVENT_LISTENER_CLEANUP:
      'Missing event listener cleanup in {fileName}',
  } as const;

  static readonly SUGGESTIONS = {
    IMPLEMENT_ONDESTROY:
      'Implement OnDestroy interface and ngOnDestroy method in {fileName}',
    CLEAR_INTERVALS: 'Clear intervals in ngOnDestroy in {fileName}',
    USE_TAKEUNTIL:
      'Consider using takeUntil pattern for automatic subscription management in {fileName}',
    CLEANUP_VIEWCHILD:
      'Implement ngOnDestroy to clean up ViewChild references in {fileName}',
    USE_ASYNC_PIPE:
      'Consider using async pipe in templates to avoid manual subscription management in {fileName}',
  } as const;

  static readonly RECOMMENDATIONS = [
    'Unsubscribe from observables in ngOnDestroy',
    'Clear timers and intervals in ngOnDestroy',
    'Clean up ViewChild references by setting them to null',
    'Remove event listeners in ngOnDestroy',
    'Consider using async pipe to avoid manual subscription management',
  ] as const;

  /**
   * Analyzes content for lifecycle patterns
   * RULE 1: Centralized pattern analysis (single source of truth)
   */
  static analyzeLifecyclePatterns(content: string): {
    hasSubscribe: boolean;
    hasOnDestroy: boolean;
    hasSetInterval: boolean;
    hasClearInterval: boolean;
    hasTakeUntil: boolean;
    hasViewChild: boolean;
    hasAddEventListener: boolean;
    hasAsyncPipe: boolean;
    hasObservable: boolean;
  } {
    return {
      hasSubscribe: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.SUBSCRIBE
      ),
      hasOnDestroy: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.ON_DESTROY
      ),
      hasSetInterval: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.SET_INTERVAL
      ),
      hasClearInterval: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.CLEAR_INTERVAL
      ),
      hasTakeUntil: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.TAKE_UNTIL
      ),
      hasViewChild: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.VIEW_CHILD
      ),
      hasAddEventListener: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.ADD_EVENT_LISTENER
      ),
      hasAsyncPipe: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.ASYNC_PIPE
      ),
      hasObservable: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.OBSERVABLE
      ),
    };
  }

  /**
   * Extracts ngOnDestroy method content
   * RULE 1: Centralized extraction logic using PatternMatchingUtils
   */
  static extractOnDestroyContent(content: string): string | null {
    const matches = PatternMatchingUtils.extractMatches(
      content,
      this.ONDESTROY_METHOD_REGEX
    );
    return matches[0]?.match(this.ONDESTROY_METHOD_REGEX)?.[1] ?? null;
  }

  /**
   * Checks for cleanup patterns in content
   * RULE 1: Centralized cleanup pattern detection
   */
  static getCleanupChecks(): Array<{
    pattern: string;
    cleanup: string;
    message: string;
  }> {
    return [
      {
        pattern: this.LIFECYCLE_PATTERNS.SUBSCRIBE,
        cleanup: this.CLEANUP_PATTERNS.SUBSCRIPTION_CLEANUP,
        message: this.VALIDATION_MESSAGES.MISSING_SUBSCRIPTION_CLEANUP,
      },
      {
        pattern: this.LIFECYCLE_PATTERNS.SET_INTERVAL,
        cleanup: this.CLEANUP_PATTERNS.INTERVAL_CLEANUP,
        message: this.VALIDATION_MESSAGES.MISSING_INTERVAL_CLEANUP,
      },
      {
        pattern: this.LIFECYCLE_PATTERNS.ADD_EVENT_LISTENER,
        cleanup: this.CLEANUP_PATTERNS.EVENT_LISTENER_CLEANUP,
        message: this.VALIDATION_MESSAGES.MISSING_EVENT_LISTENER_CLEANUP,
      },
    ];
  }
}
