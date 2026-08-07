import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  DependencyPinningAnalysisService,
  DependencyPinningConstants,
} from './dependency-pinning';
import { LawResultBuilder } from './law-result-builder';

/**
 * Dependency Pinning Checker Law
 * Ensures dependencies are properly pinned to specific versions for security and stability
 *
 * Responsibility: ONLY coordination
 * - Uses DependencyPinningAnalysisService for analysis
 * - Uses DependencyPinningConstants for configuration
 */
export class DependencyPinningCheckerLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;
      const pinningAnalysis =
        DependencyPinningAnalysisService.analyzeDependencyPinning(projectRoot);
      const securityAnalysis =
        DependencyPinningAnalysisService.analyzeSecurityImplications(
          projectRoot
        );

      let score = 100;
      const details: string[] = [];

      // Check for unpinned production dependencies
      if (pinningAnalysis.unpinnedProduction.length > 0) {
        score -=
          DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_PRODUCTION;
        details.push(
          `${pinningAnalysis.unpinnedProduction.length} unpinned production dependencies`
        );
      }

      // Check for unpinned security-critical dependencies
      if (securityAnalysis.unpinnedCritical.length > 0) {
        score -= DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_CRITICAL;
        details.push(
          `${securityAnalysis.unpinnedCritical.length} unpinned security-critical dependencies`
        );
      }

      // Check for unpinned dev dependencies (less critical)
      if (pinningAnalysis.unpinnedDev.length > 0) {
        score -= DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_DEV;
        details.push(
          `${pinningAnalysis.unpinnedDev.length} unpinned dev dependencies`
        );
      }

      // Check for wildcard versions
      if (pinningAnalysis.wildcardVersions.length > 0) {
        score -= DependencyPinningConstants.SCORE_DEDUCTIONS.WILDCARD_VERSIONS;
        details.push(
          `${pinningAnalysis.wildcardVersions.length} dependencies using wildcard versions`
        );
      }

      // Check for missing lock file
      if (!pinningAnalysis.hasLockFile) {
        score -= DependencyPinningConstants.SCORE_DEDUCTIONS.NO_LOCK_FILE;
        details.push('Missing package lock file');
      }

      // Check for version ranges vs exact versions
      if (pinningAnalysis.rangeVersions.length > 0) {
        score -= DependencyPinningConstants.SCORE_DEDUCTIONS.VERSION_RANGES;
        details.push(
          `${pinningAnalysis.rangeVersions.length} dependencies using version ranges`
        );
      }

      const passed = score >= 100;
      const message = passed
        ? '✅ Dependencies properly pinned'
        : `⚠️ Dependency pinning issues: ${details.join(', ')}`;

      return LawResultBuilder.buildSuccess(
        passed,
        score,
        message,
        details,
        context
      );
    } catch (error: unknown) {
      return LawResultBuilder.buildError(
        error,
        'Error checking dependency pinning',
        context,
        'Check package.json and dependency configuration'
      );
    }
  }
}
