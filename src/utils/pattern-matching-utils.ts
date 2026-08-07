/**
 * Pattern Matching Utilities
 * Centralized pattern matching and content analysis utilities
 * Meta-dogfooding: Eliminates 20+ duplicate hasPattern helper methods across Angular configuration files
 */
export class PatternMatchingUtils {
  /**
   * Check if content includes a specific pattern
   * RULE 1: Centralizes the most common pattern checking logic across codebase
   *
   * @param content - Content to search within
   * @param pattern - Pattern to search for
   * @returns True if content contains the pattern
   *
   * @example
   * ```typescript
   * PatternMatchingUtils.hasPattern(content, '@NgModule')
   * // Returns: true if content contains '@NgModule'
   * ```
   */
  static hasPattern(content: string, pattern: string): boolean {
    return content.includes(pattern);
  }

  /**
   * Check if content includes any pattern from an array
   * RULE 1: Centralizes the hasAnyPattern logic found across multiple files
   *
   * @param content - Content to search within
   * @param patterns - Array of patterns to search for
   * @returns True if content contains any of the patterns
   *
   * @example
   * ```typescript
   * PatternMatchingUtils.hasAnyPattern(content, ['private', 'public', 'protected'])
   * // Returns: true if content contains any access modifier
   * ```
   */
  static hasAnyPattern(
    content: string,
    patterns: string[] | readonly string[]
  ): boolean {
    return patterns.some(pattern => content.includes(pattern));
  }

  /**
   * Check if content matches all patterns from an array
   * RULE 2: Extended functionality for comprehensive pattern validation
   *
   * @param content - Content to search within
   * @param patterns - Array of patterns that must all be present
   * @returns True if content contains all patterns
   *
   * @example
   * ```typescript
   * PatternMatchingUtils.hasAllPatterns(content, ['@Component', 'selector:', 'templateUrl:'])
   * // Returns: true only if content contains all component requirements
   * ```
   */
  static hasAllPatterns(
    content: string,
    patterns: string[] | readonly string[]
  ): boolean {
    return patterns.every(pattern => content.includes(pattern));
  }

  /**
   * Count occurrences of a pattern in content
   * RULE 2: Extended functionality for pattern frequency analysis
   *
   * @param content - Content to search within
   * @param pattern - Pattern to count
   * @returns Number of occurrences
   */
  static countPattern(content: string, pattern: string): number {
    return (content.match(new RegExp(pattern, 'g')) ?? []).length;
  }

  /**
   * Check if content matches a regular expression pattern
   * RULE 2: Extended functionality for complex pattern matching
   *
   * @param content - Content to search within
   * @param pattern - RegExp pattern to test
   * @returns True if pattern matches
   */
  static hasRegexPattern(content: string, pattern: RegExp): boolean {
    return pattern.test(content);
  }

  /**
   * Extract all matches for a pattern from content
   * RULE 2: Extended functionality for pattern extraction
   *
   * @param content - Content to search within
   * @param pattern - RegExp pattern to extract matches
   * @returns Array of matches
   */
  static extractMatches(content: string, pattern: RegExp): string[] {
    // Ensure pattern has global flag for matchAll
    const globalPattern = pattern.global
      ? pattern
      : new RegExp(pattern.source, pattern.flags + 'g');
    return Array.from(content.matchAll(globalPattern), match => match[0]);
  }

  /**
   * Case-insensitive pattern matching
   * RULE 2: Extended functionality for flexible matching
   *
   * @param content - Content to search within
   * @param pattern - Pattern to search for (case-insensitive)
   * @returns True if content contains the pattern (case-insensitive)
   */
  static hasPatternIgnoreCase(content: string, pattern: string): boolean {
    return content.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Check if content matches any RegExp pattern from an array
   * RULE 2: Extended functionality for regex pattern arrays
   *
   * @param content - Content to search within
   * @param patterns - Array of RegExp patterns to test
   * @returns True if content matches any pattern
   *
   * @example
   * ```typescript
   * PatternMatchingUtils.hasAnyRegexPattern(content, [/import.*crypto/, /require.*crypto/])
   * // Returns: true if content matches any crypto import pattern
   * ```
   */
  static hasAnyRegexPattern(
    content: string,
    patterns: RegExp[] | readonly RegExp[]
  ): boolean {
    return patterns.some(pattern => pattern.test(content));
  }
}
