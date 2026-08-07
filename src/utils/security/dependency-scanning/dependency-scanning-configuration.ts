/**
 * Dependency Scanning Configuration
 * Centralized configuration for dependency scanning analysis
 */

import { ProjectTypeDetectorValidation } from '../../config/project-type-detector/project-type-detector-validation';
import { PatternMatchingUtils } from '../../pattern-matching-utils';
import { SecurityConfigFactory } from '../shared-security-config';

/**
 * Dependency scanning result
 */
export interface DependencyScanningResult {
  violations: string[];
  suggestions: string[];
}

export class DependencyScanningConfiguration {
  // ===================
  // FILE PATTERNS
  // ===================
  static readonly FILE_PATTERNS = {
    PACKAGE_JSON: 'package.json',
    LOCK_FILES: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'],
    DEPENDABOT_PATH: '.github/dependabot.yml',
    RENOVATE_CONFIGS: ['renovate.json', '.renovaterc', '.github/renovate.json'],
    SECURITY_CONFIGS: ['.snyk', 'snyk.json', 'audit-ci.json', 'retire.json'],
    CI_FILES: [
      '.github/workflows',
      '.gitlab-ci.yml',
      'bitbucket-pipelines.yml',
      '.circleci/config.yml',
      'azure-pipelines.yml',
    ],
  } as const;

  // ===================
  // SECURITY PATTERNS
  // ===================
  static readonly SECURITY_PATTERNS = {
    AUDIT_SCRIPT_INDICATORS: ['audit', 'npm audit'],
    CI_SECURITY_INDICATORS: ['npm audit', 'snyk', 'security'],
    POTENTIALLY_VULNERABLE_PACKAGES: [
      'lodash',
      'moment',
      'underscore',
      'request',
    ],
    SECURITY_TOOLS: ['snyk', 'audit-ci', 'retire', 'nsp', 'safety'],
    LICENSE_TOOLS: ['license-checker', 'license-report', 'fossa'],
  } as const;

  // ===================
  // VALIDATION MESSAGES
  // ===================
  static readonly VALIDATION_MESSAGES = {
    // Violations
    NO_LOCK_FILE: 'No lock file found - dependencies may be inconsistent',

    // Suggestions
    ADD_AUDIT_SCRIPT:
      'Add npm audit script to package.json for regular vulnerability checks',
    CHECK_VULNERABLE_PACKAGE:
      'Consider updating or replacing {package} - check for known vulnerabilities',
    INTEGRATE_CI_SCANNING:
      'Integrate dependency vulnerability scanning into CI/CD pipeline',
    GENERATE_LOCK_FILES:
      'Use npm install, yarn, or pnpm to generate lock files',
    SETUP_AUTOMATED_UPDATES:
      'Set up automated dependency updates with Dependabot or Renovate',
    ADD_SECURITY_TOOLS:
      'Consider adding security scanning tools like snyk or audit-ci',
    ADD_LICENSE_TOOLS: 'Consider adding license compliance checking tools',
    CONFIGURE_SECURITY_SCANNING:
      'Configure security scanning tools with appropriate policies',
  } as const;

  // ===================
  // RECOMMENDATIONS
  // ===================
  static readonly RECOMMENDATIONS = [
    'Run npm audit or equivalent dependency vulnerability scans regularly',
    'Integrate dependency scanning into CI/CD pipelines',
    'Set up automated dependency updates with Dependabot or Renovate',
    'Use lock files to ensure consistent dependency versions',
    'Monitor and audit third-party dependencies for security issues',
    'Implement license compliance checking for dependencies',
    'Regularly review and update security scanning tool configurations',
    'Establish policies for handling vulnerable dependencies',
  ] as const;

  // ===================
  // DIRECTORY SCANNER CONFIG
  // ===================
  static readonly DEFAULT_SCANNER_CONFIG = {
    ...SecurityConfigFactory.createDefaultConfig(),
    performance: {
      parallel: false,
      maxConcurrent: 1,
      cache: false,
      incremental: false,
    },
  };

  // ===================
  // HELPER METHODS
  // ===================

  /**
   * Create empty result for initialization
   */
  static createEmptyResult(): DependencyScanningResult {
    return {
      violations: [],
      suggestions: [],
    };
  }

  /**
   * Check if scripts contain audit indicators
   */
  static hasAuditScript(scripts: Record<string, string>): boolean {
    return Object.keys(scripts).some(
      script =>
        script.includes(this.SECURITY_PATTERNS.AUDIT_SCRIPT_INDICATORS[0]) ||
        scripts[script]?.includes(
          this.SECURITY_PATTERNS.AUDIT_SCRIPT_INDICATORS[1]
        )
    );
  }

  /**
   * Check if content has CI security scanning indicators
   */
  static hasCISecurityScanning(content: string): boolean {
    return PatternMatchingUtils.hasAnyPattern(
      content,
      this.SECURITY_PATTERNS.CI_SECURITY_INDICATORS
    );
  }

  /**
   * Check if dependencies have any of the specified tools
   */
  static hasAnyTool(
    dependencies: Record<string, string>,
    tools: readonly string[]
  ): boolean {
    return tools.some(tool => dependencies[tool] !== undefined);
  }

  /**
   * Get scanner config with custom root path
   */
  static getScannerConfig(
    rootPath: string
  ): typeof this.DEFAULT_SCANNER_CONFIG {
    return {
      ...this.DEFAULT_SCANNER_CONFIG,
      project: {
        ...this.DEFAULT_SCANNER_CONFIG.project,
        root: rootPath,
      },
    };
  }

  /**
   * Load project dependencies from projectRoot using ProjectTypeDetectorValidation
   */
  static loadProjectDependencies(projectRoot: string): Record<string, string> {
    try {
      return ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
    } catch {
      return {};
    }
  }

  /**
   * Extract typed dependencies from loaded config
   */
  static extractDependenciesFromConfig(
    packageJson: unknown
  ): Record<string, string> {
    const config = packageJson as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    } | null;
    const deps = config?.dependencies ?? {};
    const devDeps = config?.devDependencies ?? {};
    return { ...deps, ...devDeps };
  }

  /**
   * Check if any of the config files exist in project root
   */
  static hasAnyConfigFile(
    projectRoot: string,
    configFiles: readonly string[],
    fileExists: (path: string) => boolean,
    joinPath: (...paths: string[]) => string
  ): boolean {
    return configFiles.some(config =>
      fileExists(joinPath(projectRoot, config))
    );
  }
}
