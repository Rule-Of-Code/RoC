import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Image Optimization Constants
 *
 * Single Responsibility: Image optimization tools and configuration validation rules
 */
export class ImageOptimizationConstants {
  static readonly VIOLATION_MESSAGE =
    'Image optimization strategy not implemented';

  static readonly IMAGE_TOOLS = [
    'sharp',
    'imagemin',
    'squoosh',
    '@angular/common',
  ];

  static readonly TOOL_PATTERNS: string[] = [
    '"sharp"',
    '"imagemin"',
    '"squoosh"',
    '"@angular/common"',
  ];

  static readonly IMAGE_OPTIMIZATION_MARKERS: string[] = [
    'provideImageOptimization',
    'NgOptimizedImage',
    'provideImageKitConfig',
  ];

  /**
   * Check if package has image optimization tools
   */
  static hasImageOptimizationTools(packageJsonContent: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      packageJsonContent,
      this.TOOL_PATTERNS
    );
  }

  /**
   * Check if file has image optimization configuration
   */
  static hasImageOptimizationConfig(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.IMAGE_OPTIMIZATION_MARKERS
    );
  }
}
