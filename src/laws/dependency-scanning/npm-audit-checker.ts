import type { LawCheckContext, LawResult } from '../../types/law.types';
import { LawResultBuilder } from './law-result-builder';
import {
  NpmAuditAnalysisService,
  NpmAuditConstants,
} from './npm-audit-checker/index';

/**
 * NPM Audit Checker Law
 * Analyzes NPM vulnerabilities and package security
 * Responsibilities: ONLY coordination
 */
export class NpmAuditCheckerLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const { projectRoot } = context;

      // Run npm audit analysis
      const auditResults = NpmAuditAnalysisService.runNpmAudit(projectRoot);

      // Analyze package.json security
      const packageAnalysis =
        NpmAuditAnalysisService.analyzePackageJson(projectRoot);

      // Calculate score and details
      let score = 100;
      const details: string[] = [];

      if (auditResults.critical > 0) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.CRITICAL_VULNERABILITY;
        details.push(`${auditResults.critical} critical vulnerabilities`);
      }

      if (auditResults.high > 0) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.HIGH_VULNERABILITY;
        details.push(`${auditResults.high} high vulnerabilities`);
      }

      if (auditResults.moderate > 0) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.MODERATE_VULNERABILITY;
        details.push(`${auditResults.moderate} moderate vulnerabilities`);
      }

      if (auditResults.low > 0) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.LOW_VULNERABILITY;
        details.push(`${auditResults.low} low vulnerabilities`);
      }

      if (!packageAnalysis.hasLockFile) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.MISSING_LOCK_FILE;
        details.push('Missing lock file (package-lock.json, yarn.lock, etc.)');
      }

      if (packageAnalysis.hasInsecureProtocols) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.INSECURE_PROTOCOLS;
        details.push('Insecure protocols found in package URLs');
      }

      if (packageAnalysis.hasWildcardVersions) {
        score -= NpmAuditConstants.SCORE_DEDUCTIONS.WILDCARD_VERSIONS;
        details.push('Wildcard versions found - pin versions for security');
      }

      const passed = score >= NpmAuditConstants.PASS_THRESHOLD;
      const message = passed
        ? '✅ NPM audit passed - no critical vulnerabilities'
        : `⚠️ NPM audit failed: ${details.join(', ')}`;

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
        'NPM audit',
        context,
        'Run npm audit manually to check for issues'
      );
    }
  }
}
