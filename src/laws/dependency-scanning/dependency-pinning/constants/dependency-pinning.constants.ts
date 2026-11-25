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

  /** The version kinds that are not pinned, in the order they are tested. */
  private static readonly UNPINNED_KINDS: ReadonlyArray<{
    type: string;
    test: (version: string) => boolean;
  }> = [
    // Wildcard versions
    {
      type: 'wildcard',
      test: version =>
        version === '*' || version === 'latest' || version.includes('x'),
    },
    // Unpinned versions (using ^ or ~)
    {
      type: 'unpinned',
      test: version => version.startsWith('^') || version.startsWith('~'),
    },
    // Version ranges
    {
      type: 'range',
      test: version =>
        [' - ', '||', '<', '>'].some(operator => version.includes(operator)),
    },
    // Git URLs or other non-standard versions
    {
      type: 'unpinned',
      test: version =>
        ['git+', 'http', 'file:'].some(prefix => version.includes(prefix)),
    },
  ];

  /**
   * Analyze a dependency version string
   */
  static analyzeDependencyVersion(version: string): { type: string } | null {
    // Check for exact versions (no prefixes)
    if (/^\d+\.\d+\.\d+$/.test(version)) {
      return null; // Properly pinned
    }

    const kind = this.UNPINNED_KINDS.find(candidate => candidate.test(version));
    return kind ? { type: kind.type } : null; // null: considered properly pinned
  }

  /**
   * Check if package is security-critical
   */
  static isCriticalPackage(packageName: string): boolean {
    return this.CRITICAL_PACKAGES.includes(packageName);
  }
}
