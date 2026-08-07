import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Shared pattern detection constants base class
 * Provides common functionality for detecting security patterns
 */
export class SecurityPatternConstants {
  /**
   * Override in subclasses
   */
  static readonly PATTERNS: Record<string, RegExp> = {};

  /**
   * Override in subclasses
   */
  static readonly MESSAGES: Record<string, string> = {};

  /**
   * Detect if content has any pattern match
   */
  static hasUnsafePattern(content: string): boolean {
    return Object.values(this.PATTERNS).some(pattern =>
      PatternMatchingUtils.hasRegexPattern(content, pattern)
    );
  }

  /**
   * Detect all patterns in content
   */
  static detectPatterns(
    content: string
  ): Array<{ pattern: RegExp; message: string }> {
    const detected: Array<{ pattern: RegExp; message: string }> = [];
    const patternKeys = Object.keys(this.PATTERNS);

    for (const key of patternKeys) {
      const pattern = this.PATTERNS[key];
      const message = this.MESSAGES[key];

      if (
        pattern &&
        message &&
        PatternMatchingUtils.hasRegexPattern(content, pattern)
      ) {
        detected.push({ pattern, message });
      }
    }

    return detected;
  }
}
