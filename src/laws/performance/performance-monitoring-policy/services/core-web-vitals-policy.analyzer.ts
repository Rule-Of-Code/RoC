import {
  BrowserMonitoringEvidence,
  type VitalsMeasurement,
} from '../../../../utils/performance/browser-monitoring-evidence';

/**
 * Core Web Vitals Policy Analyzer Service
 *
 * Single Responsibility: Analyze Core Web Vitals monitoring configuration
 *
 * Monitored means measured in the code (#553): a web-vitals call (v3 or v4),
 * Next's `useReportWebVitals`, or the project's own PerformanceObserver on
 * the vitals' entry types — named in the result as what it is. A declared
 * `web-vitals` dependency that nothing calls is not monitoring.
 */
export class CoreWebVitalsPolicyAnalyzerService {
  static checkCoreWebVitalsMonitoring(measured: readonly VitalsMeasurement[]): {
    monitored: boolean;
    implementations: string[];
  } {
    const implementations = measured.map(m =>
      BrowserMonitoringEvidence.describe(m)
    );
    return { monitored: implementations.length > 0, implementations };
  }
}
