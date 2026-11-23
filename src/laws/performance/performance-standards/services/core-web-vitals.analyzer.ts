import type { RuleOfCodeConfig } from '../../../../config/types';
import { ProjectTypeDetectorValidation } from '../../../../utils';
import { BrowserMonitoringEvidence } from '../../../../utils/performance/browser-monitoring-evidence';
import type { ReactPerformanceEvidence } from '../../../../utils/react/react-performance-source';
import { CoreWebVitalsConstants } from '../constants';

/**
 * Core Web Vitals Analyzer
 *
 * Single Responsibility: Analyzing Core Web Vitals implementation
 *
 * The evidence is a measurement in the code, wherever it is written: a
 * web-vitals call (v3 or v4), a PerformanceObserver on the vitals' entry
 * types, or a Next.js report (#553). It used to be a `web-vitals` dependency
 * and its v3 names in main.ts, app.component.ts or a file named like
 * monitoring — an app measuring its own vitals failed, and a declared
 * library nobody calls was half-way to passing.
 */
export class CoreWebVitalsAnalyzer {
  static async analyze(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    react?: ReactPerformanceEvidence,
    lawId?: string
  ): Promise<string[]> {
    const measured = BrowserMonitoringEvidence.vitalsMeasurements(
      projectRoot,
      config,
      react,
      lawId
    );
    if (measured.length > 0) return Promise.resolve([]);

    const declared =
      CoreWebVitalsConstants.VITALS_DEPENDENCY in
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
    return Promise.resolve([
      declared
        ? CoreWebVitalsConstants.INTEGRATION_VIOLATION_MESSAGE
        : CoreWebVitalsConstants.VIOLATION_MESSAGE,
    ]);
  }
}
