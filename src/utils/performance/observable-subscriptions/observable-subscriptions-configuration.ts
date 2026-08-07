/**
 * Observable Subscriptions Configuration
 * Centralized patterns, messages and thresholds for observable subscription leak detection
 * RULE 1: Uses ANGULAR_CONSTANTS to avoid hardcoded strings
 */

import { ANGULAR_CONSTANTS } from '../../angular-constants';
import { PatternMatchingUtils } from '../../pattern-matching-utils';

export class ObservableSubscriptionsConfiguration {
  static readonly SUBSCRIPTION_PATTERNS = {
    SUBSCRIBE: ANGULAR_CONSTANTS.SUBSCRIBE,
    PIPE_SUBSCRIBE: /\.pipe\(.*?\)\.subscribe/g,
    PROPERTY_SUBSCRIBE: /this\.[\w]+\s*=.*?\.subscribe/g,
    SIMPLE_SUBSCRIBE: /\.subscribe\(.*?\)/g,
    UNSUBSCRIBE: ANGULAR_CONSTANTS.UNSUBSCRIBE,
    TAKE_UNTIL: ANGULAR_CONSTANTS.TAKE_UNTIL,
  } as const;

  static readonly LIFECYCLE_PATTERNS = {
    IMPLEMENTS_ON_DESTROY: ANGULAR_CONSTANTS.IMPLEMENTS_ON_DESTROY,
    NG_ON_DESTROY: `${ANGULAR_CONSTANTS.NG_ON_DESTROY}()`,
  } as const;

  /**
   * Helper: Apply fileName placeholder to validation messages
   * RULE 2: Centralized message templating for single placeholder
   */
  private static applyFileNamePlaceholder(
    message: string,
    fileName: string
  ): string {
    return message.replace('{fileName}', fileName);
  }

  /**
   * Helper: Apply property placeholder to validation messages
   * RULE 2: Centralized message templating for property names
   */
  private static applyPropertyPlaceholder(
    message: string,
    property: string
  ): string {
    return message.replace('{property}', property);
  }

  /**
   * Build validation message with fileName placeholder
   * RULE 2: Consolidates message construction with fileName
   */
  static buildMessage(messageTemplate: string, fileName: string): string {
    return this.applyFileNamePlaceholder(messageTemplate, fileName);
  }

  /**
   * Build validation message with property placeholder
   * RULE 2: Consolidates message construction with property names
   */
  static buildPropertyMessage(
    messageTemplate: string,
    property: string
  ): string {
    return this.applyPropertyPlaceholder(messageTemplate, property);
  }

  static readonly VALIDATION_MESSAGES = {
    MISSING_UNSUBSCRIBE:
      '{fileName}: Missing unsubscribe for observable subscription',
    MISSING_ON_DESTROY:
      '{fileName}: Component with subscriptions should implement OnDestroy',
    POTENTIAL_LEAK:
      'Potential memory leak: {property} subscription not unsubscribed',
  } as const;

  static readonly RECOMMENDATIONS = [
    `Use ${ANGULAR_CONSTANTS.TAKE_UNTIL} pattern with Subject for automatic unsubscription`,
    'Implement OnDestroy lifecycle hook for manual cleanup',
    'Consider using async pipe in templates for automatic subscription management',
    'Store subscriptions in variables to enable proper cleanup',
  ] as const;

  /**
   * Analyzes content for subscription patterns
   * RULE 1: Centralized pattern analysis (single source of truth)
   */
  static analyzeSubscriptionPatterns(content: string): {
    hasSubscribe: boolean;
    hasUnsubscribe: boolean;
    hasOnDestroy: boolean;
    hasImplementsOnDestroy: boolean;
  } {
    return {
      hasSubscribe: PatternMatchingUtils.hasPattern(
        content,
        this.SUBSCRIPTION_PATTERNS.SUBSCRIBE
      ),
      hasUnsubscribe: PatternMatchingUtils.hasPattern(
        content,
        this.SUBSCRIPTION_PATTERNS.UNSUBSCRIBE
      ),
      hasOnDestroy: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.NG_ON_DESTROY
      ),
      hasImplementsOnDestroy: PatternMatchingUtils.hasPattern(
        content,
        this.LIFECYCLE_PATTERNS.IMPLEMENTS_ON_DESTROY
      ),
    };
  }

  /**
   * Extracts subscription assignments
   * RULE 1: Centralized extraction logic
   */
  static extractSubscriptionAssignments(content: string): Array<{
    full: string;
    property: string;
  }> {
    const assignments: Array<{ full: string; property: string }> = [];
    // RULE 1: Use PatternMatchingUtils instead of manual match() + forEach
    const matches = PatternMatchingUtils.extractMatches(
      content,
      this.SUBSCRIPTION_PATTERNS.PROPERTY_SUBSCRIBE
    );

    for (const match of matches) {
      const propertyMatch = match.match(/this\.(\w+)/);
      if (propertyMatch?.[1]) {
        assignments.push({
          full: match,
          property: propertyMatch[1],
        });
      }
    }

    return assignments;
  }

  /**
   * Checks if a specific subscription has unsubscribe
   * RULE 1: Centralized unsubscribe detection with PatternMatchingUtils pattern building
   */
  static hasPropertyUnsubscribe(content: string, property: string): boolean {
    // RULE 1: Use PatternMatchingUtils for pattern creation instead of manual RegExp
    const unsubscribePatternString = `this\\.${property}\\.unsubscribe\\(\\)`;
    return PatternMatchingUtils.hasRegexPattern(
      content,
      new RegExp(unsubscribePatternString)
    );
  }

  /**
   * Gets all subscription regex patterns
   * RULE 1: Centralized pattern collection
   */
  static getSubscriptionPatterns(): RegExp[] {
    return [
      this.SUBSCRIPTION_PATTERNS.SIMPLE_SUBSCRIBE,
      this.SUBSCRIPTION_PATTERNS.PIPE_SUBSCRIBE,
      this.SUBSCRIPTION_PATTERNS.PROPERTY_SUBSCRIBE,
    ];
  }
}
