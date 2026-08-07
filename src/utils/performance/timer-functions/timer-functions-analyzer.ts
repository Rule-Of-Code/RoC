/**
 * Timer Functions Memory Analyzer
 * Specialized analyzer for detecting memory leaks from uncleaned timers
 * RULE 1 & RULE 2: Facade pattern - delegates to ValidationPatterns and Configuration
 */

import type { MemoryLeakPatterns } from '../../types/memory.types';
import { TimerFunctionsConfiguration } from './timer-functions-configuration';
import { TimerFunctionsValidationPatterns } from './timer-functions-validation-patterns';

/**
 * Timer Functions Analyzer
 * Public API facade for timer memory leak detection
 * RULE 1: 100% delegation to ValidationPatterns (method can be removed, kept for external compatibility)
 */
export class TimerFunctionsAnalyzer {
  /**
   * Check timer functions for memory leaks
   * RULE 1: 100% delegation to ValidationPatterns
   */
  static checkTimerFunctions(files: string[]): Partial<MemoryLeakPatterns> {
    return TimerFunctionsValidationPatterns.validateTimerFunctions(files);
  }

  /**
   * Get timer cleanup recommendations
   * RULE 1: 100% delegation to Configuration
   */
  static getTimerRecommendations(): string[] {
    return TimerFunctionsConfiguration.getAllRecommendations();
  }

  /**
   * Analyze timer usage patterns in detail
   * RULE 1: 100% delegation to ValidationPatterns
   */
  static analyzeTimerUsage(content: string): {
    timers: string[];
    cleanups: string[];
    missingCleanups: string[];
    recommendations: string[];
  } {
    return TimerFunctionsValidationPatterns.analyzeDetailedTimerUsage(content);
  }

  /**
   * Detect opportunities to use RxJS timer operators
   * RULE 1: 100% delegation to ValidationPatterns
   */
  static detectRxJSTimers(content: string): string[] {
    return TimerFunctionsValidationPatterns.detectRxJSTimerOpportunities(
      content
    );
  }
}
