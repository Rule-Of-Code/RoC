import type { RuleOfCodeConfig } from '../../../../config/types';
import { sentryTracingInits } from './performance-tracing';

/**
 * Error Tracking Analyzer Service — Performance Monitoring Standards'
 * "performance tracing" check (#12, b4).
 *
 * Until b4 it required a Sentry SDK in package.json and one of three fixed
 * files containing the substring tracesSampleRate, performance or
 * tracingOrigins. It now reads every source file for a Sentry SDK's init
 * with a tracing option, from the syntax tree (see performance-tracing.ts).
 * The method name is kept for its callers.
 */
export class ErrorTrackingAnalyzerService {
  static async checkPerformanceErrorTracking(
    projectRoot: string,
    config?: RuleOfCodeConfig,
    lawId?: string
  ): Promise<{
    configured: boolean;
    files: string[];
    unread: string[];
  }> {
    const tracing = sentryTracingInits(projectRoot, config, lawId);
    return Promise.resolve({
      configured: tracing.files.length > 0,
      files: tracing.files,
      unread: tracing.unread,
    });
  }
}
