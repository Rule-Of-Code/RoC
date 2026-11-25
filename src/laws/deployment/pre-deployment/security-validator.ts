import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { FileUtils } from '../../../utils';
import { CheckerUtils } from '../../../utils/checker-utils';
import { FileSystemOperations } from '../../../utils/file-system-operations';

import { PathOperations } from '../../../utils/path-operations';
import { runsDependencyScan } from '../../../utils/compliance-scripts';
import { ciConfigContent } from '../../../utils/project-discovery';
import { commandText } from '../../../utils/ci-command-text';
/**
 * Security Validation Checker
 * Validates security scanning and vulnerability checks
 */
export class SecurityValidationChecker {
  validate(context: LawCheckContext): {
    isValid: boolean;
    npmAuditConfigured: boolean;
    dependabotConfigured: boolean;
    snykConfigured: boolean;
    secretScanningConfigured: boolean;
    errors?: string[];
    warnings?: string[];
  } {
    const result = this.checkSecurityScanning(context.projectRoot);
    return {
      isValid: result.npmAuditConfigured && result.snykConfigured,
      npmAuditConfigured: result.npmAuditConfigured,
      dependabotConfigured: result.dependabotConfigured,
      snykConfigured: result.snykConfigured,
      secretScanningConfigured: result.secretScanningConfigured,
      errors: result.npmAuditConfigured ? [] : ['Security validation failed'],
      warnings: [],
    };
  }

  checkSecurityScanning(projectRoot: string): {
    npmAuditConfigured: boolean;
    dependabotConfigured: boolean;
    snykConfigured: boolean;
    secretScanningConfigured: boolean;
    securityScripts: string[];
    vulnerabilityScanResults: boolean;
  } {
    const securityScripts: string[] = [];
    let npmAuditConfigured = false;
    let dependabotConfigured = false;
    let snykConfigured = false;
    let secretScanningConfigured = false;
    let vulnerabilityScanResults = false;

    // Check package.json for security scripts
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (FileUtils.exists(packageJsonPath)) {
      const scriptResult = this.extractSecurityScripts(packageJsonPath);
      securityScripts.push(...scriptResult.securityScripts);
      ({ npmAuditConfigured, snykConfigured } = scriptResult);
    }

    // The command, not the name: `"security-audit": "npm audit"` scans the
    // dependencies whatever the script is called, and so does a CI step that
    // runs a scanner. Only the names audit / security / snyk were read.
    if (!npmAuditConfigured && this.runsScannerSomewhere(projectRoot)) {
      npmAuditConfigured = true;
    }

    // Check for Snyk configuration
    const snykConfigFiles = ['.snyk', 'snyk.json'];
    if (this.anyExists(projectRoot, snykConfigFiles)) snykConfigured = true;

    // Check for secret scanning setup
    const secretScanningFiles = [
      '.gitleaks.toml',
      '.secrets.baseline',
      '.github/workflows/secrets-scan.yml',
      '.github/workflows/security.yml',
    ];
    if (this.anyExists(projectRoot, secretScanningFiles))
      secretScanningConfigured = true;

    // Check for Dependabot configuration
    const dependabotPaths = [
      '.github/dependabot.yml',
      '.github/dependabot.yaml',
    ];

    if (this.anyExists(projectRoot, dependabotPaths))
      dependabotConfigured = true;

    // Check for vulnerability scan results
    const scanResultPaths = [
      'security-audit.json',
      'vulnerability-report.json',
      '.security/audit-results.json',
      'reports/security.json',
    ];

    if (this.anyExists(projectRoot, scanResultPaths))
      vulnerabilityScanResults = true;

    return {
      npmAuditConfigured,
      dependabotConfigured,
      snykConfigured,
      secretScanningConfigured,
      securityScripts,
      vulnerabilityScanResults,
    };
  }

  /** Does any of the paths exist under the project root? Tested in order. */
  private anyExists(projectRoot: string, paths: string[]): boolean {
    return paths.some(path =>
      FileUtils.exists(PathOperations.join(projectRoot, path))
    );
  }

