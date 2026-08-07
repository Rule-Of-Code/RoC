import type { LawCheckContext } from '../../../types/law.types';
import { FileUtils } from '../../../utils/file-utils';
import { PackageJsonOperations } from '../../../utils/package-json-operations';

/**
 * NPM Audit Integration Checker
 * Handles npm audit configuration and integration
 */
export class NpmAuditChecker {
  /**
   * Check for npm audit integration
   */
  static checkNpmAuditIntegration(context: LawCheckContext): string[] {
    const violations: string[] = [];

    // Check package.json for audit scripts
    const pkg = this.getPackageJson(context.projectRoot);
    if (!pkg) {
      violations.push('No package.json found');
      return violations;
    }

    const securityScripts = Object.keys(pkg.scripts ?? {}).filter(
      script => script.includes('security') || script.includes('audit')
    );

    if (securityScripts.length === 0) {
      violations.push('No security-related npm scripts found');
    }

    // Check for outdated dependencies script
    if (!pkg.scripts?.['deps:check'] && !pkg.scripts?.outdated) {
      violations.push('Missing dependency update checking script');
    }

    // Check for audit configuration files
    const auditConfigFiles = [
      '.auditrc',
      '.npmauditrc',
      'audit.json',
      '.audit-resolve.json',
    ];

    let hasAuditConfig = false;
    for (const configFile of auditConfigFiles) {
      const configContent = this.readFileIfExists(
        `${context.projectRoot}/${configFile}`
      );
      if (configContent) {
        hasAuditConfig = true;
        break;
      }
    }

    if (!hasAuditConfig) {
      violations.push('Missing npm audit configuration files');
    }

    return violations;
  }

  private static getPackageJson(projectRoot: string) {
    return PackageJsonOperations.loadProjectPackageJson(projectRoot);
  }

  private static readFileIfExists(filePath: string): string | null {
    try {
      if (FileUtils.exists(filePath)) {
        return FileUtils.readFile(filePath);
      }
    } catch (_error) {
      // Silent fail
    }
    return null;
  }
}
