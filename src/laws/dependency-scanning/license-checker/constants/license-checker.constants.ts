/**
 * License Checker Constants
 * Configuration layer: License patterns, files, scoring rules
 */

export class LicenseCheckerConstants {
  /**
   * License files to check for project licensing
   */
  static readonly LICENSE_FILES = [
    'LICENSE',
    'LICENSE.txt',
    'LICENSE.md',
    'LICENCE',
    'COPYING',
  ];

  /**
   * File extensions to scan for license headers
   */
  static readonly SOURCE_FILE_EXTENSIONS = ['.ts', '.js'];

  /**
   * Known incompatible licenses for commercial use (restrictive)
   */
  static readonly RESTRICTIVE_LICENSES = ['GPL-2.0', 'GPL-3.0', 'AGPL-3.0'];

  /**
   * Copyleft license patterns
   */
  static readonly COPYLEFT_PATTERNS = ['GPL', 'LGPL', 'AGPL', 'MPL'];

  /**
   * License detection patterns
   */
  static readonly LICENSE_PATTERNS = {
    MIT: /MIT License|Permission is hereby granted/i,
    'Apache-2.0': /Apache License.*Version 2\.0/i,
    'GPL-3.0': /GNU GENERAL PUBLIC LICENSE.*Version 3/i,
    'BSD-3-Clause': /BSD 3-Clause/i,
    ISC: /ISC License/i,
  };

  /**
   * License header keywords to check in source files
   */
  static readonly LICENSE_HEADER_KEYWORDS = [
    'Copyright',
    'License',
    'SPDX-License-Identifier',
  ];

  /**
   * Score deductions for license compliance issues
   */
  static readonly SCORE_DEDUCTIONS = {
    MISSING_PROJECT_LICENSE: 25,
    INCOMPATIBLE_LICENSES: 30,
    UNKNOWN_LICENSES: 20,
    COPYLEFT_LICENSES: 15,
    MISSING_HEADERS: 10,
  };

  /**
   * Passing score threshold
   */
  static readonly PASS_THRESHOLD = 80;

  /**
   * Maximum depth for directory scanning
   */
  static readonly SCAN_MAX_DEPTH = 1;

  /**
   * Maximum number of source files to scan for headers
   */
  static readonly MAX_HEADER_SCAN_FILES = 10;

  /**
   * Known licenses for common packages (for simulation/defaults)
   */
  static readonly KNOWN_PACKAGE_LICENSES: Record<string, string> = {
    react: 'MIT',
    lodash: 'MIT',
    express: 'MIT',
    axios: 'MIT',
    typescript: 'Apache-2.0',
    moment: 'MIT',
    jquery: 'MIT',
    bootstrap: 'MIT',
    angular: 'MIT',
  };

  /**
   * Detect license type from file content
   */
  static detectLicenseType(content: string): string {
    for (const [license, pattern] of Object.entries(this.LICENSE_PATTERNS)) {
      if (pattern.test(content)) {
        return license;
      }
    }
    return 'unknown';
  }

  /**
   * Check if license is restrictive/incompatible
   */
  static isRestrictiveLicense(license: string): boolean {
    return this.RESTRICTIVE_LICENSES.includes(license);
  }

  /**
   * Check if license is copyleft
   */
  static isCopyleftLicense(license: string): boolean {
    return this.COPYLEFT_PATTERNS.some(pattern => license.includes(pattern));
  }

  /**
   * Get default license for package (used as fallback)
   */
  static getDefaultLicenseForPackage(packageName: string): string {
    return this.KNOWN_PACKAGE_LICENSES[packageName] ?? 'MIT';
  }

  /**
   * Check if source content has license headers
   */
  static hasLicenseHeader(content: string): boolean {
    const firstLines = content.split('\n').slice(0, 10).join('\n');
    return this.LICENSE_HEADER_KEYWORDS.some(keyword =>
      firstLines.includes(keyword)
    );
  }
}
