import type { RuleOfCodeConfig } from '../../../config/types';
import type { LawCheckContext } from '../../../types/law.types';
import { FileUtils } from '../../../utils';
import { CheckerUtils } from '../../../utils/checker-utils';
import { FileSystemOperations } from '../../../utils/file-system-operations';

import { PathOperations } from '../../../utils/path-operations';
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

    // Check for Snyk configuration
    const snykConfigFiles = ['.snyk', 'snyk.json'];
    for (const snykFile of snykConfigFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, snykFile))) {
        snykConfigured = true;
        break;
      }
    }

    // Check for secret scanning setup
    const secretScanningFiles = [
      '.gitleaks.toml',
      '.secrets.baseline',
      '.github/workflows/secrets-scan.yml',
      '.github/workflows/security.yml',
    ];
    for (const secretFile of secretScanningFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, secretFile))) {
        secretScanningConfigured = true;
        break;
      }
    }

    // Check for Dependabot configuration
    const dependabotPaths = [
      '.github/dependabot.yml',
      '.github/dependabot.yaml',
    ];

    for (const dependabotPath of dependabotPaths) {
      if (FileUtils.exists(PathOperations.join(projectRoot, dependabotPath))) {
        dependabotConfigured = true;
        break;
      }
    }

    // Check for vulnerability scan results
    const scanResultPaths = [
      'security-audit.json',
      'vulnerability-report.json',
      '.security/audit-results.json',
      'reports/security.json',
    ];

    for (const scanPath of scanResultPaths) {
      if (FileUtils.exists(PathOperations.join(projectRoot, scanPath))) {
        vulnerabilityScanResults = true;
        break;
      }
    }

    return {
      npmAuditConfigured,
      dependabotConfigured,
      snykConfigured,
      secretScanningConfigured,
      securityScripts,
      vulnerabilityScanResults,
    };
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
