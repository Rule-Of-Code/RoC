/**
 * NPM Audit Checker Constants
 * Configuration layer: Vulnerability levels, scoring, lock files
 */

export class NpmAuditConstants {
  /**
   * Lock files to check for package management
   */
  static readonly LOCK_FILES = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
  ];

  /**
   * Known vulnerable package versions (simplified)
   */
  static readonly VULNERABLE_PACKAGES = {
    lodash: {
      version: '4.17.20',
      severity: 'critical' as const,
    },
    moment: {
      version: '2.24.0',
      severity: 'high' as const,
    },
  };

  /**
   * Score deductions for vulnerability severity levels
   */
  static readonly SCORE_DEDUCTIONS = {
    CRITICAL_VULNERABILITY: 50,
    HIGH_VULNERABILITY: 30,
    MODERATE_VULNERABILITY: 15,
    LOW_VULNERABILITY: 5,
    MISSING_LOCK_FILE: 20,
    INSECURE_PROTOCOLS: 15,
    WILDCARD_VERSIONS: 10,
  };

  /**
   * Passing score threshold
   */
  static readonly PASS_THRESHOLD = 80;

  /**
   * Insecure protocol patterns to check for
   */
  static readonly INSECURE_PROTOCOLS = ['http://', 'git://'];

  /**
   * Wildcard version indicators
   */
  static readonly WILDCARD_VERSION_PATTERNS = ['*', 'latest', 'x'];

  /**
   * Known vulnerable package patterns (for zero-version detection)
   */
  static readonly ZERO_VERSION_PATTERN = /^0\./;

  /**
   * Detect if a package version is vulnerable (simplified check)
   */
  static isKnownVulnerablePackage(
    packageName: string,
    version: string
  ): boolean {
    const vulnerable = (
      this.VULNERABLE_PACKAGES as Record<
        string,
        { version: string; severity: 'critical' | 'high' }
      >
    )[packageName];
    if (!vulnerable) return false;
    return version.includes(vulnerable.version);
  }

  /**
   * Check if version string has insecure protocol
   */
  static hasInsecureProtocol(versionString: string): boolean {
    return this.INSECURE_PROTOCOLS.some(protocol =>
      versionString.includes(protocol)
    );
  }

  /**
   * Check if version is a wildcard/unpinned version
   */
  static isWildcardVersion(version: string): boolean {
    return this.WILDCARD_VERSION_PATTERNS.some(pattern =>
      version.includes(pattern)
    );
  }

  /**
   * Check if version matches zero pattern (0.x.x)
   */
  static isZeroVersion(version: string): boolean {
    return this.ZERO_VERSION_PATTERN.test(version);
  }

  /**
   * Check if a URL has insecure protocol
   */
  static urlHasInsecureProtocol(url: string): boolean {
    return this.INSECURE_PROTOCOLS.some(protocol => url.includes(protocol));
  }

  /**
   * Get severity level for vulnerable package
   */
  static getVulnerabilityLevel(
    packageName: string
  ): 'critical' | 'high' | null {
    const vulnerable = (
      this.VULNERABLE_PACKAGES as Record<
        string,
        { version: string; severity: 'critical' | 'high' }
      >
    )[packageName];
    return vulnerable?.severity ?? null;
  }
}
