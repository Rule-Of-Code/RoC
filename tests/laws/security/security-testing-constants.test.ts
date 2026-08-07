/**
 * Tests for Security Testing Constants
 *
 * Tests for security headers, dependency scanning, test file and test keywords constants.
 */
import { SecurityHeadersConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/security-headers';
import { DependencyScanningConstants } from '../../../src/laws/security/security-testing-requirements/constants/dependency-scanning';
import { SecurityTestFileConstants } from '../../../src/laws/security/security-testing-requirements/constants/test-file';
import { TestKeywordsConstants } from '../../../src/laws/security/security-testing-requirements/constants/test-keywords';

describe('SecurityHeadersConstants', () => {
  describe('HEADER_PATTERNS', () => {
    it('should include helmet', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain('helmet');
    });

    it('should include X-Frame-Options', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-Frame-Options'
      );
    });

    it('should include X-XSS-Protection', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-XSS-Protection'
      );
    });

    it('should include X-Content-Type-Options', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-Content-Type-Options'
      );
    });

    it('should include Referrer-Policy', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'Referrer-Policy'
      );
    });

    it('should include Permissions-Policy', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'Permissions-Policy'
      );
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include angular.json', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('angular.json');
    });

    it('should include webpack.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain(
        'webpack.config.js'
      );
    });

    it('should include vite.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('vite.config.js');
    });

    it('should include next.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('next.config.js');
    });
  });
});

describe('DependencyScanningConstants', () => {
  describe('SCRIPTS', () => {
    it('should include security', () => {
      expect(DependencyScanningConstants.SCRIPTS).toContain('security');
    });

    it('should include audit', () => {
      expect(DependencyScanningConstants.SCRIPTS).toContain('audit');
    });

    it('should include vulnerabilities', () => {
      expect(DependencyScanningConstants.SCRIPTS).toContain('vulnerabilities');
    });
  });

  describe('TOOLS', () => {
    it('should include snyk', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('snyk');
    });

    it('should include @snyk/cli', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('@snyk/cli');
    });

    it('should include audit-ci', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('audit-ci');
    });

    it('should include better-npm-audit', () => {
      expect(DependencyScanningConstants.TOOLS).toContain('better-npm-audit');
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include dependabot.yml', () => {
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/dependabot.yml'
      );
    });

    it('should include security.yml', () => {
      expect(DependencyScanningConstants.CONFIG_FILES).toContain(
        '.github/workflows/security.yml'
      );
    });
  });

  describe('hasSecurityScript', () => {
    it('should return true for security script', () => {
      expect(
        DependencyScanningConstants.hasSecurityScript({
          'security:check': 'npm audit',
        })
      ).toBe(true);
    });

    it('should return true for audit script', () => {
      expect(
        DependencyScanningConstants.hasSecurityScript({
          'npm:audit': 'npm audit',
        })
      ).toBe(true);
    });

    it('should return false for unrelated scripts', () => {
      expect(
        DependencyScanningConstants.hasSecurityScript({
          build: 'npm run build',
        })
      ).toBe(false);
    });
  });

  describe('hasTool', () => {
    it('should return true when snyk is present', () => {
      expect(DependencyScanningConstants.hasTool({ snyk: '^1.0.0' })).toBe(
        true
      );
    });

    it('should return true when audit-ci is present', () => {
      expect(
        DependencyScanningConstants.hasTool({ 'audit-ci': '^6.0.0' })
      ).toBe(true);
    });

    it('should return false when no tools present', () => {
      expect(DependencyScanningConstants.hasTool({ lodash: '^4.0.0' })).toBe(
        false
      );
    });
  });

  describe('isConfigFile', () => {
    it('should return true for dependabot.yml', () => {
      expect(DependencyScanningConstants.isConfigFile('dependabot.yml')).toBe(
        true
      );
    });

    it('should return true for security.yml', () => {
      expect(DependencyScanningConstants.isConfigFile('security.yml')).toBe(
        true
      );
    });

    it('should return false for unrelated file', () => {
      expect(DependencyScanningConstants.isConfigFile('app.yml')).toBe(false);
    });
  });
});

