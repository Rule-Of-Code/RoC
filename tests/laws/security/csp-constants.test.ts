/**
 * Tests for CSPConstants
 */
import { CSPConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/csp';

describe('CSPConstants', () => {
  describe('CONFIG_FILES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(CSPConstants.CONFIG_FILES)).toBe(true);
      expect(CSPConstants.CONFIG_FILES.length).toBeGreaterThan(0);
    });

    it('should include security-headers.config.js', () => {
      expect(CSPConstants.CONFIG_FILES).toContain(
        'config/security-headers.config.js'
      );
    });

    it('should include security-headers.conf', () => {
      expect(CSPConstants.CONFIG_FILES).toContain(
        'config/security-headers.conf'
      );
    });

    it('should include security-config.ts', () => {
      expect(CSPConstants.CONFIG_FILES).toContain('src/security-config.ts');
    });

    it('should include angular.json', () => {
      expect(CSPConstants.CONFIG_FILES).toContain('angular.json');
    });
  });

  describe('PATTERNS', () => {
    it('should have HEADER pattern', () => {
      expect(CSPConstants.PATTERNS.HEADER).toBeInstanceOf(RegExp);
    });

    it('HEADER should match Content-Security-Policy', () => {
      expect(
        CSPConstants.PATTERNS.HEADER.test(
          'Content-Security-Policy: default-src'
        )
      ).toBe(true);
    });

    it('HEADER should match CSP', () => {
      expect(CSPConstants.PATTERNS.HEADER.test('CSP configuration')).toBe(true);
    });
  });

  describe('REQUIRED_DIRECTIVES', () => {
    it('should include default-src', () => {
      expect(CSPConstants.REQUIRED_DIRECTIVES).toContain('default-src');
    });

    it('should include script-src', () => {
      expect(CSPConstants.REQUIRED_DIRECTIVES).toContain('script-src');
    });

    it('should include style-src', () => {
      expect(CSPConstants.REQUIRED_DIRECTIVES).toContain('style-src');
    });

    it('should include img-src', () => {
      expect(CSPConstants.REQUIRED_DIRECTIVES).toContain('img-src');
    });
  });

  describe('UNSAFE_PRACTICES', () => {
    it('should include unsafe-inline', () => {
      expect(CSPConstants.UNSAFE_PRACTICES).toContain("'unsafe-inline'");
    });

    it('should include unsafe-eval', () => {
      expect(CSPConstants.UNSAFE_PRACTICES).toContain("'unsafe-eval'");
    });
  });

  describe('hasConfiguration()', () => {
    it('should return true for Content-Security-Policy', () => {
      expect(
        CSPConstants.hasConfiguration(
          "Content-Security-Policy: default-src 'self'"
        )
      ).toBe(true);
    });

    it('should return true for CSP', () => {
      expect(CSPConstants.hasConfiguration('CSP headers enabled')).toBe(true);
    });

    it('should return false for content without CSP', () => {
      expect(CSPConstants.hasConfiguration('const x = 1')).toBe(false);
    });
  });

  describe('hasMissingDirective()', () => {
    it('should return true when directive is missing', () => {
      expect(
        CSPConstants.hasMissingDirective("script-src 'self'", 'default-src')
      ).toBe(true);
    });

    it('should return false when directive is present', () => {
      expect(
        CSPConstants.hasMissingDirective("default-src 'self'", 'default-src')
      ).toBe(false);
    });
  });

  describe('hasUnsafePractice()', () => {
    it('should return true for unsafe-inline', () => {
      expect(
        CSPConstants.hasUnsafePractice("script-src 'self' 'unsafe-inline'")
      ).toBe(true);
    });

    it('should return true for unsafe-eval', () => {
      expect(CSPConstants.hasUnsafePractice("script-src 'unsafe-eval'")).toBe(
        true
      );
    });

    it('should return false for safe CSP', () => {
      expect(CSPConstants.hasUnsafePractice("default-src 'self'")).toBe(false);
    });
  });
});
