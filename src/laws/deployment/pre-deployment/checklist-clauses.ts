/**
 * The clauses of Pre-Deployment Checklist after the checklist and the build:
 * tests, a scanner in the gate, and — for a project that runs for users —
 * authentication, benchmarking, health checks and production logging. Each
 * takes the running score and returns what is left.
 */
import type { LawCheckContext } from '../../../types/law.types';
import { owningLawSatisfied } from '../../../utils/owning-law';
import { PythonSatisfaction } from '../../../utils/python-satisfaction';
import { PRE_DEPLOYMENT_PENALTY as PENALTY } from '../deployment-penalties';
import type { BuildValidationChecker } from './build-validator';
import type { PerformanceValidationChecker } from './performance-validator';
import type { SecurityValidationChecker } from './security-validator';

/** Clause 3: test scripts and test files; returns the score left. */
export function testingClause(
  context: LawCheckContext,
  buildValidator: BuildValidationChecker,
  violations: string[],
  suggestions: string[],
  score: number
): number {
  const { projectRoot } = context;
  let remaining = score;
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
    remaining -= PENALTY.testingSetup;
  } else if (!hasTestScripts) {
    // Has test files but no scripts - minor violation
    suggestions.push(
      'Consider adding test scripts to package.json for better automation'
    );
    remaining -= PENALTY.testScriptsOrFilesOnly;
  } else if (!hasTestFiles) {
    // Has scripts but no files - minor violation
    suggestions.push('Consider adding more test files to improve coverage');
    remaining -= PENALTY.testScriptsOrFilesOnly;
  }
  return remaining;
}

/** Clause 4: a dependency or code scanner in the gate; returns the score left. */
export function securityScanClause(
  projectRoot: string,
  securityValidator: SecurityValidationChecker,
  violations: string[],
  suggestions: string[],
  score: number
): number {
  let remaining = score;
  const securityScanning = securityValidator.checkSecurityScanning(projectRoot);
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
    remaining -= PENALTY.securityScanning;
  }
  return remaining;
}

/** Clauses 5 and 6: authentication and performance benchmarking; returns the score left. */
export async function serviceClauses(
  context: LawCheckContext,
  runsForUsers: boolean,
  validators: {
    securityValidator: SecurityValidationChecker;
    performanceValidator: PerformanceValidationChecker;
  },
  violations: string[],
  suggestions: string[],
  score: number
): Promise<number> {
  const { projectRoot } = context;
  const { securityValidator, performanceValidator } = validators;
  let remaining = score;
  const authSetup = securityValidator.checkAuthenticationSetup(
    projectRoot,
    context.config
  );
  if (
    runsForUsers &&
    !authSetup.authConfigured &&
    !PythonSatisfaction.hasAuthGuards(projectRoot) &&
    !(await owningLawSatisfied(context, 'Authentication Security'))
  ) {
    violations.push('Authentication/authorization setup not detected');
    suggestions.push('Implement proper authentication and security measures');
    remaining -= PENALTY.authentication;
  }

  // 6. Check performance benchmarking. A service benchmarks with Prometheus /
  // OpenTelemetry, not with an npm `perf` script.
  const performanceBenchmarking =
    performanceValidator.checkPerformanceBenchmarking(projectRoot);
  if (
    runsForUsers &&
    !performanceBenchmarking.benchmarkingConfigured &&
    !PythonSatisfaction.hasBackendPerformanceMonitoring(projectRoot) &&
    !(await owningLawSatisfied(context, 'Performance Monitoring Standards'))
  ) {
    violations.push('Performance benchmarking not configured');
    suggestions.push('Configure performance monitoring and benchmarking tools');
    remaining -= PENALTY.performanceBenchmarking;
  }
  return remaining;
}

/** Clause 7: health checks and production logging; returns the score left. */
export async function monitoringClauses(
  context: LawCheckContext,
  runsForUsers: boolean,
  performanceValidator: PerformanceValidationChecker,
  violations: string[],
  suggestions: string[],
  score: number
): Promise<number> {
  const { projectRoot } = context;
  let remaining = score;
  // Clause 7.
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
    runsForUsers &&
    !healthChecksConfigured &&
    !(await owningLawSatisfied(context, 'Health Check Monitoring'))
  ) {
    violations.push('Health checks not configured');
    suggestions.push('Implement health check endpoints for monitoring');
    remaining -= PENALTY.healthChecks;
  }

  const loggingConfigured =
    monitoringSetup.loggingConfigured ||
    PythonSatisfaction.hasStructuredLogging(projectRoot);
  if (
    runsForUsers &&
    !loggingConfigured &&
    !(await owningLawSatisfied(context, 'Centralized Logging'))
  ) {
    violations.push('Logging not properly configured');
    suggestions.push('Configure structured logging for production');
    remaining -= PENALTY.logging;
  }
  return remaining;
}
