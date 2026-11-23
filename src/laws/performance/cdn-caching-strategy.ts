/**
 * CDN and Caching Strategy Law
 * Ensures proper CDN implementation and caching strategies
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import { firebaseHosting } from '../../utils/production-subject-requirements';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { CdnCachingStrategyCachingStrategiesConstants as CachingStrategies } from './cdn-caching-strategy/constants/caching-strategies';
import { CdnCachingStrategyAnalyzerService } from './cdn-caching-strategy/services/analyzer.service';

/** The concern this law owns does not exist without its substrate. */
const NOT_APPLICABLE_MESSAGE =
  '📋 Not applicable — no web assets to serve (no TypeScript/JavaScript sources in this project)';

/**
 * Configs that declare a web-serving/CDN surface even without bundled
 * sources. firebase.json is not one by its name: only its `hosting` key
 * serves a page (#547), so it is read by `firebaseHosting`.
 */
const WEB_SURFACE_FILES = [
  'angular.json',
  'ngsw-config.json',
  'netlify.toml',
  'vercel.json',
  'wrangler.toml',
  'nginx.conf',
];

type WebAssets = 'none' | 'served' | { unreadable: string[] };

export class CdnCachingStrategyLaw {
  /**
   * Are there served web assets at all — sources to bundle and ship, or a
   * declared web-serving/CDN surface? A pure backend serves none. A
   * firebase.json that cannot be parsed may or may not declare hosting: with
   * no other surface, that is not read, not "nothing to serve".
   */
  private static webAssets(projectRoot: string): WebAssets {
    if (
      PythonSatisfaction.hasJsTsSources(projectRoot) ||
      WEB_SURFACE_FILES.some(rel =>
        FileUtils.exists(PathOperations.join(projectRoot, rel))
      )
    ) {
      return 'served';
    }
    const firebase = firebaseHosting(projectRoot);
    if (firebase.hosting) return 'served';
    return firebase.unreadable.length > 0
      ? { unreadable: firebase.unreadable }
      : 'none';
  }

  private static createNotReadResult(
    context: LawCheckContext,
    unreadable: string[]
  ): LawResult {
    const note = `firebase.json could not be read (${unreadable.join('; ')}) — whether it declares hosting is NOT read, so this law judged nothing`;
    return markJudgedNothing({
      passed: false,
      score: 0,
      message: note,
      details: [note],
      violations: [note],
      suggestions: ['Fix the JSON syntax of firebase.json'],
      fixable: true,
      config: context.config,
    });
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
    const assets = this.webAssets(context.projectRoot);
    if (assets === 'none') return this.createNotApplicableResult(context);
    if (assets !== 'served') {
      return this.createNotReadResult(context, assets.unreadable);
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
