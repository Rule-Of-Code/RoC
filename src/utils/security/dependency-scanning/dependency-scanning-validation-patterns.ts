/**
 * Dependency Scanning Validation Patterns
 * Orchestrates validation workflow for dependency scanning analysis
 */

import type { RuleOfCodeConfig } from '../../../types/law.types';
import { ConfigFileUtils } from '../../config-file-utils';
import { DirectoryScanner } from '../../directory-scanner';
import { FileUtils } from '../../file-utils';
import { StringTemplateUtils } from '../../string-template-utils';
import {
  DependencyScanningConfiguration as Config,
  type DependencyScanningResult,
} from './dependency-scanning-configuration';

export class DependencyScanningValidationPatterns {
  // ===================
  // MAIN VALIDATION WORKFLOW
  // ===================
  static validateDependencyScanning(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): DependencyScanningResult {
    const result = Config.createEmptyResult();

    // Step 1: Check for package vulnerability scanning
    const packageScanResult =
      this.checkPackageVulnerabilityScanning(projectRoot);
    result.violations.push(...packageScanResult.violations);
    result.suggestions.push(...packageScanResult.suggestions);

    // Step 2: Check for outdated dependencies
    const outdatedResult = this.checkOutdatedDependencies(projectRoot);
    result.violations.push(...outdatedResult.violations);
    result.suggestions.push(...outdatedResult.suggestions);

    // Step 3: Check for dependency security tools
    const securityToolsResult = this.checkDependencySecurityTools(projectRoot);
    result.violations.push(...securityToolsResult.violations);
    result.suggestions.push(...securityToolsResult.suggestions);

    return result;
  }

  // ===================
  // PACKAGE VULNERABILITY SCANNING
  // ===================
  private static checkPackageVulnerabilityScanning(
    projectRoot: string
  ): DependencyScanningResult {
    const result = Config.createEmptyResult();

    const packageJsonPath = FileUtils.join(
      projectRoot,
      Config.FILE_PATTERNS.PACKAGE_JSON
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return result;
    }

    const packageJson = ConfigFileUtils.loadConfig(packageJsonPath);

    // Check for audit scripts
    const scripts = (packageJson?.scripts ?? {}) as Record<string, string>;
    if (!Config.hasAuditScript(scripts)) {
      result.suggestions.push(Config.VALIDATION_MESSAGES.ADD_AUDIT_SCRIPT);
    }

    // Check for potentially vulnerable packages
    const dependencies = Config.extractDependenciesFromConfig(packageJson);
    this.checkVulnerablePackages(dependencies, result.suggestions);

    // Check for security scanning in CI/CD
    this.checkCISecurityScanning(projectRoot, result.suggestions);

    return result;
  }

  // ===================
  // VULNERABLE PACKAGES CHECK
  // ===================
  private static checkVulnerablePackages(
    dependencies: Record<string, string>,
    suggestions: string[]
  ): void {
    for (const pkg of Config.SECURITY_PATTERNS
      .POTENTIALLY_VULNERABLE_PACKAGES) {
      if (Object.prototype.hasOwnProperty.call(dependencies, pkg)) {
        suggestions.push(
          StringTemplateUtils.formatNamedTemplate(
            Config.VALIDATION_MESSAGES.CHECK_VULNERABLE_PACKAGE,
            { package: pkg }
          )
        );
      }
    }
  }

  // ===================
  // CI SECURITY SCANNING
  // ===================
  private static checkCISecurityScanning(
    projectRoot: string,
    suggestions: string[]
  ): void {
    let hasSecurityScanningInCI = false;

    for (const ciFile of Config.FILE_PATTERNS.CI_FILES) {
      const ciPath = FileUtils.join(projectRoot, ciFile);

      if (!FileUtils.exists(ciPath)) {
        continue;
      }

      if (FileUtils.isDirectory(ciPath)) {
        hasSecurityScanningInCI = this.checkWorkflowDirectory(ciPath);
      } else {
        const content = FileUtils.readFile(ciPath);
        if (Config.hasCISecurityScanning(content)) {
          hasSecurityScanningInCI = true;
        }
      }

      if (hasSecurityScanningInCI) {
        break;
      }
    }

    // Always suggest CI integration (original behavior)
    suggestions.push(Config.VALIDATION_MESSAGES.INTEGRATE_CI_SCANNING);
  }

