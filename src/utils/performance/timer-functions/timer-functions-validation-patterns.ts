/**
 * Timer Functions Validation Patterns
 * Orchestrates timer memory leak validation workflows
 * RULE 2: Delegates to Configuration, uses private helpers for workflow orchestration
 */

import { FileUtils } from '../../file-utils';
import type { MemoryLeakPatterns } from '../../types/memory.types';
import { TimerFunctionsConfiguration } from './timer-functions-configuration';

export class TimerFunctionsValidationPatterns {
  private static readonly Config = TimerFunctionsConfiguration;

  /**
   * Master orchestrator: Check timer functions for memory leaks
   * RULE 1: Pre-computes patterns from Configuration
   * RULE 2: Delegates to private validation helpers
   */
  static validateTimerFunctions(files: string[]): Partial<MemoryLeakPatterns> {
    // RULE 1: Pre-compute timer patterns
    const timerPatterns = [
      {
        pattern: this.Config.TIMER_PATTERNS.SET_INTERVAL,
        clearMethod: this.Config.TIMER_PATTERNS.CLEAR_INTERVAL,
      },
      {
        pattern: this.Config.TIMER_PATTERNS.SET_TIMEOUT,
        clearMethod: this.Config.TIMER_PATTERNS.CLEAR_TIMEOUT,
      },
    ];

    const setIntervalWithoutClear: string[] = [];

    // RULE 2: Delegate file processing to helper
    files.forEach(file => {
      this.validateFileTimers(file, timerPatterns, setIntervalWithoutClear);
    });

    return {
      setIntervalWithoutClear,
    };
  }

  /**
   * RULE 2: Private helper for file-level timer validation
   */
  private static validateFileTimers(
    file: string,
    timerPatterns: Array<{ pattern: RegExp; clearMethod: string }>,
    violations: string[]
  ): void {
    const content = FileUtils.readFile(file, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    timerPatterns.forEach(({ pattern, clearMethod }) => {
      this.validateTimerPattern(
        file,
        content,
        pattern,
        clearMethod,
        violations
      );
    });
  }

  /**
   * RULE 2: Private helper for pattern-specific validation
   */
  private static validateTimerPattern(
    file: string,
    content: string,
    pattern: RegExp,
    clearMethod: string,
    violations: string[]
  ): void {
    const matches = content.match(pattern);
    if (!matches) return;

    // RULE 1: Use Configuration to analyze patterns
    const analysis = this.Config.analyzeTimerPatterns(content);
    const hasClear =
      clearMethod === this.Config.TIMER_PATTERNS.CLEAR_INTERVAL
        ? analysis.hasClearInterval
        : analysis.hasClearTimeout;

    if (!hasClear && !analysis.hasNgOnDestroy) {
      // RULE 1: Use Configuration message function
      violations.push(
        this.Config.VALIDATION_MESSAGES.setIntervalWithoutClear(
          file,
          pattern.source,
          clearMethod
        )
      );
    }
  }

  /**
   * Analyze detailed timer usage
   * RULE 1: Uses Configuration for pattern extraction
   * RULE 2: Delegates to private helpers for analysis
   */
  static analyzeDetailedTimerUsage(content: string): {
    timers: string[];
    cleanups: string[];
    missingCleanups: string[];
    recommendations: string[];
  } {
    const timers: string[] = [];
    const cleanups: string[] = [];
    const missingCleanups: string[] = [];
    const recommendations: string[] = [];

    // RULE 1: Use Configuration to extract timer assignments
    const assignments = this.Config.extractTimerAssignments(content);

    // RULE 2: Delegate timer analysis to unified helper (eliminates duplication)
    this.analyzeTimers({
      content,
      variables: assignments.intervals,
      timerType: 'setInterval',
      clearPattern: 'clearInterval',
      clearMethod: this.Config.TIMER_PATTERNS.CLEAR_INTERVAL,
      timers,
      cleanups,
      missingCleanups,
      recommendations,
    });

    this.analyzeTimers({
      content,
      variables: assignments.timeouts,
      timerType: 'setTimeout',
      clearPattern: 'clearTimeout',
      clearMethod: this.Config.TIMER_PATTERNS.CLEAR_TIMEOUT,
      timers,
      cleanups,
      missingCleanups,
      recommendations,
    });

    return { timers, cleanups, missingCleanups, recommendations };
  }

  /**
   * RULE 2: Unified private helper for timer analysis
   * Eliminates duplication between interval and timeout analysis
   */
  private static analyzeTimers(params: {
    content: string;
    variables: string[];
    timerType: 'setInterval' | 'setTimeout';
    clearPattern: string;
    clearMethod: string;
    timers: string[];
    cleanups: string[];
    missingCleanups: string[];
    recommendations: string[];
  }): void {
    const {
      content,
      variables,
      timerType,
      clearPattern,
      clearMethod,
      timers,
      cleanups,
      missingCleanups,
      recommendations,
    } = params;

    variables.forEach(variable => {
      // RULE 1: Use Configuration message functions
      timers.push(
        this.Config.VALIDATION_MESSAGES.timerAssignment(variable, timerType)
      );

      // Check for cleanup using clearPattern
      if (content.includes(`${clearPattern}(${variable})`)) {
        cleanups.push(
          this.Config.VALIDATION_MESSAGES.cleanupDetected(variable, clearMethod)
        );
      } else {
        // Add missing cleanup violation and recommendation
        const missingMessage =
          timerType === 'setInterval'
            ? this.Config.VALIDATION_MESSAGES.missingClearInterval(variable)
            : this.Config.VALIDATION_MESSAGES.missingClearTimeout(variable);
        missingCleanups.push(missingMessage);

        const recommendation =
          timerType === 'setInterval'
            ? this.Config.RECOMMENDATIONS.ADD_CLEAR_INTERVAL(variable)
            : this.Config.RECOMMENDATIONS.ADD_CLEAR_TIMEOUT(variable);
        recommendations.push(recommendation);
      }
    });
  }

  /**
   * Detect RxJS timer opportunities
   * RULE 1: Uses Configuration for RxJS pattern analysis
   */
  static detectRxJSTimerOpportunities(content: string): string[] {
    const suggestions: string[] = [];

    // RULE 1: Use Configuration to analyze RxJS opportunities
    const opportunities = this.Config.analyzeRxJSOpportunities(content);

    if (opportunities.canUseInterval) {
      suggestions.push(this.Config.RECOMMENDATIONS.USE_RXJS_INTERVAL);
    }

    if (opportunities.canUseDelay) {
      suggestions.push(this.Config.RECOMMENDATIONS.USE_RXJS_DELAY);
    }

    return suggestions;
  }

  /**
   * Get all timer recommendations
   * RULE 1: Delegates to Configuration
   */
  static getAllTimerRecommendations(): string[] {
    return this.Config.getAllRecommendations();
  }
}
