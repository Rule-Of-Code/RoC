import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Lighthouse Constants
 *
 * Single Responsibility: Lighthouse configuration patterns and validation rules
 */
export class LighthouseConstants {
  static readonly CONFIG_PATHS = [
    'lighthouse.config.js',
    'config/lighthouse.config.js',
    '.lighthouserc.json',
    '.lighthouserc.js',
  ];

  static readonly CONFIG_FILE_PATTERNS: string[] = [
    'lighthouse.config.js',
    'lighthouse.config.ts',
    '.lighthouserc.json',
    '.lighthouserc.js',
  ];

  static readonly PERFORMANCE_PATTERNS: string[] = ['performance', '90', '0.9'];

  static readonly PERFORMANCE_THRESHOLD = 90;
  static readonly PERFORMANCE_THRESHOLD_DECIMAL = 0.9;

  /**
   * Check if file is a Lighthouse configuration file
   */
  static isLighthouseConfig(filePath: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      filePath,
      this.CONFIG_FILE_PATTERNS
    );
  }

  /**
   * Check if configuration has performance threshold configured
   */
  static hasPerformanceThreshold(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.PERFORMANCE_PATTERNS
    );
  }
}
