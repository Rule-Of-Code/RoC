/**
 * Event Listeners Memory Analyzer
 * Specialized analyzer for detecting memory leaks from global event listeners
 * Meta-dogfooding: Delegates to ValidationPatterns (RULE 1 & RULE 2 applied)
 */

import type { MemoryLeakPatterns } from '../../types/memory.types';
import { EventListenersConfiguration } from './event-listeners-configuration';
import { EventListenersValidationPatterns } from './event-listeners-validation-patterns';

export class EventListenersAnalyzer {
  /**
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static checkGlobalEventListeners(
    files: string[]
  ): Partial<MemoryLeakPatterns> {
    return EventListenersValidationPatterns.validateAllEventListenerPatterns(
      files
    );
  }

  /**
   * RULE 1: 100% coverage - uses Configuration directly
   */
  static getEventListenerRecommendations(): string[] {
    return [...EventListenersConfiguration.RECOMMENDATIONS];
  }

  /**
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static detectEventListenerPatterns(content: string): {
    listeners: string[];
    cleanups: string[];
    missingCleanups: string[];
  } {
    return EventListenersValidationPatterns.detectEventListenerPatterns(
      content
    );
  }

  /**
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static analyzeHostListeners(content: string): string[] {
    return EventListenersValidationPatterns.analyzeHostListeners(content);
  }
}
