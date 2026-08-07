/**
 * Event Listeners Validation Patterns
 * Complete validation workflow for event listener memory leak detection
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated patterns
 */

import { FileUtils } from '../../file-utils';
import type { MemoryLeakPatterns } from '../../types/memory.types';
import { EventListenersConfiguration } from './event-listeners-configuration';

export class EventListenersValidationPatterns {
  private static readonly Config = EventListenersConfiguration;

  /**
   * Master orchestrator method - validates all event listener patterns
   * RULE 1: Single entry point for validation workflow
   */
  static validateAllEventListenerPatterns(
    files: string[]
  ): Partial<MemoryLeakPatterns> {
    const globalEventListeners: string[] = [];

    files.forEach(file => {
      this.analyzeEventListenerFile(file, globalEventListeners);
    });

    return {
      globalEventListeners,
    };
  }

  /**
   * Analyzes individual file for event listener issues
   * RULE 1: Cache patterns analysis to eliminate duplicate calls (100% internal coverage)
   * RULE 2: Delegates to private helpers for organized complexity management
   */
  private static analyzeEventListenerFile(
    file: string,
    globalEventListeners: string[]
  ): void {
    const content = FileUtils.readFile(file, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeEventListenerPatterns(content);

    // Delegate to private validation helper with pre-computed patterns (RULE 2)
    this.validateEventListeners(file, patterns, globalEventListeners);
  }

  /**
   * Helper: Validates event listeners for potential memory leaks
   * RULE 1: Uses pre-computed patterns (eliminates duplicate analysis calls)
   * RULE 2: Private helper for organized validation structure
   */
  private static validateEventListeners(
    file: string,
    patterns: ReturnType<
      typeof EventListenersConfiguration.analyzeEventListenerPatterns
    >,
    globalEventListeners: string[]
  ): void {
    // Check each event listener pattern
    const hasAnyListener =
      patterns.hasWindowListener ||
      patterns.hasDocumentListener ||
      patterns.hasElementListener;

    if (hasAnyListener && !patterns.hasCleanupIndicators) {
      const message = this.Config.VALIDATION_MESSAGES.MISSING_REMOVAL(file);
      globalEventListeners.push(message);
    }
  }

  /**
   * Detects detailed event listener patterns in content
   * RULE 1: Uses Configuration's extraction methods (eliminates duplicated logic)
   * RULE 2: Organized into focused validation steps
   */
  static detectEventListenerPatterns(content: string): {
    listeners: string[];
    cleanups: string[];
    missingCleanups: string[];
  } {
    const listeners: string[] = [];
    const cleanups: string[] = [];
    const missingCleanups: string[] = [];

    // Extract all event listener details using Configuration (RULE 1)
    const listenerDetails = this.Config.extractEventListenerDetails(content);

    // Process each listener with pre-computed details (RULE 2)
    listenerDetails.forEach(detail => {
      const listenerString = `${detail.target}.${this.Config.METHOD_NAMES.ADD_EVENT_LISTENER}('${detail.event}', ${detail.handler})`;
      listeners.push(listenerString);

      // Check if corresponding removeEventListener exists (RULE 1)
      if (
        this.Config.hasListenerCleanup(
          content,
          detail.target,
          detail.event,
          detail.handler
        )
      ) {
        const cleanupString = `${detail.target}.${this.Config.METHOD_NAMES.REMOVE_EVENT_LISTENER}('${detail.event}', ${detail.handler})`;
        cleanups.push(cleanupString);
      } else {
        const message = this.Config.VALIDATION_MESSAGES.MISSING_CLEANUP(
          detail.full
        );
        missingCleanups.push(message);
      }
    });

    return { listeners, cleanups, missingCleanups };
  }

  /**
   * Analyzes HostListener usage for potential issues
   * RULE 1: Uses Configuration's pattern analysis (eliminates duplicate checks)
   * RULE 2: Private focused validation method
   */
  static analyzeHostListeners(content: string): string[] {
    const issues: string[] = [];

    // Use Configuration's pattern analysis (RULE 1)
    const patterns = this.Config.analyzeHostListenerPatterns(content);

    // Check if using @HostListener without proper cleanup considerations
    if (patterns.hasHostListener && !patterns.hasNgOnDestroy) {
      issues.push(this.Config.VALIDATION_MESSAGES.CONSIDER_ONDESTROY);
    }

    return issues;
  }
}