describe('SecurityTestFileConstants', () => {
  describe('SECURITY_TEST_FILE_PATTERNS', () => {
    it('should be an array of regexes', () => {
      expect(
        Array.isArray(SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS)
      ).toBe(true);
      expect(
        SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS[0]
      ).toBeInstanceOf(RegExp);
    });
  });

  describe('TEST_FILE_PATTERN', () => {
    it('should be a regex', () => {
      expect(SecurityTestFileConstants.TEST_FILE_PATTERN).toBeInstanceOf(
        RegExp
      );
    });

    it('should match .spec.ts files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('app.spec.ts')
      ).toBe(true);
    });

    it('should match .test.js files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('app.test.js')
      ).toBe(true);
    });
  });

  describe('SEARCH_DIRECTORIES', () => {
    it('should include src', () => {
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('src');
    });

    it('should include tests', () => {
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('tests');
    });
  });

  describe('isSecurityTestFile', () => {
    it('should return true for security.spec.ts', () => {
      expect(
        SecurityTestFileConstants.isSecurityTestFile('security.spec.ts')
      ).toBe(true);
    });

    it('should return true for auth.spec.ts', () => {
      expect(SecurityTestFileConstants.isSecurityTestFile('auth.spec.ts')).toBe(
        true
      );
    });

    it('should return true for app.security.spec.ts', () => {
      expect(
        SecurityTestFileConstants.isSecurityTestFile('app.security.spec.ts')
      ).toBe(true);
    });

    it('should return false for regular test file', () => {
      expect(SecurityTestFileConstants.isSecurityTestFile('app.spec.ts')).toBe(
        false
      );
    });
  });

  describe('isTestFile', () => {
    it('should return true for .spec.ts', () => {
      expect(SecurityTestFileConstants.isTestFile('app.spec.ts')).toBe(true);
    });

    it('should return true for .test.js', () => {
      expect(SecurityTestFileConstants.isTestFile('app.test.js')).toBe(true);
    });

    it('should return false for non-test file', () => {
      expect(SecurityTestFileConstants.isTestFile('app.ts')).toBe(false);
    });
  });
});

describe('TestKeywordsConstants', () => {
  describe('AUTH_TEST_KEYWORDS', () => {
    it('should include authentication', () => {
      expect(TestKeywordsConstants.AUTH_TEST_KEYWORDS).toContain(
        'authentication'
      );
    });

    it('should include jwt', () => {
      expect(TestKeywordsConstants.AUTH_TEST_KEYWORDS).toContain('jwt');
    });

    it('should include token', () => {
      expect(TestKeywordsConstants.AUTH_TEST_KEYWORDS).toContain('token');
    });

    it('should include permission', () => {
      expect(TestKeywordsConstants.AUTH_TEST_KEYWORDS).toContain('permission');
    });
  });

  describe('VALIDATION_TEST_KEYWORDS', () => {
    it('should include xss', () => {
      expect(TestKeywordsConstants.VALIDATION_TEST_KEYWORDS).toContain('xss');
    });

    it('should include sql injection', () => {
      expect(TestKeywordsConstants.VALIDATION_TEST_KEYWORDS).toContain(
        'sql injection'
      );
    });

    it('should include sanitize', () => {
      expect(TestKeywordsConstants.VALIDATION_TEST_KEYWORDS).toContain(
        'sanitize'
      );
    });
  });

  describe('SECURITY_HEADERS_KEYWORDS', () => {
    it('should include content-security-policy', () => {
      expect(TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS).toContain(
        'content-security-policy'
      );
    });

    it('should include csp', () => {
      expect(TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS).toContain('csp');
    });

    it('should include helmet', () => {
      expect(TestKeywordsConstants.SECURITY_HEADERS_KEYWORDS).toContain(
        'helmet'
      );
    });
  });

  describe('hasAuthTestContent', () => {
    it('should return true for content with authentication', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('test authentication flow')
      ).toBe(true);
    });

    it('should return true for content with jwt', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('verify JWT token')).toBe(
        true
      );
    });

    it('should return false for unrelated content', () => {
      expect(TestKeywordsConstants.hasAuthTestContent('test component')).toBe(
        false
      );
    });

    it('should be case-insensitive', () => {
      expect(
        TestKeywordsConstants.hasAuthTestContent('AUTHENTICATION test')
      ).toBe(true);
    });
  });

  describe('hasInputValidationTestContent', () => {
    it('should return true for content with xss', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent(
          'test xss prevention'
        )
      ).toBe(true);
    });

    it('should return true for content with sanitize', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('sanitize input')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        TestKeywordsConstants.hasInputValidationTestContent('test component')
      ).toBe(false);
    });
  });

  describe('hasSecurityHeadersTestContent', () => {
    it('should return true for content with csp', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent('test CSP headers')
      ).toBe(true);
    });

    it('should return true for content with helmet', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent('configure helmet')
      ).toBe(true);
    });

    it('should return false for unrelated content', () => {
      expect(
        TestKeywordsConstants.hasSecurityHeadersTestContent('test component')
      ).toBe(false);
    });
  });
});
