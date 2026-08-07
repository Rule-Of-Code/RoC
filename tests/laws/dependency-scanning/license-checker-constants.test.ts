/**
 * Tests for LicenseCheckerConstants
 *
 * Tests the license checking configuration and detection utilities.
 */
import { LicenseCheckerConstants } from '../../../src/laws/dependency-scanning/license-checker/constants/license-checker.constants';

describe('LicenseCheckerConstants', () => {
  describe('LICENSE_FILES', () => {
    it('should include LICENSE', () => {
      expect(LicenseCheckerConstants.LICENSE_FILES).toContain('LICENSE');
    });

    it('should include LICENSE.txt', () => {
      expect(LicenseCheckerConstants.LICENSE_FILES).toContain('LICENSE.txt');
    });

    it('should include LICENSE.md', () => {
      expect(LicenseCheckerConstants.LICENSE_FILES).toContain('LICENSE.md');
    });

    it('should include LICENCE (British spelling)', () => {
      expect(LicenseCheckerConstants.LICENSE_FILES).toContain('LICENCE');
    });

    it('should include COPYING', () => {
      expect(LicenseCheckerConstants.LICENSE_FILES).toContain('COPYING');
    });
  });

  describe('SOURCE_FILE_EXTENSIONS', () => {
    it('should include .ts', () => {
      expect(LicenseCheckerConstants.SOURCE_FILE_EXTENSIONS).toContain('.ts');
    });

    it('should include .js', () => {
      expect(LicenseCheckerConstants.SOURCE_FILE_EXTENSIONS).toContain('.js');
    });
  });

  describe('RESTRICTIVE_LICENSES', () => {
    it('should include GPL-2.0', () => {
      expect(LicenseCheckerConstants.RESTRICTIVE_LICENSES).toContain('GPL-2.0');
    });

    it('should include GPL-3.0', () => {
      expect(LicenseCheckerConstants.RESTRICTIVE_LICENSES).toContain('GPL-3.0');
    });

    it('should include AGPL-3.0', () => {
      expect(LicenseCheckerConstants.RESTRICTIVE_LICENSES).toContain(
        'AGPL-3.0'
      );
    });
  });

  describe('COPYLEFT_PATTERNS', () => {
    it('should include GPL', () => {
      expect(LicenseCheckerConstants.COPYLEFT_PATTERNS).toContain('GPL');
    });

    it('should include LGPL', () => {
      expect(LicenseCheckerConstants.COPYLEFT_PATTERNS).toContain('LGPL');
    });

    it('should include AGPL', () => {
      expect(LicenseCheckerConstants.COPYLEFT_PATTERNS).toContain('AGPL');
    });

    it('should include MPL', () => {
      expect(LicenseCheckerConstants.COPYLEFT_PATTERNS).toContain('MPL');
    });
  });

  describe('LICENSE_PATTERNS', () => {
    it('should have MIT pattern', () => {
      expect(LicenseCheckerConstants.LICENSE_PATTERNS.MIT).toBeDefined();
    });

    it('should match MIT License text', () => {
      const content = 'MIT License - Permission is hereby granted';
      expect(LicenseCheckerConstants.LICENSE_PATTERNS.MIT.test(content)).toBe(
        true
      );
    });

    it('should have Apache-2.0 pattern', () => {
      expect(
        LicenseCheckerConstants.LICENSE_PATTERNS['Apache-2.0']
      ).toBeDefined();
    });

    it('should match Apache 2.0 License text', () => {
      const content = 'Apache License Version 2.0';
      expect(
        LicenseCheckerConstants.LICENSE_PATTERNS['Apache-2.0'].test(content)
      ).toBe(true);
    });

    it('should have GPL-3.0 pattern', () => {
      expect(LicenseCheckerConstants.LICENSE_PATTERNS['GPL-3.0']).toBeDefined();
    });
  });

  describe('LICENSE_HEADER_KEYWORDS', () => {
    it('should include Copyright', () => {
      expect(LicenseCheckerConstants.LICENSE_HEADER_KEYWORDS).toContain(
        'Copyright'
      );
    });

    it('should include License', () => {
      expect(LicenseCheckerConstants.LICENSE_HEADER_KEYWORDS).toContain(
        'License'
      );
    });

    it('should include SPDX-License-Identifier', () => {
      expect(LicenseCheckerConstants.LICENSE_HEADER_KEYWORDS).toContain(
        'SPDX-License-Identifier'
      );
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have numeric deduction for missing project license', () => {
      expect(
        typeof LicenseCheckerConstants.SCORE_DEDUCTIONS.MISSING_PROJECT_LICENSE
      ).toBe('number');
    });

    it('should have numeric deduction for incompatible licenses', () => {
      expect(
        typeof LicenseCheckerConstants.SCORE_DEDUCTIONS.INCOMPATIBLE_LICENSES
      ).toBe('number');
    });

    it('should have higher deduction for incompatible than missing headers', () => {
      expect(
        LicenseCheckerConstants.SCORE_DEDUCTIONS.INCOMPATIBLE_LICENSES
      ).toBeGreaterThan(
        LicenseCheckerConstants.SCORE_DEDUCTIONS.MISSING_HEADERS
      );
    });
  });

  describe('PASS_THRESHOLD', () => {
    it('should be 80', () => {
      expect(LicenseCheckerConstants.PASS_THRESHOLD).toBe(80);
    });
  });

  describe('SCAN_MAX_DEPTH', () => {
    it('should be a positive number', () => {
      expect(LicenseCheckerConstants.SCAN_MAX_DEPTH).toBeGreaterThan(0);
    });
  });

  describe('MAX_HEADER_SCAN_FILES', () => {
    it('should be a positive number', () => {
      expect(LicenseCheckerConstants.MAX_HEADER_SCAN_FILES).toBeGreaterThan(0);
    });
  });

  describe('KNOWN_PACKAGE_LICENSES', () => {
    it('should have license for react', () => {
      expect(LicenseCheckerConstants.KNOWN_PACKAGE_LICENSES['react']).toBe(
        'MIT'
      );
    });

    it('should have license for lodash', () => {
      expect(LicenseCheckerConstants.KNOWN_PACKAGE_LICENSES['lodash']).toBe(
        'MIT'
      );
    });

    it('should have license for typescript', () => {
      expect(LicenseCheckerConstants.KNOWN_PACKAGE_LICENSES['typescript']).toBe(
        'Apache-2.0'
      );
    });
  });

  describe('detectLicenseType', () => {
    it('should detect MIT license', () => {
      const content = 'MIT License\n\nPermission is hereby granted';
      expect(LicenseCheckerConstants.detectLicenseType(content)).toBe('MIT');
    });

    it('should detect Apache-2.0 license', () => {
      const content = 'Apache License Version 2.0';
      expect(LicenseCheckerConstants.detectLicenseType(content)).toBe(
        'Apache-2.0'
      );
    });

    it('should detect GPL-3.0 license', () => {
      const content = 'GNU GENERAL PUBLIC LICENSE Version 3';
      expect(LicenseCheckerConstants.detectLicenseType(content)).toBe(
        'GPL-3.0'
      );
    });

    it('should return unknown for unrecognized license', () => {
      const content = 'Some custom license text';
      expect(LicenseCheckerConstants.detectLicenseType(content)).toBe(
        'unknown'
      );
    });

    it('should return unknown for empty string', () => {
      expect(LicenseCheckerConstants.detectLicenseType('')).toBe('unknown');
    });
  });

  describe('isRestrictiveLicense', () => {
    it('should return true for GPL-3.0', () => {
      expect(LicenseCheckerConstants.isRestrictiveLicense('GPL-3.0')).toBe(
        true
      );
    });

    it('should return true for AGPL-3.0', () => {
      expect(LicenseCheckerConstants.isRestrictiveLicense('AGPL-3.0')).toBe(
        true
      );
    });

    it('should return false for MIT', () => {
      expect(LicenseCheckerConstants.isRestrictiveLicense('MIT')).toBe(false);
    });

    it('should return false for Apache-2.0', () => {
      expect(LicenseCheckerConstants.isRestrictiveLicense('Apache-2.0')).toBe(
        false
      );
    });
  });

  describe('isCopyleftLicense', () => {
    it('should return true for GPL-3.0', () => {
      expect(LicenseCheckerConstants.isCopyleftLicense('GPL-3.0')).toBe(true);
    });

    it('should return true for LGPL-2.1', () => {
      expect(LicenseCheckerConstants.isCopyleftLicense('LGPL-2.1')).toBe(true);
    });

    it('should return true for MPL-2.0', () => {
      expect(LicenseCheckerConstants.isCopyleftLicense('MPL-2.0')).toBe(true);
    });

    it('should return false for MIT', () => {
      expect(LicenseCheckerConstants.isCopyleftLicense('MIT')).toBe(false);
    });
  });

  describe('getDefaultLicenseForPackage', () => {
    it('should return MIT for react', () => {
      expect(LicenseCheckerConstants.getDefaultLicenseForPackage('react')).toBe(
        'MIT'
      );
    });

    it('should return Apache-2.0 for typescript', () => {
      expect(
        LicenseCheckerConstants.getDefaultLicenseForPackage('typescript')
      ).toBe('Apache-2.0');
    });

    it('should return MIT for unknown package', () => {
      expect(
        LicenseCheckerConstants.getDefaultLicenseForPackage(
          'some-unknown-package'
        )
      ).toBe('MIT');
    });
  });

  describe('hasLicenseHeader', () => {
    it('should return true when Copyright is in first 10 lines', () => {
      const content = '/**\n * Copyright 2024 Company\n */\nconst x = 1;';
      expect(LicenseCheckerConstants.hasLicenseHeader(content)).toBe(true);
    });

    it('should return true when License is in first 10 lines', () => {
      const content = '// License: MIT\nconst x = 1;';
      expect(LicenseCheckerConstants.hasLicenseHeader(content)).toBe(true);
    });

    it('should return true when SPDX-License-Identifier is present', () => {
      const content = '// SPDX-License-Identifier: MIT\n';
      expect(LicenseCheckerConstants.hasLicenseHeader(content)).toBe(true);
    });

    it('should return false when no license keywords in first 10 lines', () => {
      const content = 'const x = 1;\nconst y = 2;\nconst z = 3;';
      expect(LicenseCheckerConstants.hasLicenseHeader(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(LicenseCheckerConstants.hasLicenseHeader('')).toBe(false);
    });
  });
});
