/**
 * Observable Subscriptions Validation Patterns
 * Complete validation workflow for observable subscription leak detection
 * Meta-dogfooding: Centralizes validation logic and eliminates duplicated patterns
 */

import { FileUtils } from '../../file-utils';
import type { MemoryLeakPatterns } from '../../types/memory.types';
import { ObservableSubscriptionsConfiguration } from './observable-subscriptions-configuration';

export class ObservableSubscriptionsValidationPatterns {
  private static readonly Config = ObservableSubscriptionsConfiguration;

  /**
   * Master orchestrator method - validates all subscription patterns
   * RULE 1: Single entry point for validation workflow
   * RULE 2: Pre-computes patterns to avoid duplicate analysis
   */
  static validateAllSubscriptionPatterns(
    files: string[]
  ): Partial<MemoryLeakPatterns> {
    const unsubscribedObservables: string[] = [];
    const missingOnDestroy: string[] = [];

    files.forEach(file => {
      this.analyzeSubscriptionFile(
        file,
        unsubscribedObservables,
        missingOnDestroy
      );
    });

    return {
      unsubscribedObservables,
      missingOnDestroy,
    };
  }

  /**
   * Analyzes individual file for subscription issues
   * RULE 1: Cache patterns analysis to eliminate duplicate calls
   * RULE 2: Delegates to private helpers for organized complexity management
   */
  private static analyzeSubscriptionFile(
    file: string,
    unsubscribedObservables: string[],
    missingOnDestroy: string[]
  ): void {
    const content = FileUtils.readFile(file, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    // ===== INLINED: Centralized pattern analysis (RULE 1) =====
    const patterns = this.Config.analyzeSubscriptionPatterns(content);

    // Delegate to private validation helpers with pre-computed patterns (RULE 2)
    this.validateUnsubscribe(file, patterns, unsubscribedObservables);
    this.validateOnDestroy(file, patterns, missingOnDestroy);
  }

  /**
   * Helper: Validate unsubscribe patterns
   * RULE 1: Uses pre-computed patterns from Configuration
   * RULE 2: Private helper for organized validation structure
   */
  private static validateUnsubscribe(
    file: string,
    patterns: ReturnType<
      typeof ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns
    >,
    unsubscribedObservables: string[]
  ): void {
    // Check if there are subscriptions without unsubscribe (RULE 1 - use patterns)
    if (patterns.hasSubscribe && !patterns.hasUnsubscribe) {
      const message = this.Config.buildMessage(
        this.Config.VALIDATION_MESSAGES.MISSING_UNSUBSCRIBE,
        file
      );
      unsubscribedObservables.push(message);
    }
  }

  /**
   * Helper: Validate OnDestroy implementation
   * RULE 1: Uses pre-computed patterns
   * RULE 2: Private focused validation method
   */
  private static validateOnDestroy(
    file: string,
    patterns: ReturnType<
      typeof ObservableSubscriptionsConfiguration.analyzeSubscriptionPatterns
    >,
    missingOnDestroy: string[]
  ): void {
    if (patterns.hasSubscribe) {
      const hasOnDestroy =
        patterns.hasImplementsOnDestroy || patterns.hasOnDestroy;

      if (!hasOnDestroy) {
        const message = this.Config.buildMessage(
          this.Config.VALIDATION_MESSAGES.MISSING_ON_DESTROY,
          file
        );
        missingOnDestroy.push(message);
      }
    }
  }

  /**
   * Detects subscription leaks in content
   * RULE 1: Uses Configuration's extraction methods
   * RULE 2: Organized into focused leak detection
   */
  static detectSubscriptionLeaks(content: string): string[] {
    const leaks: string[] = [];

    // Extract subscription assignments using Configuration (RULE 1)
    const assignments = this.Config.extractSubscriptionAssignments(content);

    assignments.forEach(({ property }) => {
      // Check if property has unsubscribe using Configuration (RULE 1)
      const hasUnsubscribe = this.Config.hasPropertyUnsubscribe(
        content,
        property
      );

      if (!hasUnsubscribe) {
        const message = this.Config.buildPropertyMessage(
          this.Config.VALIDATION_MESSAGES.POTENTIAL_LEAK,
          property
        );
        leaks.push(message);
      }
    });

    return leaks;
  }
}
