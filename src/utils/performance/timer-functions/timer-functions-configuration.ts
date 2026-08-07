/**
 * Timer Functions Configuration
 * Centralized patterns and messages for timer memory leak detection
 * RULE 1: Eliminates hardcoded strings and patterns
 */

import { ANGULAR_CONSTANTS } from '../../angular-constants';

export class TimerFunctionsConfiguration {
  static readonly TIMER_PATTERNS = {
    SET_INTERVAL: /setInterval\(/g,
    SET_TIMEOUT: /setTimeout\(/g,
    CLEAR_INTERVAL: 'clearInterval',
    CLEAR_TIMEOUT: 'clearTimeout',
    TIMER_ASSIGNMENT: /(\w+)\s*=\s*setInterval\([^}]+\}/g,
    TIMEOUT_ASSIGNMENT: /(\w+)\s*=\s*setTimeout\([^}]+\}/g,
    VARIABLE_EXTRACTION: {
      INTERVAL: /(\w+)\s*=\s*setInterval/,
      TIMEOUT: /(\w+)\s*=\s*setTimeout/,
    },
  } as const;

  static readonly RXJS_PATTERNS = {
    INTERVAL_OPERATOR: 'interval()',
    DELAY_OPERATOR: 'delay()',
    RXJS_IMPORT: 'rxjs',
    IMPORT_STATEMENT: 'import',
  } as const;

  static readonly VALIDATION_MESSAGES = {
    setIntervalWithoutClear: (
      file: string,
      pattern: string,
      clearMethod: string
    ) => `${file}: ${pattern} used without ${clearMethod}`,
    missingClearInterval: (variable: string) =>
      `Missing ${TimerFunctionsConfiguration.TIMER_PATTERNS.CLEAR_INTERVAL}(${variable})`,
    missingClearTimeout: (variable: string) =>
      `Missing ${TimerFunctionsConfiguration.TIMER_PATTERNS.CLEAR_TIMEOUT}(${variable})`,
    timerAssignment: (variable: string, type: 'setInterval' | 'setTimeout') =>
      `${variable} = ${type}(...)`,
    cleanupDetected: (variable: string, clearMethod: string) =>
      `${clearMethod}(${variable})`,
  } as const;

  static readonly RECOMMENDATIONS = {
    ALWAYS_CLEAR_TIMERS: `Always clear timers in ${ANGULAR_CONSTANTS.NG_ON_DESTROY} or component cleanup`,
    STORE_TIMER_IDS: 'Store timer IDs for proper cleanup',
    USE_RXJS_OPERATORS:
      'Consider using RxJS interval operators for reactive timer handling',
    USE_TAKE_UNTIL:
      'Use takeUntil pattern to automatically clean up timer subscriptions',
    ADD_CLEAR_INTERVAL: (variable: string) =>
      `Add ${TimerFunctionsConfiguration.TIMER_PATTERNS.CLEAR_INTERVAL}(${variable}) in ${ANGULAR_CONSTANTS.NG_ON_DESTROY}`,
    ADD_CLEAR_TIMEOUT: (variable: string) =>
      `Add ${TimerFunctionsConfiguration.TIMER_PATTERNS.CLEAR_TIMEOUT}(${variable}) in ${ANGULAR_CONSTANTS.NG_ON_DESTROY}`,
    USE_RXJS_INTERVAL:
      'Consider using RxJS interval() operator instead of setInterval for reactive programming',
    USE_RXJS_DELAY:
      'Consider using RxJS delay() operator for asynchronous operations',
  } as const;

  /**
   * Analyze timer patterns in content
   * RULE 1: Uses ANGULAR_CONSTANTS and centralized patterns
   */
  static analyzeTimerPatterns(content: string): {
    hasSetInterval: boolean;
    hasSetTimeout: boolean;
    hasClearInterval: boolean;
    hasClearTimeout: boolean;
    hasNgOnDestroy: boolean;
  } {
    return {
      hasSetInterval: this.TIMER_PATTERNS.SET_INTERVAL.test(content),
      hasSetTimeout: this.TIMER_PATTERNS.SET_TIMEOUT.test(content),
      hasClearInterval: content.includes(this.TIMER_PATTERNS.CLEAR_INTERVAL),
      hasClearTimeout: content.includes(this.TIMER_PATTERNS.CLEAR_TIMEOUT),
      hasNgOnDestroy: content.includes(ANGULAR_CONSTANTS.NG_ON_DESTROY),
    };
  }

  /**
   * Extract timer variable assignments
   * RULE 1: Uses centralized regex patterns
   */
  static extractTimerAssignments(content: string): {
    intervals: string[];
    timeouts: string[];
  } {
    const intervals: string[] = [];
    const timeouts: string[] = [];

    // Extract intervals
    const intervalRegex = new RegExp(
      this.TIMER_PATTERNS.TIMER_ASSIGNMENT.source,
      'g'
    );
    let intervalMatch: RegExpExecArray | null;
    while ((intervalMatch = intervalRegex.exec(content)) !== null) {
      const variableMatch = intervalMatch[0].match(
        this.TIMER_PATTERNS.VARIABLE_EXTRACTION.INTERVAL
      );
      if (variableMatch?.[1]) {
        intervals.push(variableMatch[1]);
      }
    }

    // Extract timeouts
    const timeoutRegex = new RegExp(
      this.TIMER_PATTERNS.TIMEOUT_ASSIGNMENT.source,
      'g'
    );
    let timeoutMatch: RegExpExecArray | null;
    while ((timeoutMatch = timeoutRegex.exec(content)) !== null) {
      const variableMatch = timeoutMatch[0].match(
        this.TIMER_PATTERNS.VARIABLE_EXTRACTION.TIMEOUT
      );
      if (variableMatch?.[1]) {
        timeouts.push(variableMatch[1]);
      }
    }

    return { intervals, timeouts };
  }

  /**
   * Check for RxJS timer usage opportunities
   * RULE 1: Uses centralized RxJS patterns
   */
  static analyzeRxJSOpportunities(content: string): {
    canUseInterval: boolean;
    canUseDelay: boolean;
  } {
    const hasRxJSImport =
      content.includes(this.RXJS_PATTERNS.IMPORT_STATEMENT) &&
      content.includes(this.RXJS_PATTERNS.RXJS_IMPORT);

    return {
      canUseInterval:
        this.TIMER_PATTERNS.SET_INTERVAL.test(content) && hasRxJSImport,
      canUseDelay:
        this.TIMER_PATTERNS.SET_TIMEOUT.test(content) &&
        content.includes('delay'),
    };
  }

  /**
   * Get all timer recommendations
   * RULE 1: Returns centralized recommendations array
   */
  static getAllRecommendations(): string[] {
    return [
      this.RECOMMENDATIONS.ALWAYS_CLEAR_TIMERS,
      this.RECOMMENDATIONS.STORE_TIMER_IDS,
      this.RECOMMENDATIONS.USE_RXJS_OPERATORS,
      this.RECOMMENDATIONS.USE_TAKE_UNTIL,
    ];
  }
}
