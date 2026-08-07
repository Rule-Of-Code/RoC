/**
 * Tests for SecurityHeadersConstants
 *
 * Tests security headers configuration patterns and config files.
 */

import { SecurityHeadersConstants } from "../../../src/laws/security/security-standards-xss-prevention/constants/security-headers";

describe('SecurityHeadersConstants', () => {
  describe('HEADER_PATTERNS', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(SecurityHeadersConstants.HEADER_PATTERNS)).toBe(
        true
      );
      SecurityHeadersConstants.HEADER_PATTERNS.forEach(pattern => {
        expect(typeof pattern).toBe('string');
      });
    });

    it('should contain helmet', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain('helmet');
    });

    it('should contain X-Frame-Options', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-Frame-Options'
      );
    });

    it('should contain X-XSS-Protection', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-XSS-Protection'
      );
    });

    it('should contain X-Content-Type-Options', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'X-Content-Type-Options'
      );
    });

    it('should contain Referrer-Policy', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'Referrer-Policy'
      );
    });

    it('should contain Permissions-Policy', () => {
      expect(SecurityHeadersConstants.HEADER_PATTERNS).toContain(
        'Permissions-Policy'
      );
    });

    it('should have at least 6 header patterns', () => {
      expect(
        SecurityHeadersConstants.HEADER_PATTERNS.length
      ).toBeGreaterThanOrEqual(6);
    });
  });

  describe('CONFIG_FILES', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(SecurityHeadersConstants.CONFIG_FILES)).toBe(true);
      SecurityHeadersConstants.CONFIG_FILES.forEach(file => {
        expect(typeof file).toBe('string');
      });
    });

    it('should contain angular.json', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('angular.json');
    });

    it('should contain webpack.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain(
        'webpack.config.js'
      );
    });

    it('should contain vite.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('vite.config.js');
    });

    it('should contain next.config.js', () => {
      expect(SecurityHeadersConstants.CONFIG_FILES).toContain('next.config.js');
    });

    it('should have at least 4 config files', () => {
      expect(
        SecurityHeadersConstants.CONFIG_FILES.length
      ).toBeGreaterThanOrEqual(4);
    });
  });

  describe('pattern matching scenarios', () => {
    it('should have X-* headers for security', () => {
      const xHeaders = SecurityHeadersConstants.HEADER_PATTERNS.filter(h =>
        h.startsWith('X-')
      );
      expect(xHeaders.length).toBeGreaterThanOrEqual(3);
    });

    it('should have framework-specific config files', () => {
      const configFiles = SecurityHeadersConstants.CONFIG_FILES;
      expect(configFiles.some(f => f.includes('angular'))).toBe(true);
      expect(configFiles.some(f => f.includes('webpack'))).toBe(true);
      expect(configFiles.some(f => f.includes('vite'))).toBe(true);
      expect(configFiles.some(f => f.includes('next'))).toBe(true);
    });
  });
});
