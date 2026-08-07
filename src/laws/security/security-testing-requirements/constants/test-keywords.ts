/**
 * TestKeywordsConstants
 *
 * Keywords for identifying different types of security tests.
 * Includes authentication, input validation, and security headers keywords.
 */
export class TestKeywordsConstants {
  static readonly AUTH_TEST_KEYWORDS = [
    'authentication',
    'authorization',
    'login',
    'logout',
    'token',
    'jwt',
    'session',
    'auth guard',
    'permission',
    'role',
  ];

  static readonly VALIDATION_TEST_KEYWORDS = [
    'xss',
    'cross-site scripting',
    'sql injection',
    'injection',
    'sanitize',
    'validate input',
    'malicious input',
    'script injection',
    'html encode',
    'escape',
  ];

  static readonly SECURITY_HEADERS_KEYWORDS = [
    'content-security-policy',
    'csp',
    'x-frame-options',
    'x-content-type-options',
    'strict-transport-security',
    'hsts',
    'x-xss-protection',
    'security headers',
    'helmet',
  ];

  /**
   * What an auth test ASSERTS. The keyword list above wants the WORD
   * "authorization" in the file; a Python test says the same thing as
   * `assert resp.status_code == 401`. Asserting that an unauthenticated caller
   * is refused IS an authorization test, in any language.
   */
  static readonly AUTH_ASSERTION_PATTERNS = [
    /status_code\s*==\s*(401|403)/i,
    /\.status\s*(?:===?|==)\s*(401|403)/i,
    /(?:toBe|toEqual|expect|equal|assertEqual|assertStatus)\s*\(\s*(401|403)\s*\)/i,
    /assert[^\n]*\b(401|403)\b/i,
    /\bunauthori[sz]ed\b|\bforbidden\b/i,
  ];

  /**
   * What an input-validation test ASSERTS: a malformed request is REFUSED.
   * `assert resp.status_code == 400` and `pytest.raises(ValidationError)` are
   * how Python says "we validate input".
   */
  static readonly VALIDATION_ASSERTION_PATTERNS = [
    /status_code\s*==\s*(400|422)/i,
    /\.status\s*(?:===?|==)\s*(400|422)/i,
    /(?:toBe|toEqual|expect|equal|assertEqual)\s*\(\s*(400|422)\s*\)/i,
    /pytest\.raises\s*\(\s*(?:ValidationError|ValueError|BadRequest)/i,
    /\bbad request\b|\bunprocessable\b/i,
  ];

  // Helper Methods

  static hasAuthTestContent(content: string): boolean {
    const lower = content.toLowerCase();
    return (
      this.AUTH_TEST_KEYWORDS.some(keyword => lower.includes(keyword)) ||
      this.AUTH_ASSERTION_PATTERNS.some(pattern => pattern.test(content))
    );
  }

  static hasInputValidationTestContent(content: string): boolean {
    const lower = content.toLowerCase();
    return (
      this.VALIDATION_TEST_KEYWORDS.some(keyword => lower.includes(keyword)) ||
      this.VALIDATION_ASSERTION_PATTERNS.some(pattern => pattern.test(content))
    );
  }

  static hasSecurityHeadersTestContent(content: string): boolean {
    return this.SECURITY_HEADERS_KEYWORDS.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
  }
}
