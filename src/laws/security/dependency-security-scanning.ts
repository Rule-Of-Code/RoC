import { DependencyPinningChecker } from '../../checkers/dependency-scanning/dependency-pinning-checker';
import { NpmAuditChecker } from '../../checkers/dependency-scanning/npm-audit-checker';
import { VulnerabilityChecker } from '../../checkers/dependency-scanning/vulnerability-checker';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  DependencyLicenseAnalyzer,
  ProjectLicenseAnalyzer,
  ProjectTypeDetector,
} from '../../utils';
import { LawErrorHandlingUtils } from '../../utils/law-error-handling-utils';
import type { PackageJsonLicense } from '../../utils/licensing/licensing-types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
/**
 * DependencyVulnerabilityAnalyzer Dependency Security Scanning Law - Refactored Modular Version
 *
 * Enforces comprehensive DependencyVulnerabilityAnalyzer dependency security scanning including:
 * - DependencyVulnerabilityAnalyzer npm audit integration
 * - Vulnerable dependency detection
 * - License compatibility checking
 * - Dependency pinning requirements
 * - Security policy enforcement
 *
 * Professional implementation following OWASP Dependency Check standards
 */
export class DependencySecurityScanningLaw {
  /**
   * The three checkers below are Node-shaped: they demand package.json,
   * package-lock.json and npm audit. A pure Python project (uv.lock +
   * pip-audit in the gate) failed with FOUR foreign violations — "Missing lock
   * file (package-lock.json, yarn.lock…)" and "package.json not found" ×3 —
   * while its dependencies were in fact locked and scanned (QA).
   *
   * The concern is real for Python too, so this is not an exemption: it is the
   * same law, asked in the project's own language. Locked graph + a scanner in
   * the gate is what the law means; uv.lock and pip-audit are how Python says it.
   */
  private static checkPythonDependencySecurity(
    context: LawCheckContext
  ): LawResult {
    const { projectRoot, config } = context;
    const violations: string[] = [];
    const suggestions: string[] = [];

    if (!PythonSatisfaction.hasPythonLockFile(projectRoot)) {
      violations.push(
        'Dependency graph is not locked — no uv.lock / poetry.lock / Pipfile.lock / pdm.lock found'
      );
      suggestions.push(
        'Lock the dependency graph (uv lock / poetry lock) and commit the lock file'
      );
    }

    if (!PythonSatisfaction.hasPythonDependencyScanner(projectRoot)) {
      violations.push(
        'No dependency vulnerability scanner in the gate — add pip-audit (or safety) to pre-commit/CI'
      );
      suggestions.push(
        'Run pip-audit against the locked set in pre-commit and CI, not just top-level requirements'
      );
    }

    const passed = violations.length === 0;
    return {
      passed,
      message: passed
        ? '✅ Dependencies are locked and scanned (pip-audit/safety in the gate)'
        : `${violations.length} dependency security violation(s) found`,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score: Math.max(0, 100 - violations.length * 30),
      fixable: !passed,
      config,
    };
  }

  static async check(context: LawCheckContext): Promise<LawResult> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // A Python project with no Node manifest cannot be judged by npm checkers.
    if (
      PythonSatisfaction.isPython(context.projectRoot) &&
      !PythonSatisfaction.hasPackageJson(context.projectRoot)
    ) {
      return await Promise.resolve(
        this.checkPythonDependencySecurity(context)
      );
    }

    try {
      // Check for npm audit integration
      const auditResult = NpmAuditChecker.check(context);
      if (auditResult.violations) violations.push(...auditResult.violations);
      if (auditResult.suggestions) suggestions.push(...auditResult.suggestions);

      // Check for vulnerable dependencies
      const vulnerabilityResult = VulnerabilityChecker.check(context);
      if (vulnerabilityResult.violations)
        violations.push(...vulnerabilityResult.violations);
      if (vulnerabilityResult.suggestions)
        suggestions.push(...vulnerabilityResult.suggestions);

      // Check dependency pinning
      const pinningResult = DependencyPinningChecker.check(context);
      if (pinningResult.violations)
        violations.push(...pinningResult.violations);
      if (pinningResult.suggestions)
        suggestions.push(...pinningResult.suggestions);

      // Check license compatibility
      const dependencyLicenseResult =
        DependencyLicenseAnalyzer.analyzeDependencyLicenses(
          context.projectRoot
        );

      // Get package.json for project license analysis
      const packageJson = ProjectTypeDetector.getPackageJson(
        context.projectRoot
      );
      const projectLicenseAnalysis = packageJson
        ? ProjectLicenseAnalyzer.checkProjectLicense(
            context.projectRoot,
            packageJson as PackageJsonLicense
          )
        : {
            violations: ['package.json not found'],
            suggestions: [],
            score: 0,
          };

      violations.push(...dependencyLicenseResult.violations);
      violations.push(...projectLicenseAnalysis.violations);
      suggestions.push(...dependencyLicenseResult.suggestions);
      suggestions.push(...projectLicenseAnalysis.suggestions);

      const passed = violations.length === 0;
      const score = Math.max(0, 100 - violations.length * 10);

      return await Promise.resolve({
        passed,
        message: passed
          ? 'All DependencyVulnerabilityAnalyzer dependency security requirements met'
          : `${violations.length} DependencyVulnerabilityAnalyzer dependency security violation(s) found`,
        details: [...violations, ...suggestions],
        violations,
        suggestions,
        score,
        fixable: violations.length > 0,
        config: context.config,
      });
    } catch (_error) {
      return Promise.resolve(
        LawErrorHandlingUtils.createCustomErrorResult(
          _error,
          'Failed to check DependencyVulnerabilityAnalyzer dependency security',
          context.config
        )
      );
    }
  }
}
