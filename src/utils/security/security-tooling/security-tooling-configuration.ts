/**
 * Security Tooling Configuration
 * Centralized configuration for security tooling analysis
 * RULE 2: Dogfooded with SharedUtils
 */

import * as SharedUtils from '../security-shared-utils';
export type { SecurityCheckResult } from '../security-shared-utils';

// ============================================================================
// Re-export SharedUtils
// ============================================================================

export const {
  createEmptyResult,
  mergeResults,
  joinPath,
  exists,
  readFile,
  safeReadFile,
  fileExists,
  checkFilesExist,
  checkFilesForContent,
  readFileContent,
  getAllDependencies,
  hasCustomNpmRegistry,
  DEFAULT_SCAN_CONFIG,
  DIRECTORY_NAMES,
  DOC_FILES,
} = SharedUtils;

export interface ToolingAnalysisResult {
  violations: string[];
  suggestions: string[];
  score: number;
}

// ============================================================================
// Security Tools Configuration
// ============================================================================

export const SECURITY_TOOLS: Record<string, string> = {
  snyk: 'Snyk vulnerability scanning',
  '@snyk/cli': 'Snyk CLI tool',
  'audit-ci': 'Audit CI for continuous integration',
  'npm-audit-resolver': 'NPM audit issue resolver',
  retire: 'JavaScript library vulnerability scanner',
  nsp: 'Node Security Project scanner (deprecated)',
  'eslint-plugin-security': 'ESLint security rules',
  helmet: 'Express.js security middleware',
  cors: 'Cross-origin resource sharing',
} as const;

export const SECURITY_SCRIPT_NAMES = [
  'security',
  'audit',
  'vulnerability',
  'security-check',
  'audit-check',
] as const;

export const SECURITY_SCRIPT_KEYWORDS = ['audit', 'snyk', 'retire'] as const;

// ============================================================================
// Configuration Files
// ============================================================================

export const SNYK_CONFIG_FILES = [
  '.snyk',
  'snyk.json',
  '.snyk.yml',
  '.snyk.yaml',
] as const;

export const VULN_DB_CONFIG_FILES = [
  '.nsprc',
  'retire.json',
  'audit-resolve.json',
  '.auditignore',
] as const;

export const DEPENDABOT_CONFIG_FILES = [
  'dependabot.yml',
  'dependabot.yaml',
] as const;

export const SECURITY_DOC_FILES = [
  DOC_FILES.SECURITY,
  `docs/${DOC_FILES.SECURITY}`,
  `${DIRECTORY_NAMES.GITHUB}/${DOC_FILES.SECURITY}`,
] as const;

// ============================================================================
// Score Configuration
// ============================================================================

export const SCORE_REDUCTIONS = {
  noSecurityTools: 20,
  fewSecurityTools: 5,
  noSecurityScripts: 10,
  noVulnDbIntegration: 25,
  noGitHubSecurity: 5,
  noAdditionalVulnTools: 10,
  noSecurityDoc: 5,
} as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const MESSAGES = {
  noSecurityTools: 'No dedicated security tools found',
  addSecurityTools:
    'Consider adding security scanning tools like Snyk or audit-ci',
  addEslintPlugin: 'Add ESLint security plugin for code analysis',
  moreToolsCoverage:
    'Consider adding more security tools for comprehensive coverage',
  noSecurityScripts: 'No security-related npm scripts found',
  addSecurityScript:
    'Add npm scripts for security checks (e.g., "security": "npm audit")',
  noVulnDbIntegration: 'No vulnerability database integration found',
  setupVulnScanning:
    'Set up Snyk, GitHub Dependabot, or other vulnerability scanning',
  createSnykConfig: 'Create .snyk file for Snyk configuration',
  enableDependabot:
    'Enable GitHub Dependabot for automated vulnerability alerts',
  additionalVulnTools: 'Consider additional vulnerability scanning tools',
  createSecurityMd:
    'Create SECURITY.md file with vulnerability reporting guidelines',
  reviewCustomRegistry: 'Review custom npm registry configuration for security',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Install dedicated security scanning tools (Snyk, audit-ci)',
  'Add ESLint security plugin for static code analysis',
  'Configure npm scripts for automated security checks',
  'Set up Snyk for continuous vulnerability monitoring',
  'Enable GitHub Dependabot for automated dependency updates',
  'Create security workflows for CI/CD pipelines',
  'Maintain SECURITY.md with vulnerability reporting guidelines',
  'Configure security alerts and notifications',
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * How many of the SECURITY_TOOLS packages (snyk, @snyk/cli, audit-ci,
 * npm-audit-resolver, retire, nsp, eslint-plugin-security, helmet, cors)
 * are keys of `deps` with a non-empty version.
 */
export function countInstalledSecurityTools(
  deps: Record<string, string>
): number {
  return Object.keys(SECURITY_TOOLS).filter(tool => deps[tool]).length;
}

/**
 * Whether `scripts` has a non-empty script named security, audit,
 * vulnerability, security-check or audit-check.
 */
export function hasSecurityScriptByName(
  scripts: Record<string, string>
): boolean {
  return SECURITY_SCRIPT_NAMES.some(name => scripts[name]);
}

/**
 * Whether any script command contains `audit`, `snyk` or `retire`
 * (case-sensitive substring), whatever the script is called.
 */
export function hasSecurityScriptByKeyword(
  scripts: Record<string, string>
): boolean {
  return Object.values(scripts).some(
    script =>
      typeof script === 'string' &&
      SECURITY_SCRIPT_KEYWORDS.some(keyword => script.includes(keyword))
  );
}

/**
 * Whether `.snyk`, `snyk.json`, `.snyk.yml` or `.snyk.yaml` exists at
 * the project root.
 */
export function checkSnykConfig(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, SNYK_CONFIG_FILES);
}

/**
 * Whether `.nsprc`, `retire.json`, `audit-resolve.json` or `.auditignore`
 * exists at the project root.
 */
export function checkVulnDbConfig(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, VULN_DB_CONFIG_FILES);
}

/**
 * Whether a SECURITY.md exists at the root, under `docs/` or under
 * `.github/`.
 */
export function checkSecurityDocumentation(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, SECURITY_DOC_FILES);
}

/**
 * The path of the project's `.github` directory, or null when it is absent.
 */
export function checkGitHubDir(projectRoot: string): string | null {
  const githubDir = joinPath(projectRoot, DIRECTORY_NAMES.GITHUB);
  return exists(githubDir) ? githubDir : null;
}

/** Whether `dependabot.yml` or `dependabot.yaml` exists in `githubDir`. */
export function checkDependabotConfig(githubDir: string): boolean {
  return DEPENDABOT_CONFIG_FILES.some(file =>
    exists(joinPath(githubDir, file))
  );
}

/** The path of `githubDir/workflows`, or null when it is absent. */
export function getWorkflowsDir(githubDir: string): string | null {
  const workflowsDir = joinPath(githubDir, DIRECTORY_NAMES.WORKFLOWS);
  return exists(workflowsDir) ? workflowsDir : null;
}

/**
 * Whether a workflow file name contains `security` or `audit`
 * (case-sensitive; the file's content is not read).
 */
export function isSecurityWorkflow(filename: string): boolean {
  return filename.includes('security') || filename.includes('audit');
}
