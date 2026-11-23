import type { RuleOfCodeConfig } from '../../../../config/types';
import { BrowserMonitoringEvidence } from '../../../../utils/performance/browser-monitoring-evidence';

/**
 * Real User Monitoring Analyzer Service
 *
 * Single Responsibility: Analyze Real User Monitoring configuration
 *
 * Field metrics measured in the browser, wherever the code measures them
 * (#553): a web-vitals call (v3 or v4), Next's `useReportWebVitals`, or the
 * project's own PerformanceObserver on the vitals' entry types. It used to
 * look for a few names in main.ts, app.component.ts and src/index.ts only,
 * so a measurement in its own module was not seen.
 */
export class RealUserMonitoringAnalyzerService {
  static async checkRealUserMonitoring(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    lawId?: string
  ): Promise<{
    configured: boolean;
  }> {
    const measured = BrowserMonitoringEvidence.vitalsMeasurements(
      projectRoot,
      config,
      undefined,
      lawId
    );
    return Promise.resolve({ configured: measured.length > 0 });
  }
}
