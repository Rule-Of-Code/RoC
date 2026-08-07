/**
 * SecurityTestFileConstants
 *
 * Configuration for security test file discovery and validation.
 * Includes file patterns and test directory configuration.
 */
export class SecurityTestFileConstants {
  static readonly SECURITY_TEST_FILE_PATTERNS = [
    /security.*\.spec\.(ts|js)$/i,
    /.*\.security\.spec\.(ts|js)$/i,
    /auth.*\.spec\.(ts|js)$/i,
    /.*\.security\.test\.(ts|js)$/i,
    // Python says it with pytest's conventions, not with `.spec.ts`.
    /^test_.*(security|auth).*\.py$/i,
    /^.*(security|auth).*_test\.py$/i,
  ];

  static readonly TEST_FILE_PATTERN =
    /\.(spec|test)\.(ts|js)$|^test_.+\.py$|^.+_test\.py$/;

  /**
   * What a security test ASSERTS, not what its file is called.
   *
   * The patterns above ask for `security` or `auth` in the FILENAME. a backend consumer's
   * security tests live in `tests/api/test_api_core.py` — they assert HSTS,
   * CSP, nosniff, X-Frame-Options and 401/403 across fifteen files, and not one
   * of them is named "security". A law that can only recognise evidence by its
   * filename is a law about naming, not about security.
   *
   * So: a test file whose CONTENT asserts a security property is a security
   * test. That is true in every language, which is why this is not gated on
   * Python.
   */
  static readonly SECURITY_ASSERTION_PATTERNS = [
    /status_code\s*==\s*(401|403)/i,
    /\.status\s*==\s*(401|403)/i,
    /(?:toBe|toEqual|expect|equal|assertEqual)\s*\(\s*(401|403)\s*\)/i,
    /assert[^\n]*\b(401|403)\b/i,
    /strict-transport-security/i,
    /content-security-policy/i,
    /x-frame-options/i,
    /x-content-type-options/i,
    /\bcsrf\b/i,
    /\bxss\b/i,
    /sql\s*injection|\bsqli\b/i,
    /\bunauthori[sz]ed\b|\bforbidden\b/i,
  ];

  static readonly SEARCH_DIRECTORIES = [
    'src',
    'test',
    'tests',
    'spec',
    'libs',
    'apps',
    'packages',
    'functions',
  ];

  static readonly GITHUB_WORKFLOWS_PATH = '.github/workflows';

  static readonly GITHUB_DEPENDABOT_PATH = '.github/dependabot.yml';

  // Helper Methods

  static isSecurityTestFile(filename: string): boolean {
    return this.SECURITY_TEST_FILE_PATTERNS.some(pattern =>
      pattern.test(filename)
    );
  }

  static isTestFile(filename: string): boolean {
    return this.TEST_FILE_PATTERN.test(filename);
  }

  /** Does this test file actually assert a security property? */
  static assertsSecurityProperty(content: string): boolean {
    return this.SECURITY_ASSERTION_PATTERNS.some(pattern =>
      pattern.test(content)
    );
  }
}
