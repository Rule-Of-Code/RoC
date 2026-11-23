import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LawResultBuilder } from './law-result-builder';
import {
  NpmAuditAnalysisService,
  NpmAuditConstants,
} from './npm-audit-checker/index';

/**
 * NPM Manifest Checker Law
 * Judges the package manifest and the lockfile: a lockfile is committed, no
 * dependency is fetched over an insecure protocol, no range accepts any
 * version. It runs no audit and counts no vulnerability (#545): that is the
 * scanner's job in the gate, which the law verifies is wired in. Its result
 * says so in a note, never as a pass or a failure of an audit it did not run.
 * Responsibilities: ONLY coordination
 */
export class NpmAuditCheckerLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;

      const packageAnalysis =
        NpmAuditAnalysisService.analyzePackageJson(projectRoot);

      let score = 100;
      const violations: string[] = [];

      if (!packageAnalysis.hasLockFile) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.MISSING_LOCK_FILE;
        violations.push(
          'Missing lock file (package-lock.json, yarn.lock, etc.)'
        );
      }

      if (packageAnalysis.hasInsecureProtocols) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.INSECURE_PROTOCOLS;
        violations.push('Insecure protocols found in package URLs');
      }

      if (packageAnalysis.hasWildcardVersions) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.WILDCARD_VERSIONS;
        violations.push('Wildcard versions found - pin versions for security');
      }

      const passed = score >= NpmAuditConstants.PASS_THRESHOLD;
      const message = passed
        ? '✅ Dependency manifest and lockfile checked'
        : `⚠️ Dependency manifest issues: ${violations.join(', ')}`;

      return {
        ...LawResultBuilder.buildSuccess(
          passed,
          score,
          message,
          violations,
          context
        ),
        details: [...violations, NpmAuditConstants.NOT_MEASURED_NOTE],
      };
    } catch (error: unknown) {
      return LawResultBuilder.buildError(
        error,
        'Dependency manifest check',
        context,
        'Check the package manifest and lockfile manually'
      );
    }
  }
}
