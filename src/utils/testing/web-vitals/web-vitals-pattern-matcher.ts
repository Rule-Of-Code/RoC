/**
 * Web Vitals Pattern Matcher
 * RULE 2: Optimize internals with pattern-based detection
 * Centralizes all pattern matching logic for web vitals detection
 */
export class WebVitalsPatternMatcher {
  /**
   * Patterns for detecting web vitals monitoring code
   * RULE 1: Single source of truth - centralized pattern definitions
   */
  private static readonly WEB_VITALS_MONITORING_PATTERNS = [
    /web-vitals/i,
    /getCLS|getFID|getFCP|getLCP|getTTFB/,
    /vitals.*measure/i,
    /performance.*vitals/i,
  ] as const;

  /**
   * Patterns for detecting Performance Observer API usage
   * RULE 1: Single source of truth - centralized pattern definitions
   */
  private static readonly PERFORMANCE_OBSERVER_PATTERNS = [
    /PerformanceObserver/,
    /performance\.observer/i,
    /performance\.measure/,
    /performance\.mark/,
    /performance\.now/,
  ] as const;

  /**
   * Patterns for detecting Lighthouse integration
   * RULE 1: Single source of truth - centralized pattern definitions
   */
  private static readonly LIGHTHOUSE_INTEGRATION_PATTERNS = [
    /lighthouse/i,
    /lhci/i,
    /lighthouse.*audit/i,
    /performance.*audit/i,
  ] as const;

  /**
   * Check if content contains web vitals monitoring code
   * @param content File content to analyze
   * @returns true if web vitals monitoring is detected
   */
  static hasWebVitalsMonitoring(content: string): boolean {
    return this.matchesAnyPattern(content, this.WEB_VITALS_MONITORING_PATTERNS);
  }

  /**
   * Check if content uses Performance Observer API
   * @param content File content to analyze
   * @returns true if Performance Observer usage is detected
   */
  static hasPerformanceObserverUsage(content: string): boolean {
    return this.matchesAnyPattern(content, this.PERFORMANCE_OBSERVER_PATTERNS);
  }

  /**
   * Check if content has Lighthouse integration
   * @param content File content to analyze
   * @returns true if Lighthouse integration is detected
   */
  static hasLighthouseIntegration(content: string): boolean {
    return this.matchesAnyPattern(
      content,
      this.LIGHTHOUSE_INTEGRATION_PATTERNS
    );
  }

  /**
   * Universal pattern matching method
   * RULE 2: Optimize internals - extract common logic
   * Eliminates duplicate if-checks across different pattern checkers
   * @param content Content to check
   * @param patterns Array of patterns to match against
   * @returns true if any pattern matches
   */
  private static matchesAnyPattern(
    content: string,
    patterns: readonly RegExp[]
  ): boolean {
    return patterns.some(pattern => pattern.test(content));
  }
}
