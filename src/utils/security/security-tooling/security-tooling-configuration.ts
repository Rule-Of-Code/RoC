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

export function countInstalledSecurityTools(
  deps: Record<string, string>
): number {
  return Object.keys(SECURITY_TOOLS).filter(tool => deps[tool]).length;
}

export function hasSecurityScriptByName(
  scripts: Record<string, string>
): boolean {
  return SECURITY_SCRIPT_NAMES.some(name => scripts[name]);
}

export function hasSecurityScriptByKeyword(
  scripts: Record<string, string>
): boolean {
  return Object.values(scripts).some(
    script =>
      typeof script === 'string' &&
      SECURITY_SCRIPT_KEYWORDS.some(keyword => script.includes(keyword))
  );
}

export function checkSnykConfig(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, SNYK_CONFIG_FILES);
}

export function checkVulnDbConfig(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, VULN_DB_CONFIG_FILES);
}

export function checkSecurityDocumentation(projectRoot: string): boolean {
  return checkFilesExist(projectRoot, SECURITY_DOC_FILES);
}

export function checkGitHubDir(projectRoot: string): string | null {
  const githubDir = joinPath(projectRoot, DIRECTORY_NAMES.GITHUB);
  return exists(githubDir) ? githubDir : null;
}

export function checkDependabotConfig(githubDir: string): boolean {
  return DEPENDABOT_CONFIG_FILES.some(file =>
    exists(joinPath(githubDir, file))
  );
}

export function getWorkflowsDir(githubDir: string): string | null {
  const workflowsDir = joinPath(githubDir, DIRECTORY_NAMES.WORKFLOWS);
  return exists(workflowsDir) ? workflowsDir : null;
}

export function isSecurityWorkflow(filename: string): boolean {
  return filename.includes('security') || filename.includes('audit');
}
