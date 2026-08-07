/**
 * Supply Chain Risk Validation Patterns
 * Validation workflow for supply chain risk analysis
 * RULE 2: Uses Config helpers for all operations
 */

import * as Config from './supply-chain-risk-configuration';

// ============================================================================
// Suspicious Package Detection
// ============================================================================

export function detectSuspiciousPackages(
  dependencies: Record<string, string>
): { count: number; examples: string[] } {
  const packageNames = Object.keys(dependencies);
  const suspicious = packageNames.filter(Config.isSuspiciousPackageName);

  return {
    count: suspicious.length,
    examples: suspicious.slice(0, Config.MAX_EXAMPLES),
  };
}

export function analyzeSuspiciousPackages(
  dependencies: Record<string, string>
): Config.RiskAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const { count, examples } = detectSuspiciousPackages(dependencies);

  if (count > 0) {
    violations.push(Config.MESSAGES.suspiciousPackages(count));
    if (examples.length > 0) {
      suggestions.push(Config.MESSAGES.reviewSuspicious(examples));
    }
    suggestions.push(Config.MESSAGES.verifyLegitimacy);
    score -= count * Config.SCORE_REDUCTIONS.suspiciousPackage;
  }

  return { violations, suggestions, score: Math.max(0, score) };
}

// ============================================================================
// Risky Package Detection
// ============================================================================

export function detectRiskyPackages(dependencies: Record<string, string>): {
  count: number;
  examples: string[];
} {
  const risky: string[] = [];

  for (const [name, version] of Object.entries(dependencies)) {
    if (Config.isRiskyPackage(name)) {
      risky.push(`${name}@${version}`);
    }
  }

  return {
    count: risky.length,
    examples: risky.slice(0, Config.MAX_EXAMPLES),
  };
}

export function analyzeRiskyPackages(
  dependencies: Record<string, string>
): Config.RiskAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const { count, examples } = detectRiskyPackages(dependencies);

  if (count > 0) {
    violations.push(Config.MESSAGES.highRiskPackages(count));
    if (examples.length > 0) {
      suggestions.push(Config.MESSAGES.reviewHighRisk(examples));
    }
    score -= count * Config.SCORE_REDUCTIONS.highRiskPackage;
  }

  return { violations, suggestions, score: Math.max(0, score) };
}

// ============================================================================
// Install Script Detection
// ============================================================================

export function checkPackageInstallScripts(
  packageName: string,
  projectRoot: string,
  suggestions: string[]
): void {
  const packagePath = Config.getNodeModulesPackagePath(
    projectRoot,
    packageName
  );
  if (!Config.exists(packagePath)) return;

  const packageJsonPath = Config.getPackageJsonPath(packagePath);
  if (!Config.exists(packageJsonPath)) return;

  const depPackageJson = Config.loadPackageJson(packageJsonPath);
  if (!depPackageJson) return;

  const scripts = (depPackageJson.scripts ?? {}) as Record<string, string>;
  if (Config.hasRiskyInstallScripts(scripts)) {
    suggestions.push(Config.MESSAGES.packageHasInstallScripts(packageName));
  }
}

// ============================================================================
// Package Integrity
// ============================================================================

export function countPackageIntegrity(packageLock: Record<string, unknown>): {
  packagesWithIntegrity: number;
  totalPackages: number;
} {
  let packagesWithIntegrity = 0;
  let totalPackages = 0;

  const { packages } = packageLock;
  if (!packages || typeof packages !== 'object') {
    return { packagesWithIntegrity, totalPackages };
  }

  for (const [pkgPath, pkgInfo] of Object.entries(packages)) {
    if (Config.shouldCountPackage(pkgPath, pkgInfo)) {
      totalPackages++;
      if (Config.hasIntegrity(pkgInfo)) {
        packagesWithIntegrity++;
      }
    }
  }

  return { packagesWithIntegrity, totalPackages };
}

export function checkPackageLockIntegrity(
  projectRoot: string
): Config.RiskAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const packageLockPath = Config.getPackageLockPath(projectRoot);
  if (!Config.exists(packageLockPath)) {
    return { violations, suggestions, score };
  }

  const packageLock = Config.loadPackageJson(packageLockPath);
  if (!packageLock) {
    violations.push(Config.MESSAGES.corruptedPackageLock);
    suggestions.push(Config.MESSAGES.regeneratePackageLock);
    return {
      violations,
      suggestions,
      score: score - Config.SCORE_REDUCTIONS.corruptedPackageLock,
    };
  }

  const { packagesWithIntegrity, totalPackages } =
    countPackageIntegrity(packageLock);
  if (
    totalPackages > 0 &&
    packagesWithIntegrity / totalPackages < Config.INTEGRITY_THRESHOLD
  ) {
    violations.push(Config.MESSAGES.lowIntegrityHashes);
    suggestions.push(Config.MESSAGES.updatePackageLock);
    suggestions.push(Config.MESSAGES.regenerateLockCmd);
    score -= Config.SCORE_REDUCTIONS.lowIntegrityPackages;
  }

  return { violations, suggestions, score: Math.max(0, score) };
}

// ============================================================================
// NPM Registry Security
// ============================================================================

export function checkNpmrcSecurity(
  projectRoot: string
): Config.RiskAnalysisResult {
  const suggestions: string[] = [];

  if (Config.hasCustomNpmRegistry(projectRoot)) {
    suggestions.push(Config.MESSAGES.reviewCustomRegistry);
  }

  return { violations: [], suggestions, score: 100 };
}

// ============================================================================
// Main Analysis Function
// ============================================================================

export function performSupplyChainAnalysis(
  packageJson: unknown,
  projectRoot: string
): Config.RiskAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const allDependencies = Config.getAllDependencies(packageJson);

  if (Object.keys(allDependencies).length === 0) {
    return { violations, suggestions, score };
  }

  // Analyze suspicious packages
  const suspiciousResult = analyzeSuspiciousPackages(allDependencies);
  violations.push(...suspiciousResult.violations);
  suggestions.push(...suspiciousResult.suggestions);
  score = Math.min(score, suspiciousResult.score);

  // Analyze risky packages
  const riskyResult = analyzeRiskyPackages(allDependencies);
  violations.push(...riskyResult.violations);
  suggestions.push(...riskyResult.suggestions);
  score = Math.min(score, riskyResult.score);

  // Check install scripts for each package
  for (const packageName of Object.keys(allDependencies)) {
    checkPackageInstallScripts(packageName, projectRoot, suggestions);
  }

  // Check package integrity
  const integrityResult = checkPackageLockIntegrity(projectRoot);
  violations.push(...integrityResult.violations);
  suggestions.push(...integrityResult.suggestions);
  score = Math.min(score, integrityResult.score);

  // Check npm registry security
  const registryResult = checkNpmrcSecurity(projectRoot);
  suggestions.push(...registryResult.suggestions);

  return { violations, suggestions, score: Math.max(0, score) };
}
