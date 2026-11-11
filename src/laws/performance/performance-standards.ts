import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PerformanceAnalyzerService } from './performance-standards/services';

/**
 * Performance Standards Law
 *
 * Single Responsibility: Pure coordination of performance analysis
 */
export class PerformanceStandardsLaw {
  static async check(context: LawCheckContext): Promise<LawResult> {
    const { violations, scoreImpact } =
      await PerformanceAnalyzerService.analyze(
        context.projectRoot,
        context.config,
        context.lawId
      );

    const passed = violations.length === 0;
    const score = Math.max(0, 100 - scoreImpact);

    return {
      passed,
      score,
      message: passed
        ? 'Performance standards fully implemented'
        : `Performance standards gaps found: ${violations.join(', ')}`,
      details: violations,
      violations,
      suggestions: [
        'Configure Lighthouse with performance thresholds ≥90',
        'Set performance budgets (angular.json, webpack, Lighthouse assertions, or a size-limit check run by a script or CI)',
        'Report CLS, INP, LCP with web-vitals or Next.js useReportWebVitals',
        'Enable production optimizations and code splitting',
        'Configure WebP, lazy loading, and image compression (next/image in Next.js)',
        'Implement service worker or configure HTTP caching headers',
      ],
      fixable: true,
      config: context.config,
    };
  }
}
