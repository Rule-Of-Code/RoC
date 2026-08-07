/**
 * Observable Subscriptions Memory Analyzer
 * Specialized analyzer for detecting memory leaks from unsubscribed observables
 * Meta-dogfooding: Delegates to ValidationPatterns (RULE 1 & RULE 2 applied)
 */

import type { MemoryLeakPatterns } from '../../types/memory.types';
import { ObservableSubscriptionsConfiguration } from './observable-subscriptions-configuration';
import { ObservableSubscriptionsValidationPatterns } from './observable-subscriptions-validation-patterns';

export class ObservableSubscriptionsAnalyzer {
  /**
   * Check observable subscriptions for memory leaks
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static checkObservableSubscriptions(
    files: string[]
  ): Partial<MemoryLeakPatterns> {
    return ObservableSubscriptionsValidationPatterns.validateAllSubscriptionPatterns(
      files
    );
  }

  /**
   * Get observable subscription recommendations
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static getObservableRecommendations(): string[] {
    return [...ObservableSubscriptionsConfiguration.RECOMMENDATIONS];
  }

  /**
   * Detect subscription leaks in content
   * RULE 1: 100% coverage - delegates to ValidationPatterns
   */
  static detectSubscriptionLeaks(content: string): string[] {
    return ObservableSubscriptionsValidationPatterns.detectSubscriptionLeaks(
      content
    );
  }
}
