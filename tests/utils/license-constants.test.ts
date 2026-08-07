/**
 * License Constants Tests
 * Tests for the license-constants utility module
 */
import {
  DEPENDENCY_LICENSE_COMPATIBILITY,
  DEPENDENCY_LICENSE_CONFIG,
  DEPENDENCY_LICENSE_MESSAGES,
  LICENSE_CONVENTIONS,
  LICENSE_MESSAGES,
  LICENSE_STRING_LITERALS,
} from '../../src/utils/license-constants';

describe('license-constants', () => {
  describe('LICENSE_STRING_LITERALS', () => {
    it('should have file name constants', () => {
      expect(LICENSE_STRING_LITERALS.PACKAGE_JSON).toBe('package.json');
    });

    it('should have Apache license strings', () => {
      expect(LICENSE_STRING_LITERALS.APACHE_LICENSE).toBe('apache license');
      expect(LICENSE_STRING_LITERALS.VERSION_2_0).toBe('version 2.0');
      expect(LICENSE_STRING_LITERALS.APACHE_2_0).toBe('apache-2.0');
    });

    it('should have BSD license strings', () => {
      expect(LICENSE_STRING_LITERALS.BSD_2_CLAUSE).toBe('bsd-2-clause');
      expect(LICENSE_STRING_LITERALS.BSD_3_CLAUSE).toBe('bsd-3-clause');
      expect(LICENSE_STRING_LITERALS.BSD_3_CLAUSE_DESC).toBe('bsd 3-clause');
    });

    it('should have MIT license strings', () => {
      expect(LICENSE_STRING_LITERALS.MIT_LICENSE).toBe('mit license');
      expect(LICENSE_STRING_LITERALS.MIT).toBe('mit');
    });

    it('should have GPL license strings', () => {
      expect(LICENSE_STRING_LITERALS.GNU_GPL).toBe(
        'gnu general public license'
      );
      expect(LICENSE_STRING_LITERALS.VERSION_3).toBe('version 3');
    });

    it('should have ISC license string', () => {
      expect(LICENSE_STRING_LITERALS.ISC_LICENSE).toBe('isc license');
    });
  });

  describe('LICENSE_CONVENTIONS', () => {
    describe('LICENSE_FILE_NAMES', () => {
      it('should have common license file names', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENSE');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENSE.txt');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENSE.md');
      });

      it('should have lowercase variants', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('license');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('license.txt');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('license.md');
      });

      it('should have British spelling variants', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENCE');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENCE.txt');
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES).toContain('LICENCE.md');
      });

      it('should have LICENSE first in priority order', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_FILE_NAMES[0]).toBe('LICENSE');
      });
    });

    describe('LICENSE_TYPE_PATTERNS', () => {
      it('should have MIT patterns', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.MIT).toContain(
          'mit license'
        );
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.MIT).toContain('mit');
      });

      it('should have Apache 2.0 patterns', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.APACHE_2_0).toContain(
          'apache license'
        );
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.APACHE_2_0).toContain(
          'apache-2.0'
        );
      });

      it('should have GPL 3.0 patterns', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.GPL_3_0).toContain(
          'gnu general public license'
        );
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.GPL_3_0).toContain(
          'version 3'
        );
      });

      it('should have BSD 3-Clause patterns', () => {
        expect(
          LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.BSD_3_CLAUSE
        ).toContain('bsd 3-clause');
      });

      it('should have ISC patterns', () => {
        expect(LICENSE_CONVENTIONS.LICENSE_TYPE_PATTERNS.ISC).toContain(
          'isc license'
        );
      });
    });

    describe('SCORING', () => {
      it('should have base score', () => {
        expect(LICENSE_CONVENTIONS.SCORING.BASE_SCORE).toBe(100);
      });

      it('should have penalty values', () => {
        expect(LICENSE_CONVENTIONS.SCORING.NO_LICENSE_PENALTY).toBe(30);
        expect(LICENSE_CONVENTIONS.SCORING.UNLICENSED_PENALTY).toBe(20);
        expect(LICENSE_CONVENTIONS.SCORING.NO_FILE_PENALTY).toBe(25);
        expect(LICENSE_CONVENTIONS.SCORING.MISMATCH_PENALTY).toBe(15);
      });
    });
  });

  describe('LICENSE_MESSAGES', () => {
    describe('VIOLATIONS', () => {
      it('should have no license field message', () => {
        expect(LICENSE_MESSAGES.VIOLATIONS.NO_LICENSE_FIELD).toContain(
          'No license specified'
        );
      });

      it('should have unlicensed project message', () => {
        expect(LICENSE_MESSAGES.VIOLATIONS.UNLICENSED_PROJECT).toContain(
          'UNLICENSED'
        );
      });

      it('should have no license file message', () => {
        expect(LICENSE_MESSAGES.VIOLATIONS.NO_LICENSE_FILE).toContain(
          'No LICENSE file'
        );
      });

      it('should have mismatch message with placeholders', () => {
        expect(LICENSE_MESSAGES.VIOLATIONS.LICENSE_MISMATCH).toContain(
          '{packageLicense}'
        );
        expect(LICENSE_MESSAGES.VIOLATIONS.LICENSE_MISMATCH).toContain(
          '{fileLicense}'
        );
      });
    });

    describe('SUGGESTIONS', () => {
      it('should have add license field suggestion', () => {
        expect(LICENSE_MESSAGES.SUGGESTIONS.ADD_LICENSE_FIELD).toContain(
          'Add "license" field'
        );
      });

      it('should have add open source license suggestion', () => {
        expect(LICENSE_MESSAGES.SUGGESTIONS.ADD_OPEN_SOURCE_LICENSE).toContain(
          'open source license'
        );
      });

      it('should have create license file suggestion', () => {
        expect(LICENSE_MESSAGES.SUGGESTIONS.CREATE_LICENSE_FILE).toContain(
          'Create LICENSE file'
        );
      });

      it('should have ensure consistency suggestion', () => {
        expect(LICENSE_MESSAGES.SUGGESTIONS.ENSURE_CONSISTENCY).toContain(
          'Ensure package.json'
        );
      });
    });
  });

  describe('DEPENDENCY_LICENSE_CONFIG', () => {
    describe('LICENSES', () => {
      it('should have Apache 2.0 license', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.LICENSES.APACHE_2_0).toBe(
          'apache-2.0'
        );
      });

      it('should have BSD licenses', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.LICENSES.BSD_2_CLAUSE).toBe(
          'bsd-2-clause'
        );
        expect(DEPENDENCY_LICENSE_CONFIG.LICENSES.BSD_3_CLAUSE).toBe(
          'bsd-3-clause'
        );
      });
    });

    describe('SCANNING', () => {
      it('should have performance limit', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCANNING.PERFORMANCE_LIMIT).toBe(20);
      });

      it('should have extraction limit', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCANNING.EXTRACTION_LIMIT).toBe(10);
      });

      it('should have example limit', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCANNING.EXAMPLE_LIMIT).toBe(3);
      });
    });

    describe('SCORING', () => {
      it('should have base score', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCORING.BASE_SCORE).toBe(100);
      });

      it('should have max penalty', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCORING.MAX_PENALTY).toBe(30);
      });

      it('should have penalty per problematic', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.SCORING.PENALTY_PER_PROBLEMATIC).toBe(
          5
        );
      });
    });

    describe('PATHS', () => {
      it('should have node_modules directory', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.PATHS.NODE_MODULES_DIR).toBe(
          'node_modules'
        );
      });

      it('should have package.json file', () => {
        expect(DEPENDENCY_LICENSE_CONFIG.PATHS.PACKAGE_JSON_FILE).toBe(
          'package.json'
        );
      });
    });

    describe('PROBLEMATIC_LICENSES', () => {
      it('should have copyleft licenses', () => {
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COPYLEFT
        ).toContain('gpl-2.0');
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COPYLEFT
        ).toContain('gpl-3.0');
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COPYLEFT
        ).toContain('agpl-3.0');
      });

      it('should have commercial licenses', () => {
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COMMERCIAL
        ).toContain('commercial');
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.COMMERCIAL
        ).toContain('proprietary');
      });

      it('should have restrictive licenses', () => {
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.RESTRICTIVE
        ).toContain('cc-by-nc');
        expect(
          DEPENDENCY_LICENSE_CONFIG.PROBLEMATIC_LICENSES.RESTRICTIVE
        ).toContain('cc-by-nc-sa');
      });
    });
  });

  describe('DEPENDENCY_LICENSE_COMPATIBILITY', () => {
    describe('MIT', () => {
      it('should have no incompatible licenses', () => {
        expect(DEPENDENCY_LICENSE_COMPATIBILITY.MIT.INCOMPATIBLE).toHaveLength(
          0
        );
      });

      it('should require notice for permissive licenses', () => {
        expect(DEPENDENCY_LICENSE_COMPATIBILITY.MIT.REQUIRES_NOTICE).toContain(
          'apache-2.0'
        );
        expect(DEPENDENCY_LICENSE_COMPATIBILITY.MIT.REQUIRES_NOTICE).toContain(
          'bsd-2-clause'
        );
      });
    });

    describe('APACHE_2_0', () => {
      it('should be incompatible with gpl-2.0', () => {
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.APACHE_2_0.INCOMPATIBLE
        ).toContain('gpl-2.0');
      });

      it('should require notice for MIT', () => {
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.APACHE_2_0.REQUIRES_NOTICE
        ).toContain('mit');
      });
    });

    describe('GPL_3_0', () => {
      it('should be incompatible with permissive licenses', () => {
        expect(DEPENDENCY_LICENSE_COMPATIBILITY.GPL_3_0.INCOMPATIBLE).toContain(
          'apache-2.0'
        );
        expect(DEPENDENCY_LICENSE_COMPATIBILITY.GPL_3_0.INCOMPATIBLE).toContain(
          'mit'
        );
      });

      it('should not require notice', () => {
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.GPL_3_0.REQUIRES_NOTICE
        ).toHaveLength(0);
      });
    });

    describe('PROPRIETARY', () => {
      it('should be incompatible with copyleft licenses', () => {
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.INCOMPATIBLE
        ).toContain('gpl-2.0');
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.INCOMPATIBLE
        ).toContain('gpl-3.0');
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.INCOMPATIBLE
        ).toContain('agpl-3.0');
      });

      it('should require notice for permissive licenses', () => {
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.REQUIRES_NOTICE
        ).toContain('mit');
        expect(
          DEPENDENCY_LICENSE_COMPATIBILITY.PROPRIETARY.REQUIRES_NOTICE
        ).toContain('apache-2.0');
      });
    });
  });

  describe('DEPENDENCY_LICENSE_MESSAGES', () => {
    it('should have violations messages', () => {
      expect(
        DEPENDENCY_LICENSE_MESSAGES.VIOLATIONS.FOUND_PROBLEMATIC_DEPENDENCIES
      ).toContain('{count}');
      expect(
        DEPENDENCY_LICENSE_MESSAGES.VIOLATIONS.INCOMPATIBLE_LICENSE
      ).toContain('{depLicense}');
    });
  });
});
