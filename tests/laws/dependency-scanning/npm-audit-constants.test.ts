/**
 * Tests for NpmAuditConstants
 *
 * Tests the NPM audit configuration and vulnerability detection utilities.
 */
import { NpmAuditConstants } from '../../../src/laws/dependency-scanning/npm-audit-checker/constants/npm-audit.constants';

describe('NpmAuditConstants', () => {
  describe('LOCK_FILES', () => {
    it('should include package-lock.json', () => {
      expect(NpmAuditConstants.LOCK_FILES).toContain('package-lock.json');
    });

    it('should include yarn.lock', () => {
      expect(NpmAuditConstants.LOCK_FILES).toContain('yarn.lock');
    });

    it('should include pnpm-lock.yaml', () => {
      expect(NpmAuditConstants.LOCK_FILES).toContain('pnpm-lock.yaml');
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have wildcard versions deduction', () => {
      expect(
        NpmAuditConstants.SCORE_DEDUCTIONS.WILDCARD_VERSIONS
      ).toBeDefined();
    });
  });

  describe('PASS_THRESHOLD', () => {
    it('should be 80', () => {
      expect(NpmAuditConstants.PASS_THRESHOLD).toBe(80);
    });
  });

  describe('INSECURE_PROTOCOLS', () => {
    it('should include http://', () => {
      expect(NpmAuditConstants.INSECURE_PROTOCOLS).toContain('http://');
    });

    it('should include git://', () => {
      expect(NpmAuditConstants.INSECURE_PROTOCOLS).toContain('git://');
    });
  });

  describe('hasInsecureProtocol', () => {
    it('should return true for http:// URL', () => {
      expect(NpmAuditConstants.hasInsecureProtocol('http://example.com')).toBe(
        true
      );
    });

    it('should return true for git:// URL', () => {
      expect(
        NpmAuditConstants.hasInsecureProtocol('git://github.com/user/repo')
      ).toBe(true);
    });

    it('should return false for https:// URL', () => {
      expect(NpmAuditConstants.hasInsecureProtocol('https://example.com')).toBe(
        false
      );
    });

    it('should return false for regular version string', () => {
      expect(NpmAuditConstants.hasInsecureProtocol('^1.0.0')).toBe(false);
    });
  });

  describe('isWildcardVersion', () => {
    it('should return true for *', () => {
      expect(NpmAuditConstants.isWildcardVersion('*')).toBe(true);
    });

    it('should return true for latest', () => {
      expect(NpmAuditConstants.isWildcardVersion('latest')).toBe(true);
    });

    it('should return true for 1.x', () => {
      expect(NpmAuditConstants.isWildcardVersion('1.x')).toBe(true);
    });

    it('should return false for exact version', () => {
      expect(NpmAuditConstants.isWildcardVersion('1.0.0')).toBe(false);
    });

    it('should return false for caret version', () => {
      expect(NpmAuditConstants.isWildcardVersion('^1.0.0')).toBe(false);
    });
  });

  describe('urlHasInsecureProtocol', () => {
    it('should return true for http:// URL', () => {
      expect(
        NpmAuditConstants.urlHasInsecureProtocol('http://registry.npm.org')
      ).toBe(true);
    });

    it('should return false for https:// URL', () => {
      expect(
        NpmAuditConstants.urlHasInsecureProtocol('https://registry.npm.org')
      ).toBe(false);
    });
  });
});
