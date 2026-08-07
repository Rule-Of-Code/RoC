/**
 * Quality Assessment Utilities
 *
 * Shared utilities for assessing quality levels based on pattern matching
 */
export class QualityAssessmentUtils {
  /**
   * Assess quality level based on pattern matches in content
   *
   * @param content - The content to assess
   * @param patterns - Array of regex patterns to check
   * @param thresholds - Optional custom thresholds { comprehensive, good }
   * @returns Quality level: 'comprehensive', 'good', 'basic', or 'minimal'
   */
  static assessQualityByPatterns(
    content: string,
    patterns: RegExp[],
    thresholds: { comprehensive?: number; good?: number } = {}
  ): string {
    const matches = patterns.filter(pattern => pattern.test(content)).length;

    const comprehensiveThreshold = thresholds.comprehensive ?? 6;
    const goodThreshold = thresholds.good ?? 4;
    const basicThreshold = 2;

    if (matches >= comprehensiveThreshold) return 'comprehensive';
    if (matches >= goodThreshold) return 'good';
    if (matches >= basicThreshold) return 'basic';
    return 'minimal';
  }

  /**
   * Assess quality level with custom level names
   *
   * @param content - The content to assess
   * @param patterns - Array of regex patterns to check
   * @param levels - Custom level names for different match counts
   * @returns Quality level based on provided level names
   */
  static assessQualityCustom(
    content: string,
    patterns: RegExp[],
    levels: {
      high: { threshold: number; label: string };
      medium: { threshold: number; label: string };
      low: { threshold: number; label: string };
      minimal: string;
    }
  ): string {
    const matches = patterns.filter(pattern => pattern.test(content)).length;

    if (matches >= levels.high.threshold) return levels.high.label;
    if (matches >= levels.medium.threshold) return levels.medium.label;
    if (matches >= levels.low.threshold) return levels.low.label;
    return levels.minimal;
  }
}
