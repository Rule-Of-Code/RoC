/**
 * Security Tooling Validation Patterns
 * Validation workflow for security tooling analysis
 * RULE 2: Uses Config helpers for all operations
 */

import { DirectoryScanner } from '../../directory-scanner';
import * as Config from './security-tooling-configuration';

// ============================================================================
// Security Tools Analysis
// ============================================================================

/**
 * Counts the security packages among the dependencies of `packageJson`:
 * none is a violation ("No dedicated security tools found", score 80);
 * exactly one is a suggestion to add more (score 95).
 */
export function analyzeSecurityTools(
  packageJson: unknown
): Config.ToolingAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let scoreReduction = 0;

  const allDeps = Config.getAllDependencies(packageJson);
  const installedTools = Config.countInstalledSecurityTools(allDeps);

  if (installedTools === 0) {
    violations.push(Config.MESSAGES.noSecurityTools);
    suggestions.push(Config.MESSAGES.addSecurityTools);
    suggestions.push(Config.MESSAGES.addEslintPlugin);
    scoreReduction = Config.SCORE_REDUCTIONS.noSecurityTools;
  } else if (installedTools < 2) {
    suggestions.push(Config.MESSAGES.moreToolsCoverage);
    scoreReduction = Config.SCORE_REDUCTIONS.fewSecurityTools;
  }

  return { violations, suggestions, score: 100 - scoreReduction };
}

// ============================================================================
// Security Scripts Analysis
// ============================================================================

/**
 * A violation ("No security-related npm scripts found", score 90) when
 * no script is named like a security check and no script command runs
 * audit, snyk or retire.
 */
export function analyzeSecurityScripts(
  packageJson: unknown
): Config.ToolingAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let scoreReduction = 0;

  const pkg = packageJson as { scripts?: Record<string, string> };
  const scripts = pkg.scripts ?? {};
  const hasSecurityScripts =
    Config.hasSecurityScriptByName(scripts) ||
    Config.hasSecurityScriptByKeyword(scripts);

  if (!hasSecurityScripts) {
    violations.push(Config.MESSAGES.noSecurityScripts);
    suggestions.push(Config.MESSAGES.addSecurityScript);
    scoreReduction = Config.SCORE_REDUCTIONS.noSecurityScripts;
  }

  return { violations, suggestions, score: 100 - scoreReduction };
}

// ============================================================================
// Vulnerability Database Analysis
// ============================================================================

/**
 * Looks for a Snyk config, an audit/retire config, and GitHub security
 * (a Dependabot config, or a workflow whose file name contains security
 * or audit). None of the three is a violation (score -25); missing GitHub
 * security or both config kinds only lowers the score with a suggestion.
 * A missing SECURITY.md (root, docs/ or .github/) is a suggestion (-5).
 */
export function analyzeVulnerabilityDatabases(
  projectRoot: string
): Config.ToolingAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const hasSnykConfig = Config.checkSnykConfig(projectRoot);
  const hasVulnDbConfig = Config.checkVulnDbConfig(projectRoot);
  const hasGitHubSecurity = checkGitHubSecurityConfig(projectRoot);
  const hasSecurityDoc = Config.checkSecurityDocumentation(projectRoot);

  score += evaluateVulnerabilityIntegration(
    hasSnykConfig,
    hasVulnDbConfig,
    hasGitHubSecurity,
    violations,
    suggestions
  );

  if (!hasSecurityDoc) {
    suggestions.push(Config.MESSAGES.createSecurityMd);
    score -= Config.SCORE_REDUCTIONS.noSecurityDoc;
  }

  return { violations, suggestions, score: Math.max(0, score) };
}

function checkGitHubSecurityConfig(projectRoot: string): boolean {
  const githubDir = Config.checkGitHubDir(projectRoot);
  if (!githubDir) return false;

  if (Config.checkDependabotConfig(githubDir)) return true;

  return checkSecurityWorkflowsExist(githubDir);
}

function checkSecurityWorkflowsExist(githubDir: string): boolean {
  const workflowsDir = Config.getWorkflowsDir(githubDir);
  if (!workflowsDir) return false;

  try {
    const workflows = DirectoryScanner.scanDirectory(
      workflowsDir,
      Config.DEFAULT_SCAN_CONFIG,
      { filesOnly: true }
    );
    return workflows.files.some(Config.isSecurityWorkflow);
  } catch {
    return false;
  }
}

function evaluateVulnerabilityIntegration(
  hasSnykConfig: boolean,
  hasVulnDbConfig: boolean,
  hasGitHubSecurity: boolean,
  violations: string[],
  suggestions: string[]
): number {
  let scoreAdjustment = 0;

  if (!hasSnykConfig && !hasVulnDbConfig && !hasGitHubSecurity) {
    violations.push(Config.MESSAGES.noVulnDbIntegration);
    suggestions.push(Config.MESSAGES.setupVulnScanning);
    suggestions.push(Config.MESSAGES.createSnykConfig);
    scoreAdjustment -= Config.SCORE_REDUCTIONS.noVulnDbIntegration;
  } else {
    if (!hasGitHubSecurity) {
      suggestions.push(Config.MESSAGES.enableDependabot);
      scoreAdjustment -= Config.SCORE_REDUCTIONS.noGitHubSecurity;
    }
    if (!hasSnykConfig && !hasVulnDbConfig) {
      suggestions.push(Config.MESSAGES.additionalVulnTools);
      scoreAdjustment -= Config.SCORE_REDUCTIONS.noAdditionalVulnTools;
    }
  }

  return scoreAdjustment;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Runs the tools, scripts and vulnerability-database checks and returns
 * their violations and suggestions together, scored by the LOWEST of
 * the three scores (not their sum).
 */
export function performSecurityToolingAnalysis(
  packageJson: unknown,
  projectRoot: string
): Config.ToolingAnalysisResult {
  const violations: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  const toolsAnalysis = analyzeSecurityTools(packageJson);
  violations.push(...toolsAnalysis.violations);
  suggestions.push(...toolsAnalysis.suggestions);
  score = Math.min(score, toolsAnalysis.score);

  const scriptsAnalysis = analyzeSecurityScripts(packageJson);
  violations.push(...scriptsAnalysis.violations);
  suggestions.push(...scriptsAnalysis.suggestions);
  score = Math.min(score, scriptsAnalysis.score);

  const vulnDbAnalysis = analyzeVulnerabilityDatabases(projectRoot);
  violations.push(...vulnDbAnalysis.violations);
  suggestions.push(...vulnDbAnalysis.suggestions);
  score = Math.min(score, vulnDbAnalysis.score);

  return { violations, suggestions, score: Math.max(0, score) };
}