  checkAuthenticationSetup(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    authConfigured: boolean;
    authFiles: string[];
    securityHeaders: boolean;
  } {
    const authFiles: string[] = [];
    let authConfigured = false;
    let securityHeaders = false;

    // Find authentication files
    const foundAuthFiles = this.findAuthenticationFiles(projectRoot, config);
    authFiles.push(...foundAuthFiles);
    authConfigured = authFiles.length > 0;

    // Check security headers
    securityHeaders = this.checkSecurityHeaders(projectRoot);

    return {
      authConfigured,
      authFiles,
      securityHeaders,
    };
  }

  private findAuthenticationFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const found: string[] = [];
    if (!FileUtils.exists(projectRoot)) return found;

    try {
      const allFiles = CheckerUtils.findFilesByExtension(
        projectRoot,
        CheckerUtils.getCommonExtensions().ALL_CODE,
        config
      );

      for (const filePath of allFiles) {
        const filename = PathOperations.getBasename(filePath);
        if (
          filename.toLowerCase().includes('auth') ||
          filename.toLowerCase().includes('jwt') ||
          filename.toLowerCase().includes('security')
        ) {
          found.push(filePath);
        }
      }
    } catch (_error) {
      // Ignore file system errors
    }

    return found;
  }

  private checkSecurityHeaders(projectRoot: string): boolean {
    const securityHeaderFiles = [
      'security-headers.conf',
      'helmet.config.js',
      'security.config.js',
    ];

    for (const headerFile of securityHeaderFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, headerFile))) {
        return true;
      }
    }

    return false;
  }

  private extractSecurityScripts(packageJsonPath: string): {
    securityScripts: string[];
    npmAuditConfigured: boolean;
    snykConfigured: boolean;
  } {
    const securityScripts: string[] = [];
    let npmAuditConfigured = false;
    let snykConfigured = false;

    try {
      const packageJson = FileSystemOperations.readJsonFile(
        packageJsonPath,
        {}
      ) as Record<string, unknown>;

      if (packageJson.scripts && typeof packageJson.scripts === 'object') {
        const scripts = packageJson.scripts as Record<string, unknown>;
        const securityRelatedScripts = [
          'audit',
          'security',
          'security:check',
          'vulnerability',
          'snyk',
        ];

        for (const script of securityRelatedScripts) {
          if (scripts[script]) {
            this.processSecurityScript(script, securityScripts, {
              npmAuditConfigured,
              snykConfigured,
            });
            const flagUpdates = this.updateFlags(script);
            npmAuditConfigured = flagUpdates.npmAudit || npmAuditConfigured;
            snykConfigured = flagUpdates.snyk || snykConfigured;
          }
        }
      }
    } catch (_error) {
      // Ignore JSON parsing errors
    }

    return { securityScripts, npmAuditConfigured, snykConfigured };
  }

  /** A package script or a CI step runs a dependency scanner. */
  private runsScannerSomewhere(projectRoot: string): boolean {
    const manifest = PathOperations.join(projectRoot, 'package.json');
    const scripts = FileUtils.exists(manifest)
      ? ((
          FileSystemOperations.readJsonFile(manifest, {}) as {
            scripts?: Record<string, unknown>;
          }
        ).scripts ?? {})
      : {};
    return (
      Object.values(scripts).some(
        command => typeof command === 'string' && runsDependencyScan(command)
      ) || runsDependencyScan(commandText(ciConfigContent(projectRoot)))
    );
  }

  private processSecurityScript(
    script: string,
    securityScripts: string[],
    flags: { npmAuditConfigured: boolean; snykConfigured: boolean }
  ): void {
    securityScripts.push(script);
    this.updateSecurityFlags(script, flags);
  }

  private updateSecurityFlags(
    script: string,
    flags: { npmAuditConfigured: boolean; snykConfigured: boolean }
  ): void {
    // Update flags based on script content - implementation can be extended
    if (script.includes('audit')) {
      flags.npmAuditConfigured = true;
    }
    if (script.includes('snyk')) {
      flags.snykConfigured = true;
    }
  }

  private updateFlags(script: string): { npmAudit: boolean; snyk: boolean } {
    return {
      npmAudit: script.includes('audit'),
      snyk: script.includes('snyk'),
    };
  }
}

export const securityValidator = new SecurityValidationChecker();
