/**
 * Dependency Pinning Constants
 * Centralized configuration for dependency version pinning validation
 */
export class DependencyPinningConstants {
  // Security-critical packages that should always be pinned
  static readonly CRITICAL_PACKAGES = [
    'lodash',
    'axios',
    'express',
    'jsonwebtoken',
    'bcrypt',
    'crypto',
    'helmet',
    'cors',
    'cookie-parser',
    'passport',
  ];

  // Lock file names
  static readonly LOCK_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ];

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    UNPINNED_PRODUCTION: 30,
    UNPINNED_CRITICAL: 25,
    UNPINNED_DEV: 15,
    WILDCARD_VERSIONS: 20,
    NO_LOCK_FILE: 15,
    VERSION_RANGES: 10,
  };

  /**
   * Analyze a dependency version string
   */
  static analyzeDependencyVersion(
    packageName: string,
    version: string
  ): { type: string } | null {
    // Check for exact versions (no prefixes)
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      return null; // Properly pinned
    }

    // Check for wildcard versions
    if (version === '*' || version === 'latest' || version.includes('x')) {
      return { type: 'wildcard' };
    }

    // Check for unpinned versions (using ^ or ~)
    if (version.startsWith('^') || version.startsWith('~')) {
      return { type: 'unpinned' };
    }

    // Check for version ranges
    if (
      version.includes(' - ') ||
      version.includes('||') ||
      version.includes('<') ||
      version.includes('>')
    ) {
      return { type: 'range' };
    }

    // Check for git URLs or other non-standard versions
    if (
      version.includes('git+') ||
      version.includes('http') ||
      version.includes('file:')
    ) {
      return { type: 'unpinned' };
    }

    return null; // Considered properly pinned
  }

  /**
   * Check if package is security-critical
   */
  static isCriticalPackage(packageName: string): boolean {
    return this.CRITICAL_PACKAGES.includes(packageName);
  }
}
