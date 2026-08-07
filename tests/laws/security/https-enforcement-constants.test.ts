/**
 * Tests for HttpsEnforcementConstants
 */
import { HttpsEnforcementConstants } from '../../../src/laws/security/api-security/constants/https-enforcement';

describe('HttpsEnforcementConstants', () => {
  describe('SSL_PATTERNS', () => {
    it('should have SSL_CERTIFICATE pattern', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.SSL_CERTIFICATE
      ).toBeInstanceOf(RegExp);
    });

    it('should have HTTPS_REDIRECT pattern', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.HTTPS_REDIRECT
      ).toBeInstanceOf(RegExp);
    });

    it('should have TLS_VERSION pattern', () => {
      expect(HttpsEnforcementConstants.SSL_PATTERNS.TLS_VERSION).toBeInstanceOf(
        RegExp
      );
    });

    it('SSL_CERTIFICATE should match ssl_certificate', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.SSL_CERTIFICATE.test(
          'ssl_certificate /etc/ssl/cert.pem'
        )
      ).toBe(true);
    });

    it('TLS_VERSION should match TLSv1.2', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.TLS_VERSION.test('TLSv1.2')
      ).toBe(true);
    });

    it('TLS_VERSION should match TLSv1.3', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.TLS_VERSION.test('TLSv1.3')
      ).toBe(true);
    });

    it('TLS_VERSION should match ssl_protocols', () => {
      expect(
        HttpsEnforcementConstants.SSL_PATTERNS.TLS_VERSION.test(
          'ssl_protocols TLSv1.2'
        )
      ).toBe(true);
    });
  });

  describe('CONFIG_FILES', () => {
    it('should include firebase.json', () => {
      expect(HttpsEnforcementConstants.CONFIG_FILES).toContain('firebase.json');
    });

    it('should include nginx.conf', () => {
      expect(HttpsEnforcementConstants.CONFIG_FILES).toContain('nginx.conf');
    });

    it('should include ngsw-config.json', () => {
      expect(HttpsEnforcementConstants.CONFIG_FILES).toContain(
        'ngsw-config.json'
      );
    });
  });

  describe('ENV_FILES', () => {
    it('should include environment.ts', () => {
      expect(HttpsEnforcementConstants.ENV_FILES).toContain(
        'src/environments/environment.ts'
      );
    });

    it('should include environment.prod.ts', () => {
      expect(HttpsEnforcementConstants.ENV_FILES).toContain(
        'src/environments/environment.prod.ts'
      );
    });
  });

  describe('hasHttpsConfiguration()', () => {
    it('should return true for content with ssl_certificate', () => {
      expect(
        HttpsEnforcementConstants.hasHttpsConfiguration(
          'ssl_certificate /path/to/cert'
        )
      ).toBe(true);
    });

    it('should return true for content with TLSv1.2', () => {
      expect(
        HttpsEnforcementConstants.hasHttpsConfiguration('ssl_protocols TLSv1.2')
      ).toBe(true);
    });

    it('should return false for content without https config', () => {
      expect(
        HttpsEnforcementConstants.hasHttpsConfiguration('const port = 3000')
      ).toBe(false);
    });
  });

  describe('hasNonLocalHttpEndpoint()', () => {
    it('should return true for http:// without localhost', () => {
      expect(
        HttpsEnforcementConstants.hasNonLocalHttpEndpoint(
          'http://api.example.com'
        )
      ).toBe(true);
    });

    it('should return false for http://localhost', () => {
      expect(
        HttpsEnforcementConstants.hasNonLocalHttpEndpoint(
          'http://localhost:3000'
        )
      ).toBe(false);
    });

    it('should return false for https://', () => {
      expect(
        HttpsEnforcementConstants.hasNonLocalHttpEndpoint(
          'https://api.example.com'
        )
      ).toBe(false);
    });

    it('should return false for content without http', () => {
      expect(
        HttpsEnforcementConstants.hasNonLocalHttpEndpoint('const x = 1')
      ).toBe(false);
    });
  });
});
