import { PatternMatchingUtils } from '../../../../utils/pattern-matching-utils';

/**
 * Core Web Vitals Constants
 *
 * Single Responsibility: Web Vitals dependency and usage validation rules
 */
export class CoreWebVitalsConstants {
  static readonly VIOLATION_MESSAGE =
    'Core Web Vitals monitoring not implemented';

  static readonly INTEGRATION_VIOLATION_MESSAGE =
    'Core Web Vitals library not integrated in main application files';

  static readonly VITALS_LIBRARY = 'web-vitals';

  static readonly VITALS_DEPENDENCY = this.VITALS_LIBRARY;

  static readonly VITALS_IMPORTS = [
    this.VITALS_LIBRARY,
    'getCLS',
    'getFID',
    'getLCP',
    'getFCP',
    'getTTFB',
  ];

  static readonly DEPENDENCY_PATTERNS: string[] = [
    `"${CoreWebVitalsConstants.VITALS_LIBRARY}"`,
    `'${CoreWebVitalsConstants.VITALS_LIBRARY}'`,
  ];

  static readonly VITALS_USAGE_PATTERNS: string[] = [
    this.VITALS_LIBRARY,
    'getCLS(',
    'getFID(',
    'getLCP(',
    'getFCP(',
    'getTTFB(',
    'initPerformanceMonitoring', // Common wrapper function pattern
  ];

  /**
   * Check if file has web-vitals dependency
   */
  static hasWebVitalsDependency(packageJsonContent: string): boolean {
    return (
      PatternMatchingUtils.hasAnyPattern(
        packageJsonContent,
        this.DEPENDENCY_PATTERNS
      ) &&
      (PatternMatchingUtils.hasPattern(packageJsonContent, '"dependencies"') ||
        PatternMatchingUtils.hasPattern(
          packageJsonContent,
          '"devDependencies"'
        ))
    );
  }

  /**
   * Check if file uses web vitals
   */
  static usesWebVitals(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.VITALS_USAGE_PATTERNS
    );
  }
}
