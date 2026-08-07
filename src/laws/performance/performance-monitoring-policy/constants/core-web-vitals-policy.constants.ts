/**
 * Core Web Vitals Policy Constants
 *
 * Single Responsibility: Core Web Vitals monitoring configuration
 */
export class CoreWebVitalsPolicyConstants {
  static readonly WEB_VITALS_PACKAGE = 'web-vitals';

  static readonly CWV_KEYWORDS: string[] = [
    'getCLS',
    'getFID',
    'getFCP',
    'getLCP',
    'getTTFB',
    'web-vitals',
  ];

  static readonly LCP_PATTERN = 'getLCP';
  static readonly FID_PATTERN = 'getFID';
  static readonly CLS_PATTERN = 'getCLS';

  static hasCoreWebVitalsTracking(content: string): boolean {
    return this.CWV_KEYWORDS.some(keyword => content.includes(keyword));
  }

  static hasWebVitalsLibrary(allDeps: Record<string, unknown>): boolean {
    return this.WEB_VITALS_PACKAGE in allDeps;
  }

  static hasCoreWebVitalsMetrics(content: string): boolean {
    return (
      content.includes(this.LCP_PATTERN) ||
      content.includes(this.FID_PATTERN) ||
      content.includes(this.CLS_PATTERN)
    );
  }
}
