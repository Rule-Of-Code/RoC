import { ANGULAR_CONSTANTS, DIRECTORY_NAMES } from '../../constants';

/**
 * Angular OnDestroy Configuration
 * Centralized configuration for OnDestroy implementation patterns analysis
 * Meta-dogfooding: Centralizes hardcoded constants and OnDestroy patterns
 */
export class AngularOnDestroyConfiguration {
  /**
   * Modern Angular cleanup: `takeUntilDestroyed(destroyRef)`, `takeUntil(destroy$)`
   * and `toSignal()` cancel the subscription on destroy just as `ngOnDestroy` +
   * `unsubscribe()` does. A law that does not know them tells a correctly
   * written component it is leaking.
   */
  static readonly MODERN_CLEANUP =
    /takeUntilDestroyed\s*\(|takeUntil\s*\(|DestroyRef\b|toSignal\s*\(/;

  /** Blank out comments (newlines kept) so a mention is not read as code. */
  static stripComments(content: string): string {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
      .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '));
  }

  /**
   * File extensions for OnDestroy analysis
   */
  static readonly ANGULAR_FILE_EXTENSIONS = [
    ANGULAR_CONSTANTS.COMPONENT_TS,
    ANGULAR_CONSTANTS.DIRECTIVE_TS,
    ANGULAR_CONSTANTS.SERVICE_TS,
  ];

  /**
   * Directory configuration for OnDestroy analysis
   */
  static readonly DIRECTORIES = {
    SRC: DIRECTORY_NAMES.SRC,
  };

  /**
   * Helper: Apply fileName placeholder to validation messages
   * RULE 2: Centralized message templating (eliminates duplicate hardcoded messages)
   */
  private static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return message.replace('{fileName}', fileName);
  }

  /**
   * OnDestroy patterns and constants
   */
  static readonly ONDESTROY_PATTERNS = {
    // Interface and method patterns
    IMPLEMENTS_ONDESTROY: /implements OnDestroy|, OnDestroy/,
    NG_ON_DESTROY_METHOD: 'ngOnDestroy()',
    NG_ON_DESTROY_REGEX: /ngOnDestroy\(\)\s*:\s*void\s*{([^}]*)}/,

    // Cleanup patterns
    SUBSCRIBE: /subscribe\(/,
    SET_INTERVAL_TIMEOUT: /setInterval|setTimeout/,
    ADD_EVENT_LISTENER: /addEventListener/,
    SUBJECTS: /Subject|BehaviorSubject|ReplaySubject/,

    // Cleanup keywords
    UNSUBSCRIBE: 'unsubscribe',
    COMPLETE: 'complete',
    REMOVE_EVENT_LISTENER: 'removeEventListener',
    CLEAR: 'clear',

    // Destroy pattern
    TAKE_UNTIL: 'takeUntil',
    DESTROY_SUBJECT: 'destroy$',
    DESTROY_NEXT: 'destroy$.next()',
    DESTROY_COMPLETE: 'destroy$.complete()',

    // Subscription array pattern
    SUBSCRIPTION_ARRAY: /Subscription\[\]/,
    SUBSCRIPTION: 'subscription',
    FOR_EACH: 'forEach',

    // Async patterns
    ASYNC: 'async',
    AWAIT: 'await',
  };

  /**
   * File processing configuration
   */
  static readonly FILE_CONFIG = {
    ENCODING: 'utf8' as const,
    FALLBACK_TO_EMPTY: true,
    EMPTY_METHOD_THRESHOLD: 10,
  };

  /**
   * Validation message builders for OnDestroy patterns
   */
  static readonly VALIDATION_MESSAGES = {
    INTERFACE: {
      MISSING_METHOD: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'OnDestroy interface implemented but ngOnDestroy method missing in {fileName}',
          fileName
        ),
      MISSING_INTERFACE: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'ngOnDestroy method found but OnDestroy interface not implemented in {fileName}',
          fileName
        ),
    },

    SUGGESTIONS: {
      IMPLEMENT_METHOD: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Implement ngOnDestroy() method for OnDestroy interface in {fileName}',
          fileName
        ),
      IMPLEMENT_INTERFACE: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Implement OnDestroy interface when using ngOnDestroy in {fileName}',
          fileName
        ),
      EMPTY_METHOD: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'ngOnDestroy method appears empty in {fileName}, ensure proper cleanup',
          fileName
        ),
    },

    CLEANUP: {
      SUBSCRIPTION: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Add subscription cleanup in ngOnDestroy in {fileName}',
          fileName
        ),
      TIMER: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Add timer cleanup in ngOnDestroy in {fileName}',
          fileName
        ),
      EVENT_LISTENER: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Add event listener cleanup in ngOnDestroy in {fileName}',
          fileName
        ),
      SUBJECTS: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Complete subjects in ngOnDestroy in {fileName}',
          fileName
        ),
    },

    PATTERNS: {
      DESTROY_SUBJECT: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Consider using destroy$ subject pattern for takeUntil in {fileName}',
          fileName
        ),
      DESTROY_COMPLETE: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Complete destroy$ subject after calling next() in {fileName}',
          fileName
        ),
      SUBSCRIPTION_ARRAY: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Unsubscribe from all subscriptions in array in {fileName}',
          fileName
        ),
      ASYNC_CLEANUP: (fileName: string): string =>
        AngularOnDestroyConfiguration.applyFileNamePlaceholder(
          'Consider cancellation tokens for async operations in {fileName}',
          fileName
        ),
    },
  };

  /**
   * Analyze OnDestroy patterns in Angular file content
   */
  static analyzeOnDestroyPatterns(
    content: string,
    fileName: string
  ): {
    fileName: string;
    hasOnDestroyInterface: boolean;
    hasNgOnDestroyMethod: boolean;
    hasSubscriptions: boolean;
    hasTimers: boolean;
    hasEventListeners: boolean;
    hasSubjects: boolean;
    hasCleanupKeywords: boolean;
    hasTakeUntil: boolean;
    hasDestroySubject: boolean;
    hasDestroyNext: boolean;
    hasDestroyComplete: boolean;
    hasSubscriptionArray: boolean;
    hasAsync: boolean;
    ngOnDestroyMethodBody?: string;
  } {
    // A comment that MENTIONS `.subscribe()` is documentation, not a
    // subscription; and `takeUntilDestroyed(destroyRef)` / `takeUntil(destroy$)`
    // IS the cancellation path — flagging it pushes teams toward
    // `firstValueFrom`, which does NOT cancel on destroy. That would be a
    // regression, not an improvement (FE).
    content = AngularOnDestroyConfiguration.stripComments(content);

    const hasOnDestroyInterface =
      this.ONDESTROY_PATTERNS.IMPLEMENTS_ONDESTROY.test(content) ||
      AngularOnDestroyConfiguration.MODERN_CLEANUP.test(content);
    const hasNgOnDestroyMethod =
      content.includes(this.ONDESTROY_PATTERNS.NG_ON_DESTROY_METHOD) ||
      AngularOnDestroyConfiguration.MODERN_CLEANUP.test(content);

    // Get method body for analysis
    const ngOnDestroyMatch = content.match(
      this.ONDESTROY_PATTERNS.NG_ON_DESTROY_REGEX
    );
    const ngOnDestroyMethodBody = ngOnDestroyMatch?.[1]?.trim();

    // Check cleanup patterns
    const hasCleanupKeywords =
      content.includes(this.ONDESTROY_PATTERNS.UNSUBSCRIBE) ||
      content.includes(this.ONDESTROY_PATTERNS.COMPLETE) ||
      content.includes(this.ONDESTROY_PATTERNS.REMOVE_EVENT_LISTENER) ||
      content.includes(this.ONDESTROY_PATTERNS.CLEAR);

    return {
      fileName,
      hasOnDestroyInterface,
      hasNgOnDestroyMethod,
      hasSubscriptions: this.ONDESTROY_PATTERNS.SUBSCRIBE.test(content),
      hasTimers: this.ONDESTROY_PATTERNS.SET_INTERVAL_TIMEOUT.test(content),
      hasEventListeners:
        this.ONDESTROY_PATTERNS.ADD_EVENT_LISTENER.test(content),
      hasSubjects: this.ONDESTROY_PATTERNS.SUBJECTS.test(content),
      hasCleanupKeywords,
      hasTakeUntil: content.includes(this.ONDESTROY_PATTERNS.TAKE_UNTIL),
      hasDestroySubject: content.includes(
        this.ONDESTROY_PATTERNS.DESTROY_SUBJECT
      ),
      hasDestroyNext: content.includes(this.ONDESTROY_PATTERNS.DESTROY_NEXT),
      hasDestroyComplete: content.includes(
        this.ONDESTROY_PATTERNS.DESTROY_COMPLETE
      ),
      hasSubscriptionArray:
        this.ONDESTROY_PATTERNS.SUBSCRIPTION_ARRAY.test(content) ||
        content.includes(this.ONDESTROY_PATTERNS.SUBSCRIPTION),
      hasAsync:
        content.includes(this.ONDESTROY_PATTERNS.ASYNC) &&
        content.includes(this.ONDESTROY_PATTERNS.AWAIT),
      ngOnDestroyMethodBody,
    };
  }

  /**
   * Build cleanup suggestions based on patterns
   */
  static buildCleanupSuggestions(
    patterns: ReturnType<
      typeof AngularOnDestroyConfiguration.analyzeOnDestroyPatterns
    >
  ): string[] {
    const suggestions: string[] = [];

    if (!patterns.hasNgOnDestroyMethod) return suggestions;

    const cleanupNeeds = [
      {
        condition: patterns.hasSubscriptions,
        message: this.VALIDATION_MESSAGES.CLEANUP.SUBSCRIPTION(
          patterns.fileName
        ),
      },
      {
        condition: patterns.hasTimers,
        message: this.VALIDATION_MESSAGES.CLEANUP.TIMER(patterns.fileName),
      },
      {
        condition: patterns.hasEventListeners,
        message: this.VALIDATION_MESSAGES.CLEANUP.EVENT_LISTENER(
          patterns.fileName
        ),
      },
      {
        condition: patterns.hasSubjects,
        message: this.VALIDATION_MESSAGES.CLEANUP.SUBJECTS(patterns.fileName),
      },
    ];

    for (const { condition, message } of cleanupNeeds) {
      if (condition && !patterns.hasCleanupKeywords) {
        suggestions.push(message);
      }
    }

    return suggestions;
  }
}
