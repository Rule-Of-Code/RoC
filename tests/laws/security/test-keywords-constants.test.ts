/**
 * Tests for TestKeywordsConstants
 *
 * Tests security test keyword patterns and content detection.
 */
import { TestKeywordsConstants } from '../../../src/laws/security/security-testing-requirements/constants/test-keywords';

describe('TestKeywordsConstants', () => {
  describe('AUTH_TEST_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(TestKeywordsConstants.AUTH_TEST_KEYWORDS)).toBe(
        true
      );
      TestKeywordsConstants.AUTH_TEST_KEYWORDS.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should contain authentication-related keywords', () => {
      const keywords = TestKeywordsConstants.AUTH_TEST_KEYWORDS;
      expect(keywords).toContain('authentication');
      expect(keywords).toContain('authorization');
      expect(keywords).toContain('login');
      expect(keywords).toContain('logout');
    });

    it('should contain token-related keywords', () => {
      const keywords = TestKeywordsConstants.AUTH_TEST_KEYWORDS;
      expect(keywords).toContain('token');
      expect(keywords).toContain('jwt');
      expect(keywords).toContain('session');
    });

    it('should contain permission-related keywords', () => {
      const keywords = TestKeywordsConstants.AUTH_TEST_KEYWORDS;
      expect(keywords).toContain('auth guard');
      expect(keywords).toContain('permission');
      expect(keywords).toContain('role');
    });
  });

  describe('VALIDATION_TEST_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(TestKeywordsConstants.VALIDATION_TEST_KEYWORDS)
      ).toBe(true);
      TestKeywordsConstants.VALIDATION_TEST_KEYWORDS.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should contain XSS-related keywords', () => {
      const keywords = TestKeywordsConstants.VALIDATION_TEST_KEYWORDS;
      expect(keywords).toContain('xss');
      expect(keywords).toContain('cross-site scripting');
      expect(keywords).toContain('script injection');
    });

    it('should contain injection-related keywords', () => {
      const keywords = TestKeywordsConstants.VALIDATION_TEST_KEYWORDS;
      expect(keywords).toContain('sql injection');
      expect(keywords).toContain('injection');
    });

    it('should contain sanitization-related keywords', () => {
      const keywords = TestKeywordsConstants.VALIDATION_TEST_KEYWORDS;
      expect(keywords).toContain('sanitize');
      expect(keywords).toContain('validate input');
      expect(keywords).toContain('malicious input');
      expect(keywords).toContain('html encode');
      expect(keywords).toContain('escape');
    });
  });

  describe('SECURITY_HEADERS_KEYWORDS', () => {
    it('should be an array of strings', () => {
      expect(
        Array.isArray(TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS)
      ).toBe(true);
      TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS.forEach(keyword => {
        expect(typeof keyword).toBe('string');
      });
    });

    it('should contain CSP-related keywords', () => {
      const keywords = TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS;
      expect(keywords).toContain('content-security-policy');
      expect(keywords).toContain('csp');
    });

    it('should contain security header names', () => {
      const keywords = TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS;
      expect(keywords).toContain('x-frame-options');
      expect(keywords).toContain('x-content-type-options');
      expect(keywords).toContain('x-xss-protection');
    });

    it('should contain HSTS-related keywords', () => {
      const keywords = TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS;
      expect(keywords).toContain('strict-transport-security');
      expect(keywords).toContain('hsts');
    });

    it('should contain general security keywords', () => {
      const keywords = TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS;
      expect(keywords).toContain('security headers');
      expect(keywords).toContain('helmet');
    });
  });

  describe('hasAuthTestContent', () => {
    it('should return true for content containing authentication', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('test authentication flow')
      ).toBe(true);
    });

    it('should return true for content containing authorization', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('check authorization')
      ).toBe(true);
    });

    it('should return true for content containing login', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('user login')).toBe(true);
    });

    it('should return true for content containing logout', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('handle logout')).toBe(
        true
      );
    });

    it('should return true for content containing token', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('validate token')).toBe(
        true
      );
    });

    it('should return true for content containing jwt', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('parse JWT')).toBe(true);
    });

    it('should return true for content containing session', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('session management')
      ).toBe(true);
    });

    it('should return true for content containing auth guard', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('use auth guard')).toBe(
        true
      );
    });

    it('should return true for content containing permission', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('check permission')).toBe(
        true
      );
    });

    it('should return true for content containing role', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('user role')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('AUTHENTICATION')).toBe(
        true
      );
      expect(TestKeywordsConstants.hasAuthTestContent('Authentication')).toBe(
        true
      );
    });

    it('should return false for non-auth content', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('regular component test')
      ).toBe(false);
    });
  });

  describe('hasInputValidationTestContent', () => {
    it('should return true for content containing xss', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'test xss prevention'
        )
      ).toBe(true);
    });

    it('should return true for content containing cross-site scripting', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'cross-site scripting attack'
        )
      ).toBe(true);
    });

    it('should return true for content containing sql injection', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'prevent sql injection'
        )
      ).toBe(true);
    });

    it('should return true for content containing injection', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('code injection')
      ).toBe(true);
    });

    it('should return true for content containing sanitize', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('sanitize input')
      ).toBe(true);
    });

    it('should return true for content containing validate input', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'validate input data'
        )
      ).toBe(true);
    });

    it('should return true for content containing malicious input', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'handle malicious input'
        )
      ).toBe(true);
    });

    it('should return true for content containing script injection', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'prevent script injection'
        )
      ).toBe(true);
    });

    it('should return true for content containing html encode', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'html encode output'
        )
      ).toBe(true);
    });

    it('should return true for content containing escape', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'escape special chars'
        )
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(TestKeywordsConstants.hasInputValidationTestContent('XSS')).toBe(
        true
      );
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('SQL Injection')
      ).toBe(true);
    });

    it('should return false for non-validation content', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('unit test service')
      ).toBe(false);
    });
  });

  describe('hasSecurityHeadersTestContent', () => {
    it('should return true for content containing content-security-policy', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'set content-security-policy'
        )
      ).toBe(true);
    });

    it('should return true for content containing csp', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent('configure CSP')
      ).toBe(true);
    });

    it('should return true for content containing x-frame-options', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'add x-frame-options'
        )
      ).toBe(true);
    });

    it('should return true for content containing x-content-type-options', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'x-content-type-options nosniff'
        )
      ).toBe(true);
    });

    it('should return true for content containing strict-transport-security', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'strict-transport-security header'
        )
      ).toBe(true);
    });

    it('should return true for content containing hsts', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent('enable HSTS')
      ).toBe(true);
    });

    it('should return true for content containing x-xss-protection', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'x-xss-protection header'
        )
      ).toBe(true);
    });

    it('should return true for content containing security headers', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'configure security headers'
        )
      ).toBe(true);
    });

    it('should return true for content containing helmet', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'use helmet middleware'
        )
      ).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(TestKeywordsConstants.hasSecurityHeadersTestContent('CSP')).toBe(
        true
      );
      expect(TestKeywordsConstants.hasSecurityHeadersTestContent('HSTS')).toBe(
        true
      );
    });

    it('should return false for non-security-header content', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent(
          'component rendering'
        )
      ).toBe(false);
    });
  });
});
