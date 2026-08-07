/**
 * CDN and Caching Strategy Law
 * Ensures proper CDN implementation and caching strategies
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from './cdn-caching-strategy/constants/caching-strategies';
import { CdnCachingStrategyAnalyzerService } from './cdn-caching-strategy/services/analyzer.service';

/** The concern this law owns does not exist without its substrate. */
const NOT_APPLICABLE_MESSAGE =
  '📋 Not applicable — no web assets to serve (no TypeScript/JavaScript sources in this project)';

/** Configs that declare a web-serving/CDN surface even without bundled sources. */
const WEB_SURFACE_FILES = [
  'firebase.json',
  'angular.json',
  'ngsw-config.json',
  'netlify.toml',
  'vercel.json',
  'wrangler.toml',
  'nginx.conf',
];

export class CdnCachingStrategyLaw {
  /**
   * Are there served web assets at all — sources to bundle and ship, or a
   * declared web-serving/CDN surface? A pure backend serves none.
   */
  private static hasWebAssets(projectRoot: string): boolean {
    return (
      PythonSatisfaction.hasJsTsSources(projectRoot) ||
      WEB_SURFACE_FILES.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      )
    );
  }

  /**
   * Nothing is served → nothing to cache at an edge. The absence of the
   * substrate is not a violation, it is N/A (score 100, zero violations).
   */
  private static createNotApplicableResult(
    context: LawCheckContext
  ): LawResult {
    return {
      passed: true,
      score: 100,
      message: NOT_APPLICABLE_MESSAGE,
      details: [NOT_APPLICABLE_MESSAGE],
      violations: [],
      suggestions: [],
      fixable: true,
      config: context.config,
    };
  }

  static async check(context: LawCheckContext): Promise<LawResult> {
    if (!this.hasWebAssets(context.projectRoot)) {
      return this.createNotApplicableResult(context);
    }

    const analysis = await CdnCachingStrategyAnalyzerService.analyze(
      context.projectRoot,
      context.config
    );

    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // CDN Configuration check
    if (!analysis.cdnConfigured.configured) {
      violations.push(CachingStrategies.VIOLATION_MESSAGES.CDN_NOT_IMPLEMENTED);
      suggestions.push(CachingStrategies.SUGGESTION_MESSAGES.CDN_CONFIG);
      score -= CachingStrategies.SCORE_DEDUCTIONS.CDN_NOT_CONFIGURED;
    }

    // Asset Optimization check
    if (!analysis.assetOptimization.optimized) {
      violations.push(CachingStrategies.VIOLATION_MESSAGES.ASSET_NOT_OPTIMIZED);
      suggestions.push(
        CachingStrategies.SUGGESTION_MESSAGES.ASSET_OPTIMIZATION
      );
      score -= CachingStrategies.SCORE_DEDUCTIONS.ASSET_OPTIMIZATION_MISSING;
    }

    // Browser Caching Headers check
    if (!analysis.cachingHeaders.configured) {
      violations.push(
        CachingStrategies.VIOLATION_MESSAGES.CACHING_HEADERS_NOT_CONFIGURED
      );
      suggestions.push(CachingStrategies.SUGGESTION_MESSAGES.CACHING_HEADERS);
      score -=
        CachingStrategies.SCORE_DEDUCTIONS.BROWSER_CACHING_NOT_CONFIGURED;
    }

    // Service Worker check
    if (!analysis.serviceWorker.implemented) {
      violations.push(
        CachingStrategies.VIOLATION_MESSAGES.SERVICE_WORKER_NOT_IMPLEMENTED
      );
      suggestions.push(CachingStrategies.SUGGESTION_MESSAGES.SERVICE_WORKER);
      score -=
        CachingStrategies.SCORE_DEDUCTIONS.SERVICE_WORKER_NOT_IMPLEMENTED;
    }

    // HTTP/2 Optimization check
    if (!analysis.http2Optimization.optimized) {
      violations.push(CachingStrategies.VIOLATION_MESSAGES.HTTP2_NOT_OPTIMIZED);
      suggestions.push(
        CachingStrategies.SUGGESTION_MESSAGES.HTTP2_OPTIMIZATION
      );
      score -= CachingStrategies.SCORE_DEDUCTIONS.HTTP2_NOT_OPTIMIZED;
    }

    return {
      passed: violations.length === 0,
      score: Math.max(0, score),
      message:
        violations.length === 0
          ? 'CDN and caching strategy properly implemented'
          : `CDN and caching issues found: ${violations.join(', ')}`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      fixable: true,
      config: context.config,
    };
  }
}
