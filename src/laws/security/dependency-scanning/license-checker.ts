import type { LawCheckContext } from '../../../types/law.types';
import { ConfigFileUtils } from '../../../utils/config-file-utils';
import { ProjectTypeDetectorValidation } from '../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../utils/file-utils';
import { PathOperations } from '../../../utils/path-operations';
import type { PackageJson } from './shared-types';

/**
 * License Compatibility Checker
 */
export class LicenseCompatibilityChecker {
  private static readonly APPROVED_LICENSES = [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    'Unlicense',
    'CC0-1.0',
  ];

  private static readonly RESTRICTED_LICENSES = [
    'GPL-2.0',
    'GPL-3.0',
    'AGPL-3.0',
    'LGPL-2.1',
    'LGPL-3.0',
    'MPL-2.0',
    'EPL-1.0',
    'EPL-2.0',
  ];

  /**
   * Check license compatibility
   */
  static checkLicenseCompatibility(context: LawCheckContext): string[] {
    const violations: string[] = [];

    // Check for LicenseCompatibilityChecker tools
    const hasLicenseChecker = this.checkLicenseCheckerTools(context);
    if (!hasLicenseChecker) {
      violations.push(
        'No LicenseCompatibilityChecker checking tools found (license-checker, license-report)'
      );
    }

    // Check for license policy file
    const hasLicensePolicy = this.checkLicensePolicy(context);
    if (!hasLicensePolicy) {
      violations.push('No license policy file found');
    }

    // Check package.json license field
    const packageLicense = this.checkPackageLicense(context);
    if (!packageLicense) {
      violations.push('Package license not specified in package.json');
    }

    // Check for LICENSE file
    const hasLicenseFile = this.checkLicenseFile(context);
    if (!hasLicenseFile) {
      violations.push('No LICENSE file found in project root');
    }

    return violations;
  }

  private static checkLicenseCheckerTools(context: LawCheckContext): boolean {
    const allDeps = ProjectTypeDetectorValidation.getProjectDependencies(
      context.projectRoot
    );

    const licenseTools = [
      'LicenseCompatibilityChecker-license-checker',
      'license-report',
      'LicenseCompatibilityChecker-license-compliance',
      'nlf',
      'LicenseCompatibilityChecker-licensecheck',
    ];

    return licenseTools.some(tool => allDeps[tool]);
  }

  private static checkLicensePolicy(context: LawCheckContext): boolean {
    const policyFiles = [
      'license-policy.json',
      '.licensesrc',
      'licenses.config.js',
      'LicenseCompatibilityChecker-license-compliance.json',
    ];

    for (const policyFile of policyFiles) {
      const exists = this.fileExists(`${context.projectRoot}/${policyFile}`);
      if (exists) return true;
    }

    return false;
  }

  private static checkPackageLicense(context: LawCheckContext): boolean {
    const pkg = this.getPackageJson(context.projectRoot) as PackageJson;
    return Boolean(pkg.license);
  }

  private static checkLicenseFile(context: LawCheckContext): boolean {
    const licenseFiles = [
      'LICENSE',
      'LICENSE.md',
      'LICENSE.txt',
      'LICENCE',
      'LICENCE.md',
      'LICENCE.txt',
    ];

    for (const licenseFile of licenseFiles) {
      const exists = this.fileExists(`${context.projectRoot}/${licenseFile}`);
      if (exists) return true;
    }

    return false;
  }

  private static fileExists(filePath: string): boolean {
    try {
      return FileUtils.exists(filePath);
    } catch (_error) {
      return false;
    }
  }

  private static getPackageJson(projectRoot: string): unknown {
    try {
      const _path = require('path');
      const packagePath = PathOperations.join(projectRoot, 'package.json');

      if (FileUtils.exists(packagePath)) {
        return ConfigFileUtils.loadConfig(packagePath);
      }
    } catch (_error) {
      // Silent fail
    }
    return null;
  }
}
