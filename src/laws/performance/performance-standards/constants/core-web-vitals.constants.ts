/**
 * Core Web Vitals Constants
 *
 * Single Responsibility: the messages of the Core Web Vitals check. What
 * counts as a measurement is BrowserMonitoringEvidence (#553).
 */
export class CoreWebVitalsConstants {
  static readonly VIOLATION_MESSAGE =
    'Core Web Vitals monitoring not implemented';

  static readonly INTEGRATION_VIOLATION_MESSAGE =
    'web-vitals is declared but no metric is measured: no onLCP / onINP / onCLS (or v3 get*) call found in the sources';

  static readonly VITALS_LIBRARY = 'web-vitals';

  static readonly VITALS_DEPENDENCY = this.VITALS_LIBRARY;
}
