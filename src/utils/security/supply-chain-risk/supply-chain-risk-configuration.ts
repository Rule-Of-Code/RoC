/**
 * Supply Chain Risk Configuration
 * Centralized configuration for supply chain risk analysis
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
  readFileContent,
  getAllDependencies,
  loadPackageJson,
  hasCustomNpmRegistry,
  CONFIG_FILES,
  DIRECTORY_NAMES,
} = SharedUtils;

export interface RiskAnalysisResult {
  violations: string[];
  suggestions: string[];
  score: number;
}

// ============================================================================
// Suspicious Package Patterns
// ============================================================================

export const SUSPICIOUS_PATTERNS: RegExp[] = [
  // Typosquatting patterns
  /^reac[t|7]$/,
  /^expres[s|5]$/,
  /^lodas[h|4]$/,
  // Common malicious patterns
  /\d{8,}/,
  /[a-z]{1,3}\d{5,}/,
  /test[_-]?package/i,
  /temp[_-]?package/i,
];

export const RISKY_PACKAGES = [
  'eval',
  'serialize-javascript',
  'node-fetch-npm',
  'request',
  'bower',
] as const;

export const RISKY_INSTALL_SCRIPTS = [
  'preinstall',
  'postinstall',
  'preuninstall',
  'postuninstall',
] as const;

// ============================================================================
// Score Configuration
// ============================================================================

export const SCORE_REDUCTIONS = {
  suspiciousPackage: 5,
  highRiskPackage: 8,
  corruptedPackageLock: 15,
  lowIntegrityPackages: 10,
} as const;

// ============================================================================
// Validation Messages
// ============================================================================

export const MESSAGES = {
  suspiciousPackages: (count: number) =>
    `Found ${count} packages with suspicious names`,
  reviewSuspicious: (packages: string[]) =>
    `Review suspicious packages: ${packages.join(', ')}`,
  verifyLegitimacy: 'Verify package legitimacy before installation',
  highRiskPackages: (count: number) => `Found ${count} high-risk packages`,
  reviewHighRisk: (packages: string[]) =>
    `Review high-risk packages: ${packages.join(', ')}`,
  packageHasInstallScripts: (name: string) =>
    `Package ${name} has install scripts - review for safety`,
  reviewCustomRegistry: 'Review custom npm registry configuration for security',
  corruptedPackageLock: 'package-lock.json is corrupted or unreadable',
  regeneratePackageLock:
    'Regenerate package-lock.json: rm package-lock.json && npm install',
  lowIntegrityHashes: 'Many packages lack integrity hashes',
  updatePackageLock: 'Update package-lock.json to include integrity hashes',
  regenerateLockCmd: 'Run: rm package-lock.json && npm install',
} as const;

// ============================================================================
// Recommendations
// ============================================================================

export const RECOMMENDATIONS = [
  'Regularly audit dependencies for suspicious packages',
  'Use package-lock.json integrity hashes for verification',
  'Review install scripts of new dependencies',
  'Avoid deprecated or unmaintained packages',
  'Verify package authenticity before installation',
  'Use official npm registry or trusted private registries',
  'Implement automated supply chain security scanning',
  'Keep dependencies up-to-date to receive security patches',
] as const;

// ============================================================================
// Example Limits
// ============================================================================

export const MAX_EXAMPLES = 3;
export const INTEGRITY_THRESHOLD = 0.8;

// ============================================================================
// Helper Functions
// ============================================================================

export function isSuspiciousPackageName(name: string): boolean {
  return SUSPICIOUS_PATTERNS.some(pattern => pattern.test(name));
}

export function isRiskyPackage(packageName: string): boolean {
  return RISKY_PACKAGES.includes(
    packageName as (typeof RISKY_PACKAGES)[number]
  );
}

export function getNodeModulesPackagePath(
  projectRoot: string,
  packageName: string
): string {
  return joinPath(projectRoot, DIRECTORY_NAMES.NODE_MODULES, packageName);
}

export function getPackageJsonPath(packagePath: string): string {
  return joinPath(packagePath, CONFIG_FILES.PACKAGE_JSON);
}

export function hasRiskyInstallScripts(
  scripts: Record<string, string>
): boolean {
  return RISKY_INSTALL_SCRIPTS.some(script => scripts[script]);
}

export function getPackageLockPath(projectRoot: string): string {
  return joinPath(projectRoot, CONFIG_FILES.PACKAGE_LOCK_JSON);
}

export function hasIntegrity(pkgInfo: unknown): boolean {
  return (
    typeof pkgInfo === 'object' && pkgInfo !== null && 'integrity' in pkgInfo
  );
}

export function shouldCountPackage(pkgPath: string, pkgInfo: unknown): boolean {
  return pkgPath !== '' && typeof pkgInfo === 'object' && pkgInfo !== null;
}
