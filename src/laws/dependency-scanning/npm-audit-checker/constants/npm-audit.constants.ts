/**
 * NPM Audit Checker Constants
 * Configuration layer: lock files, manifest checks, scoring
 *
 * No vulnerability is counted here (#545). This checker judges what the
 * manifest and the lockfile say; the vulnerabilities of the locked graph are
 * measured by the dependency scanner the project runs in its gate (npm /
 * yarn / pnpm audit, pip-audit, …), which the law verifies is wired in. A
 * table of "known vulnerable" versions matched against version RANGES, and a
 * rule that counted every exact 0.x pin as a moderate vulnerability, gave
 * findings no advisory database had made.
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
   * Score deductions for manifest findings
   */
  static readonly SCORE_DEDUCTIONS = {
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
   * A range that accepts any version: `*`, `x`, `latest`, the empty range,
   * or a wildcard component (`1.x`, `1.2.*`, `X.X.X`). Read as a semver
   * range, not as text: a letter x in `file:../ext` or `npm:x-lib@1.0.0`
   * is not a wildcard (#545).
   */
  static readonly WILDCARD_RANGE =
    /^(?:\*|latest|[xX*](?:\.[xX*]){0,2}|\d+(?:\.\d+)?\.[xX*](?:\.[xX*])?|)$/;

  /**
   * The note every result carries: what this law measures, and what it does
   * not (#545). It is a note, not a violation.
   */
  static readonly NOT_MEASURED_NOTE =
    'Vulnerabilities are not measured by this law: it checks that the dependency graph is locked and that a scanner runs in the gate (CI); that scanner measures them.';

  /**
   * Check if version string has insecure protocol
   */
  static hasInsecureProtocol(versionString: string): boolean {
    return this.INSECURE_PROTOCOLS.some(protocol =>
      versionString.includes(protocol)
    );
  }

  /**
   * True for a range that accepts any version (or any minor / patch). A
   * spec with a protocol (`file:`, `npm:`, `workspace:`, `git+https:`) is not
   * a registry range and is not judged here.
   */
  static isWildcardVersion(version: string): boolean {
    const range = version.trim();
    if (range.includes(':')) return false;
    return range
      .split('||')
      .some(part => this.WILDCARD_RANGE.test(part.trim().replace(/^[=v]/, '')));
  }

  /**
   * Check if a URL has insecure protocol
   */
  static urlHasInsecureProtocol(url: string): boolean {
    return this.INSECURE_PROTOCOLS.some(protocol => url.includes(protocol));
  }
}
