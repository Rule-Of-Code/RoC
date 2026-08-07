import { ConfigFileUtils } from '../config-file-utils';
import { ProjectTypeDetector } from '../config/project-type-detector';
import { ProjectTypeDetectorValidation } from '../config/project-type-detector/project-type-detector-validation';
import { DirectoryScanner } from '../directory-scanner';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
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
        const hasPackageAuditConfig =
          this.checkPackageJsonAuditConfig(projectRoot);
        const hasAuditResolveFile = this.checkAuditResolveFiles(projectRoot);

        // Evaluate audit resolve configuration
        if (!hasAuditConfig && !hasPackageAuditConfig && !hasAuditResolveFile) {
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

  private static checkPackageJsonAuditConfig(projectRoot: string): boolean {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');

    if (FileUtils.exists(packageJsonPath)) {
      try {
        const packageJson = ConfigFileUtils.loadConfig(packageJsonPath);

        // Check for audit scripts
        const scripts = (packageJson?.scripts ?? {}) as Record<string, string>;
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
    score += this.checkGitHubSecurityFeatures(projectRoot, suggestions);
    score += this.checkPackageJsonSecurity(projectRoot, suggestions);

    return { violations, suggestions, score };
  }

  private static checkSecurityPolicyFiles(
    projectRoot: string,
    violations: string[],
    suggestions: string[]
  ): number {
    const securityFiles = [
      'SECURITY.md',
      'SECURITY.txt',
      'docs/SECURITY.md',
      '.github/SECURITY.md',
      'security.md',
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

  private static checkGitHubSecurityFeatures(
    projectRoot: string,
    suggestions: string[]
  ): number {
    const githubDir = PathOperations.join(projectRoot, '.github');
    if (!FileUtils.exists(githubDir)) {
      suggestions.push('Consider setting up GitHub security features');
      suggestions.push('Enable Dependabot and security advisories');
      return -10;
    }

    let score = 0;
    score += this.checkDependabotConfig(githubDir, suggestions);
    score += this.checkSecurityWorkflows(githubDir, suggestions);
    return score;
  }

  private static checkDependabotConfig(
    githubDir: string,
    suggestions: string[]
  ): number {
    const dependabotConfig = PathOperations.join(githubDir, 'dependabot.yml');
    const dependabotConfigV1 = PathOperations.join(
      githubDir,
      'dependabot.yaml'
    );

    const hasDependabot =
      FileUtils.exists(dependabotConfig) ||
      FileUtils.exists(dependabotConfigV1);

    if (!hasDependabot) {
      suggestions.push(
        'Enable GitHub Dependabot for automated security updates'
      );
      suggestions.push('Create .github/dependabot.yml configuration');
      return -10;
    }
    return 0;
  }

  private static checkSecurityWorkflows(
    githubDir: string,
    suggestions: string[]
  ): number {
    const workflowsDir = PathOperations.join(githubDir, 'workflows');
    if (!FileUtils.exists(workflowsDir)) {
      return 0;
    }

    try {
      const workflows = DirectoryScanner.scanDirectory(
        workflowsDir,
        ConfigFileUtils.getMinimalDefaultConfig(),
        { filesOnly: true }
      );
      let hasSecurityWorkflow = false;

      for (const workflow of workflows.files) {
        if (this.isSecurityWorkflow(workflow, workflowsDir)) {
          hasSecurityWorkflow = true;
          break;
        }
      }

      if (!hasSecurityWorkflow) {
        suggestions.push('Add GitHub Actions workflow for security scanning');
        suggestions.push('Include npm audit in CI/CD pipeline');
        return -5;
      }
    } catch (_error) {
      // Skip if can't read workflows directory
    }
    return 0;
  }

  private static isSecurityWorkflow(
    workflow: string,
    workflowsDir: string
  ): boolean {
    if (workflow.includes('security') || workflow.includes('audit')) {
      return true;
    }

    // Check workflow content for security-related actions
    if (workflow.endsWith('.yml') || workflow.endsWith('.yaml')) {
      try {
        const workflowPath = PathOperations.join(workflowsDir, workflow);
        const workflowContent = FileUtils.readFile(workflowPath);
        return (
          workflowContent.includes('npm audit') ||
          workflowContent.includes('security') ||
          workflowContent.includes('snyk')
        );
      } catch (_error) {
        // Skip unreadable workflow files
      }
    }
    return false;
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
