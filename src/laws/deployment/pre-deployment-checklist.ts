import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ConfigHelper } from '../../utils/config-helper';
import { concernIsWaived } from '../../utils/law-waivers';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { BuildValidationChecker } from './pre-deployment/build-validator';
import { ChecklistDocumentValidator } from './pre-deployment/checklist-validator';
import { PerformanceValidationChecker } from './pre-deployment/performance-validator';
import { SecurityValidationChecker } from './pre-deployment/security-validator';
import { DeploymentValidationUtilities } from './shared-deployment-utilities';

/**
 * Pre-Deployment Checklist Law - Refactored Modular Version
 *
 * Critical MANDATORY law for comprehensive pre-deployment validation that checks for:
 * - PRE_DEPLOYMENT_CHECKLIST.md existence and completion
 * - Build validation and automated tests passing
 * - Security vulnerability scanning completion
 * - Performance benchmarking validation
 * - Code quality gates validation
 * - Configuration validation for production
 * - Database migration validation
 * - Infrastructure readiness verification
 * - Monitoring and alerting setup
 * - Rollback strategy preparation
 *
 * Professional modular implementation following deployment best practices
 * Status: CRITICAL - Deployment BLOCKED until all checks pass
 */
export class PreDeploymentChecklistLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;
    const { projectRoot } = context;

    // 1. Check for PRE_DEPLOYMENT_CHECKLIST.md existence and completion
    const checklistResult = this.validateChecklist(
      projectRoot,
      ConfigHelper.getConfigFromContext(context)
    );
    violations.push(...checklistResult.violations);
    suggestions.push(...checklistResult.suggestions);
    score -= checklistResult.scoreDeduction;

    // 2. Check build validation setup
    const buildResult = this.validateBuildSetup(projectRoot, context);
    violations.push(...buildResult.violations);
    suggestions.push(...buildResult.suggestions);
    score -= buildResult.scoreDeduction;

    // The build check above used to run TWICE — validateBuildSetup, and then the
    // same check again by hand — so one defect produced two violations, in two
    // different wordings ("not configured properly" / "not properly configured").
    // The reader could not tell whether that was one problem or two (a backend consumer,
    // F3). One check, one violation.
    const buildValidator = new BuildValidationChecker();

    // 3. Check testing setup - be more tolerant with test file detection
    const testingSetup = buildValidator.checkTestingSetup(projectRoot, context);
    // Only fail if BOTH test scripts are missing AND no test files found
    // Having test files OR test scripts is acceptable
    const hasTestScripts =
      (testingSetup.configured && testingSetup.testScripts.length > 0) ||
      PythonSatisfaction.hasTestFramework(projectRoot);
    const hasTestFiles = testingSetup.testFiles > 0;

    if (!hasTestScripts && !hasTestFiles) {
      violations.push('Testing setup incomplete or no test files found');
      suggestions.push('Configure test scripts and create comprehensive tests');
      score -= 20;
    } else if (!hasTestScripts) {
      // Has test files but no scripts - minor violation
      suggestions.push(
        'Consider adding test scripts to package.json for better automation'
      );
      score -= 5;
    } else if (!hasTestFiles) {
      // Has scripts but no files - minor violation
      suggestions.push('Consider adding more test files to improve coverage');
      score -= 5;
    }

    // 4. Check security scanning. `npm audit` is not the only scanner there is:
    // bandit and pip-audit in the gate are exactly the same evidence.
    const securityValidator = new SecurityValidationChecker();
    const securityScanning =
      securityValidator.checkSecurityScanning(projectRoot);
    const securityScanningConfigured =
      securityScanning.npmAuditConfigured ||
      securityScanning.securityScripts.length > 0 ||
      PythonSatisfaction.hasPythonSast(projectRoot) ||
      PythonSatisfaction.hasPythonDependencyScanner(projectRoot);
    if (!securityScanningConfigured) {
      violations.push('Security vulnerability scanning not configured');
      suggestions.push(
        'Configure a dependency and code scanner in the gate (npm audit, or pip-audit + bandit)'
      );
      score -= 25;
    }

    // A sub-check is not addressable: there is no `laws.notApplicable` entry
    // for "the auth clause of the checklist law". So each clause below defers
    // to the law that OWNS its concern — if a project has declared
    // Authentication Security or Health Check Monitoring inapplicable, with a
    // written reason the audit accepted, this law does not ask again. The tool
    // already holds that reason; it is one lookup away.
    //
    // The CHECKLIST clauses are untouched: the document is this law's own
    // subject, and satisfying them is what it is for.
    // 5. Check authentication setup — @login_required / abort(401) is an auth
    // guard, not merely an Express middleware.
    const authSetup = securityValidator.checkAuthenticationSetup(
      projectRoot,
      context.config
    );
    if (
      !authSetup.authConfigured &&
      !PythonSatisfaction.hasAuthGuards(projectRoot) &&
      !concernIsWaived(context.config, 'Authentication Security')
    ) {
      violations.push('Authentication/authorization setup not detected');
      suggestions.push('Implement proper authentication and security measures');
      score -= 20;
    }

    // 6. Check performance benchmarking. A service benchmarks with Prometheus /
    // OpenTelemetry, not with an npm `perf` script.
    const performanceValidator = new PerformanceValidationChecker();
    const performanceBenchmarking =
      performanceValidator.checkPerformanceBenchmarking(projectRoot);
    if (
      !performanceBenchmarking.benchmarkingConfigured &&
      !PythonSatisfaction.hasBackendPerformanceMonitoring(projectRoot) &&
      !concernIsWaived(context.config, 'Performance Monitoring Standards')
    ) {
      violations.push('Performance benchmarking not configured');
      suggestions.push(
        'Configure performance monitoring and benchmarking tools'
      );
      score -= 15;
    }

    // 7. Check monitoring setup.
    //
    // This law never asked PythonSatisfaction — though `hasHealthEndpoint()` and
    // `hasAuthGuards()` live in the same package — so it told a Flask service
    // "Health checks not configured" while prod answered GET /api/health with a
    // 200 (a backend consumer, F3). A route the service actually serves IS a health check.
    const monitoringSetup = performanceValidator.checkMonitoringSetup(
      projectRoot,
      context.config
    );
    const healthChecksConfigured =
      monitoringSetup.healthChecksConfigured ||
      PythonSatisfaction.hasHealthEndpoint(projectRoot);
    if (
      !healthChecksConfigured &&
      !concernIsWaived(context.config, 'Health Check Monitoring')
    ) {
      violations.push('Health checks not configured');
      suggestions.push('Implement health check endpoints for monitoring');
      score -= 10;
    }

    const loggingConfigured =
      monitoringSetup.loggingConfigured ||
      PythonSatisfaction.hasStructuredLogging(projectRoot);
    if (
      !loggingConfigured &&
      !concernIsWaived(context.config, 'Centralized Logging')
    ) {
      violations.push('Logging not properly configured');
      suggestions.push('Configure structured logging for production');
      score -= 10;
    }

    // Calculate final score
    score = Math.max(0, score);

    const passed = violations.length === 0;
    const message = passed
      ? '✅ Pre-deployment checklist validation passed - deployment ready'
      : `❌ Pre-deployment checklist validation failed - ${violations.length} critical issues found`;

    return {
      passed,
      message,
      details: [...violations, ...suggestions],
      violations,
      suggestions,
      score,
      config: context.config,
    };
  }

  /**
   * Generate a comprehensive pre-deployment checklist template
   */
  static generateChecklistTemplate(): string {
    const checklistValidator = new ChecklistDocumentValidator();
    return checklistValidator.generateChecklistTemplate();
  }

  /**
   * Get detailed validation status for all components
   */
  static getDetailedStatus(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    checklist: unknown;
    build: unknown;
    testing: unknown;
    security: unknown;
    authentication: unknown;
    performance: unknown;
    monitoring: unknown;
  } {
    const checklistValidator = new ChecklistDocumentValidator();
    const buildValidator = new BuildValidationChecker();
    const securityValidator = new SecurityValidationChecker();
    const performanceValidator = new PerformanceValidationChecker();

    return {
      checklist: checklistValidator.checkPreDeploymentChecklist(
        projectRoot,
        config
      ),
      build: buildValidator.checkBuildValidation(projectRoot, {
        projectRoot,
        config,
      }),
      testing: buildValidator.checkTestingSetup(projectRoot),
      security: securityValidator.checkSecurityScanning(projectRoot),
      authentication: securityValidator.checkAuthenticationSetup(
        projectRoot,
        config
      ),
      performance:
        performanceValidator.checkPerformanceBenchmarking(projectRoot),
      monitoring: performanceValidator.checkMonitoringSetup(
        projectRoot,
        config
      ),
    };
  }

  private static validateChecklist(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
    scoreDeduction: number;
  } {
    const checklistValidator = new ChecklistDocumentValidator();

    return DeploymentValidationUtilities.validateChecklistGeneric(
      projectRoot,
      config,
      (projectRoot, config) =>
        checklistValidator.checkPreDeploymentChecklist(projectRoot, config),
      (checklistStatus, violations, suggestions) => {
        if (!checklistStatus.exists) {
          violations.push(
            'PRE_DEPLOYMENT_CHECKLIST.md missing - CRITICAL violation'
          );
          suggestions.push(
            'Create comprehensive PRE_DEPLOYMENT_CHECKLIST.md with validation steps'
          );
          return 35;
        } else if (!checklistStatus.isComplete) {
          // We judge what the checklist COVERS, never whether its boxes are
          // ticked: the boxes belong to a deployment, not to the repository.
          const missing = checklistStatus.missingConcerns ?? [];
          violations.push(
            missing.length > 0
              ? `PRE_DEPLOYMENT_CHECKLIST.md has no steps for: ${missing.join(', ')}`
              : 'PRE_DEPLOYMENT_CHECKLIST.md contains no checklist steps'
          );
          suggestions.push(
            missing.length > 0
              ? `Add checklist steps covering ${missing.join(', ')} — leave the boxes UNTICKED; they are ticked at deployment time, not committed`
              : 'Add checklist steps (- [ ] ...) for build & tests, security, and rollback'
          );
          return 25;
        }

        for (const advised of checklistStatus.missingAdvisedConcerns ?? []) {
          suggestions.push(
            `Consider adding checklist steps for ${advised} (advisory, not required)`
          );
        }
        return 0;
      }
    );
  }

  private static readonly validateBuildSetup =
    DeploymentValidationUtilities.createStandardValidation(
      (projectRoot, context) => {
        const buildValidator = new BuildValidationChecker();
        const result = buildValidator.checkBuildValidation(projectRoot, context);
        // A PEP 517 [build-system] (or a Dockerfile) IS a build setup; the
        // checker below only reads package.json scripts.
        return {
          ...result,
          configured:
            result.configured ||
            PythonSatisfaction.hasPythonBuildSystem(projectRoot),
        };
      },
      (buildValidation, violations, suggestions) => {
        if (!buildValidation.configured) {
          // One violation, one wording. This law used to emit both "Build
          // validation not properly configured" and "…not configured properly"
          // for the same defect — the reader cannot tell whether that is one
          // problem or two (a backend consumer, F3).
          violations.push('Build validation not properly configured');
          suggestions.push(
            'Set up proper build scripts and configuration validation'
          );
          return 20;
        }
        return 0;
      }
    );
}
