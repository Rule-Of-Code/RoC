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

  describe('VULNERABLE_PACKAGES', () => {
    it('should have lodash as vulnerable', () => {
      expect(NpmAuditConstants.VULNERABLE_PACKAGES.lodash).toBeDefined();
    });

    it('should have lodash with critical severity', () => {
      expect(NpmAuditConstants.VULNERABLE_PACKAGES.lodash.severity).toBe(
        'critical'
      );
    });

    it('should have moment as vulnerable', () => {
      expect(NpmAuditConstants.VULNERABLE_PACKAGES.moment).toBeDefined();
    });

    it('should have moment with high severity', () => {
      expect(NpmAuditConstants.VULNERABLE_PACKAGES.moment.severity).toBe(
        'high'
      );
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have critical vulnerability deduction', () => {
      expect(
        typeof NpmAuditConstants.SCORE_DEDUCTIONS.CRITICAL_VULNERABILITY
      ).toBe('number');
    });

    it('should have higher deduction for critical than high', () => {
      expect(
        NpmAuditConstants.SCORE_DEDUCTIONS.CRITICAL_VULNERABILITY
      ).toBeGreaterThan(NpmAuditConstants.SCORE_DEDUCTIONS.HIGH_VULNERABILITY);
    });

    it('should have higher deduction for high than moderate', () => {
      expect(
        NpmAuditConstants.SCORE_DEDUCTIONS.HIGH_VULNERABILITY
      ).toBeGreaterThan(
        NpmAuditConstants.SCORE_DEDUCTIONS.MODERATE_VULNERABILITY
      );
    });

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

  describe('WILDCARD_VERSION_PATTERNS', () => {
    it('should include *', () => {
      expect(NpmAuditConstants.WILDCARD_VERSION_PATTERNS).toContain('*');
    });

    it('should include latest', () => {
      expect(NpmAuditConstants.WILDCARD_VERSION_PATTERNS).toContain('latest');
    });

    it('should include x', () => {
      expect(NpmAuditConstants.WILDCARD_VERSION_PATTERNS).toContain('x');
    });
  });

  describe('ZERO_VERSION_PATTERN', () => {
    it('should be a regex', () => {
      expect(NpmAuditConstants.ZERO_VERSION_PATTERN).toBeInstanceOf(RegExp);
    });

    it('should match version starting with 0.', () => {
      expect(NpmAuditConstants.ZERO_VERSION_PATTERN.test('0.1.0')).toBe(true);
    });

    it('should not match version starting with 1.', () => {
      expect(NpmAuditConstants.ZERO_VERSION_PATTERN.test('1.0.0')).toBe(false);
    });
  });

  describe('isKnownVulnerablePackage', () => {
    it('should return true for lodash with vulnerable version', () => {
      expect(
        NpmAuditConstants.isKnownVulnerablePackage('lodash', '4.17.20')
      ).toBe(true);
    });

    it('should return true for moment with vulnerable version', () => {
      expect(
        NpmAuditConstants.isKnownVulnerablePackage('moment', '2.24.0')
      ).toBe(true);
    });

    it('should return false for unknown package', () => {
      expect(
        NpmAuditConstants.isKnownVulnerablePackage('unknown', '1.0.0')
      ).toBe(false);
    });

    it('should return false for lodash with safe version', () => {
      expect(
        NpmAuditConstants.isKnownVulnerablePackage('lodash', '4.17.21')
      ).toBe(false);
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

  describe('isZeroVersion', () => {
    it('should return true for 0.x version', () => {
      expect(NpmAuditConstants.isZeroVersion('0.1.0')).toBe(true);
    });

    it('should return true for 0.0.1', () => {
      expect(NpmAuditConstants.isZeroVersion('0.0.1')).toBe(true);
    });

    it('should return false for 1.0.0', () => {
      expect(NpmAuditConstants.isZeroVersion('1.0.0')).toBe(false);
    });

    it('should return false for 10.0.0', () => {
      expect(NpmAuditConstants.isZeroVersion('10.0.0')).toBe(false);
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

  describe('getVulnerabilityLevel', () => {
    it('should return critical for lodash', () => {
      expect(NpmAuditConstants.getVulnerabilityLevel('lodash')).toBe(
        'critical'
      );
    });

    it('should return high for moment', () => {
      expect(NpmAuditConstants.getVulnerabilityLevel('moment')).toBe('high');
    });

    it('should return null for unknown package', () => {
      expect(
        NpmAuditConstants.getVulnerabilityLevel('unknown-package')
      ).toBeNull();
    });
  });
});