  // ===================
  // WORKFLOW DIRECTORY CHECK
  // ===================
  private static checkWorkflowDirectory(ciPath: string): boolean {
    const scannerConfig = Config.getScannerConfig(ciPath);

    // Ensure all required properties have values
    const completeConfig = {
      ...scannerConfig,
      reporting: {
        ...scannerConfig.reporting,
        scoring: scannerConfig.reporting.scoring ?? false,
      },
    };

    const workflowResult = DirectoryScanner.scanDirectory(
      ciPath,
      completeConfig
    );

    for (const file of workflowResult.files) {
      const content = FileUtils.readFile(FileUtils.join(ciPath, file));
      if (Config.hasCISecurityScanning(content)) {
        return true;
      }
    }

    return false;
  }

  // ===================
  // OUTDATED DEPENDENCIES CHECK
  // ===================
  private static checkOutdatedDependencies(
    projectRoot: string
  ): DependencyScanningResult {
    const result = Config.createEmptyResult();

    // Check for lock files
    const hasLockFile = Config.hasAnyConfigFile(
      projectRoot,
      Config.FILE_PATTERNS.LOCK_FILES,
      FileUtils.exists,
      FileUtils.join
    );

    if (!hasLockFile) {
      result.violations.push(Config.VALIDATION_MESSAGES.NO_LOCK_FILE);
      result.suggestions.push(Config.VALIDATION_MESSAGES.GENERATE_LOCK_FILES);
    }

    // Check for dependency update automation
    const hasAutomatedUpdates = this.hasAutomatedDependencyUpdates(projectRoot);

    if (!hasAutomatedUpdates) {
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.SETUP_AUTOMATED_UPDATES
      );
    }

    return result;
  }

  // ===================
  // AUTOMATED UPDATES CHECK
  // ===================
  private static hasAutomatedDependencyUpdates(projectRoot: string): boolean {
    // Check Dependabot
    const dependabotPath = FileUtils.join(
      projectRoot,
      Config.FILE_PATTERNS.DEPENDABOT_PATH
    );
    if (FileUtils.exists(dependabotPath)) {
      return true;
    }

    // Check Renovate configs
    return Config.hasAnyConfigFile(
      projectRoot,
      Config.FILE_PATTERNS.RENOVATE_CONFIGS,
      FileUtils.exists,
      FileUtils.join
    );
  }

  // ===================
  // SECURITY TOOLS CHECK
  // ===================
  private static checkDependencySecurityTools(
    projectRoot: string
  ): DependencyScanningResult {
    const result = Config.createEmptyResult();

    const packageJsonPath = FileUtils.join(
      projectRoot,
      Config.FILE_PATTERNS.PACKAGE_JSON
    );

    if (FileUtils.exists(packageJsonPath)) {
      const packageJson = ConfigFileUtils.loadConfig(packageJsonPath);
      const dependencies = Config.extractDependenciesFromConfig(packageJson);

      // Check for security-focused tools
      if (
        !Config.hasAnyTool(
          dependencies,
          Config.SECURITY_PATTERNS.SECURITY_TOOLS
        )
      ) {
        result.suggestions.push(Config.VALIDATION_MESSAGES.ADD_SECURITY_TOOLS);
      }

      // Check for license scanning
      if (
        !Config.hasAnyTool(dependencies, Config.SECURITY_PATTERNS.LICENSE_TOOLS)
      ) {
        result.suggestions.push(Config.VALIDATION_MESSAGES.ADD_LICENSE_TOOLS);
      }
    }

    // Check for security scanning configuration files
    const hasSecurityConfig = Config.hasAnyConfigFile(
      projectRoot,
      Config.FILE_PATTERNS.SECURITY_CONFIGS,
      FileUtils.exists,
      FileUtils.join
    );

    if (!hasSecurityConfig) {
      result.suggestions.push(
        Config.VALIDATION_MESSAGES.CONFIGURE_SECURITY_SCANNING
      );
    }

    return result;
  }
}
