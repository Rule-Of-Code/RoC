/**
 * Points each deployment law takes off its score of 100, per check that
 * finds a piece missing. One table per law, beside the laws rather than in
 * them: most of those files are already past the module size limit.
 */

/** Automated Code Quality Gates. */
export const QUALITY_GATES_PENALTY = {
  linting: 20,
  formatting: 15,
  coverage: 20,
  build: 15,
  security: 15,
  typeScriptStrict: 10,
} as const;

/** Health Check Monitoring. */
export const HEALTH_CHECK_PENALTY = {
  endpoints: 30,
  database: 25,
  externalServices: 20,
  kubernetesProbes: 15,
  monitoring: 10,
} as const;

/** Launch Readiness Checklist. */
export const LAUNCH_READINESS_PENALTY = {
  checklist: 30,
  testingCompleteness: 25,
  securityReview: 15,
  monitoring: 10,
} as const;

/** Pre-Deployment Checklist. */
export const PRE_DEPLOYMENT_PENALTY = {
  checklistMissing: 35,
  checklistIncomplete: 25,
  buildSetup: 20,
  testingSetup: 20,
  testScriptsOrFilesOnly: 5,
  securityScanning: 25,
  authentication: 20,
  performanceBenchmarking: 15,
  healthChecks: 10,
  logging: 10,
} as const;

/** Pre-PR Quality Gates. */
export const PRE_PR_PENALTY = {
  preCommitHooks: 25,
  prTemplates: 20,
  branchProtection: 20,
  statusChecks: 15,
  prValidation: 10,
  codeReview: 10,
} as const;
