import { notReadNote, readJsonManifest } from '../json-manifest';
import { ProjectTypeDetector } from '../config/project-type-detector';
import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { checkGitHubSecurityFeatures } from './github-security-features';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
const PACKAGE_JSON = 'package.json';

/**
 * Security Policy Checker
 * Specialized utility for checking security policies and audit resolution configuration
 */
export class SecurityPolicyChecker {
  /**
   * Base method for creating security check results
   */
  private static createSecurityCheckResult(
    checkFunction: (
      projectRoot: string,
      violations: string[],
      suggestions: string[]
    ) => number,
    projectRoot: string
  ): { violations: string[]; suggestions: string[]; score: number } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    score += checkFunction(projectRoot, violations, suggestions);
    return { violations, suggestions, score };
  }

  /**
   * Check for audit resolve configuration
   */
  static checkAuditResolve(projectRoot: string): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    return this.createSecurityCheckResult(
      (projectRoot, violations, suggestions) => {
        let scoreModifier = 0;

        const hasAuditConfig = this.checkNpmrcAuditConfig(projectRoot);
        const packageAudit = this.checkPackageJsonAuditConfig(projectRoot);
        // An unreadable package.json is said so, not "no audit config" (#486).
        if (typeof packageAudit === 'string') violations.push(packageAudit);
        const hasAuditResolveFile = this.checkAuditResolveFiles(projectRoot);

        // Evaluate audit resolve configuration
        if (!hasAuditConfig && !packageAudit && !hasAuditResolveFile) {
          violations.push('No audit resolution configuration found');
          suggestions.push(
            'Configure audit-level in .npmrc or add audit scripts'
          );
          suggestions.push(
            'Consider using audit-resolve for managing known vulnerabilities'
          );
          scoreModifier -= 20;
        } else {
          if (!hasAuditResolveFile) {
            suggestions.push(
              'Consider using audit-resolve.json for tracking resolved vulnerabilities'
            );
          }
        }

        return scoreModifier;
      },
      projectRoot
    );
  }

  private static checkNpmrcAuditConfig(projectRoot: string): boolean {
    const npmrcPath = PathOperations.join(projectRoot, '.npmrc');

    if (FileUtils.exists(npmrcPath)) {
      try {
        const npmrcContent = FileUtils.readFile(npmrcPath);
        if (
          npmrcContent.includes('audit-level') ||
          npmrcContent.includes('audit')
        ) {
          return true;
        }
      } catch (_error) {
        // Skip if can't read .npmrc
      }
    }
    return false;
  }

  /**
   * Whether package.json declares an audit script or tool; the not-read note
   * when it cannot be read. RoC's own config loader read it before, and
   * returned null for every package.json (#486).
   */
  private static checkPackageJsonAuditConfig(projectRoot: string) {
    const packageJsonPath = PathOperations.join(projectRoot, PACKAGE_JSON);
    const read = readJsonManifest(packageJsonPath);
    if (read.notRead && FileUtils.exists(packageJsonPath))
      return notReadNote(PACKAGE_JSON, read.notRead, 'its scripts were');

    if (read.data) {
      try {
        // Check for audit scripts
        const scripts = (read.data.scripts ?? {}) as Record<string, string>;
        const auditScripts = [
          'audit',
          'security',
          'security-check',
          'vuln-check',
        ];

        for (const scriptName of auditScripts) {
          if (scripts[scriptName]) {
            return true;
          }
        }

        // Check for security-related dependencies
        const allDeps =
          ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);

        const securityTools = [
          'audit-ci',
          'npm-audit-resolver',
          'audit-resolve',
          'snyk',
          '@snyk/cli',
        ];

        for (const tool of securityTools) {
          if (allDeps[tool]) {
            return true;
          }
        }
      } catch (_error) {
        // Skip if can't parse package.json
      }
    }
    return false;
  }

  private static checkAuditResolveFiles(projectRoot: string): boolean {
    const auditConfigFiles = [
      'audit-resolve.json',
      'audit.json',
      '.audit-resolve.json',
      'security.json',
    ];

    for (const configFile of auditConfigFiles) {
      const configPath = PathOperations.join(projectRoot, configFile);
      if (FileUtils.exists(configPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check for security policies
   */
  static checkSecurityPolicies(projectRoot: string): {
    violations: string[];
    suggestions: string[];
    score: number;
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    score += this.checkSecurityPolicyFiles(
      projectRoot,
      violations,
      suggestions
    );
    score += checkGitHubSecurityFeatures(projectRoot, suggestions);
    score += this.checkPackageJsonSecurity(projectRoot, suggestions);

    return { violations, suggestions, score };
  }

  private static checkSecurityPolicyFiles(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): number {
    // The one place the law asks for a security policy (#439): the security
    // documentation analyzer no longer asks for the same file again.
    const securityFiles = [
      'SECURITY.md',
      'SECURITY.txt',
      'docs/SECURITY.md',
      '.github/SECURITY.md',
      'security.md',
      'docs/security.md',
    ];

    let hasSecurityPolicy = false;
    for (const securityFile of securityFiles) {
      const securityPath = PathOperations.join(projectRoot, securityFile);
      if (FileUtils.exists(securityPath)) {
        hasSecurityPolicy = true;
        break;
      }
    }

    if (!hasSecurityPolicy) {
      violations.push('No security policy documentation found');
      suggestions.push(
        'Create SECURITY.md with vulnerability reporting procedures'
      );
      return -15;
    }
    return 0;
  }

  private static checkPackageJsonSecurity(
    projectRoot: string,
    suggestions: string[]
  ): number {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      return 0;
    }

    try {
      const packageJson = ProjectTypeDetector.getPackageJson(packageJsonPath);
      return this.analyzePackageJsonSecurity(
        packageJson as Record<string, unknown>,
        suggestions
      );
    } catch (_error) {
      return 0;
    }
  }

  private static analyzePackageJsonSecurity(
    packageJson: Record<string, unknown>,
    suggestions: string[]
  ): number {
    let score = 0;

    // Check for security-related metadata
    if (
      !packageJson.bugs ||
      typeof packageJson.bugs !== 'object' ||
      !('url' in packageJson.bugs)
    ) {
      suggestions.push(
        'Add bug reporting URL to package.json for security issue reporting'
      );
      score -= 2;
    }

    if (!packageJson.repository) {
      suggestions.push(
        'Add repository URL to package.json for security policy discovery'
      );
      score -= 2;
    }

    return score;
  }
}
