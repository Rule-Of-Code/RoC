/**
 * Tests for SecurityTestFileConstants
 *
 * Tests security test file patterns and discovery configuration.
 */
import { SecurityTestFileConstants } from '../../../src/laws/security/security-testing-requirements/constants/test-file';

describe('SecurityTestFileConstants', () => {
  describe('SECURITY_TEST_FILE_PATTERNS', () => {
    it('should be an array of RegExp patterns', () => {
      expect(
        Array.isArray(SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS)
      ).toBe(true);
      SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('should match security.spec.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('security.spec.ts'))).toBe(true);
    });

    it('should match security-test.spec.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('security-test.spec.ts'))).toBe(true);
    });

    it('should match component.security.spec.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('component.security.spec.ts'))).toBe(
        true
      );
    });

    it('should match component.security.test.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('component.security.test.ts'))).toBe(
        true
      );
    });

    it('should match auth.spec.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('auth.spec.ts'))).toBe(true);
    });

    it('should match auth-guard.spec.ts files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('auth-guard.spec.ts'))).toBe(true);
    });

    it('should match security.spec.js files', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('security.spec.js'))).toBe(true);
    });

    it('should be case insensitive', () => {
      const patterns = SecurityTestFileConstants.SECURITY_TEST_FILE_PATTERNS;
      expect(patterns.some(p => p.test('SECURITY.spec.ts'))).toBe(true);
      expect(patterns.some(p => p.test('Auth.spec.ts'))).toBe(true);
    });
  });

  describe('TEST_FILE_PATTERN', () => {
    it('should be a RegExp', () => {
      expect(SecurityTestFileConstants.TEST_FILE_PATTERN).toBeInstanceOf(
        RegExp
      );
    });

    it('should match .spec.ts files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('component.spec.ts')
      ).toBe(true);
    });

    it('should match .test.ts files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('service.test.ts')
      ).toBe(true);
    });

    it('should match .spec.js files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('util.spec.js')
      ).toBe(true);
    });

    it('should match .test.js files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('helper.test.js')
      ).toBe(true);
    });

    it('should not match regular .ts files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('component.ts')
      ).toBe(false);
    });

    it('should not match regular .js files', () => {
      expect(
        SecurityTestFileConstants.TEST_FILE_PATTERN.test('service.js')
      ).toBe(false);
    });
  });

  describe('SEARCH_DIRECTORIES', () => {
    it('should be an array of strings', () => {
      expect(Array.isArray(SecurityTestFileConstants.SEARCH_DIRECTORIES)).toBe(
        true
      );
      SecurityTestFileConstants.SEARCH_DIRECTORIES.forEach(dir => {
        expect(typeof dir).toBe('string');
      });
    });

    it('should contain common source directories', () => {
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('src');
    });

    it('should contain common test directories', () => {
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('test');
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('tests');
      expect(SecurityTestFileConstants.SEARCH_DIRECTORIES).toContain('spec');
    });
  });

  describe('GITHUB_WORKFLOWS_PATH', () => {
    it('should be the correct path', () => {
      expect(SecurityTestFileConstants.GITHUB_WORKFLOWS_PATH).toBe(
        '.github/workflows'
      );
    });
  });

  describe('GITHUB_DEPENDABOT_PATH', () => {
    it('should be the correct path', () => {
      expect(SecurityTestFileConstants.GITHUB_DEPENDABOT_PATH).toBe(
        '.github/dependabot.yml'
      );
    });
  });

  describe('isSecurityTestFile', () => {
    describe('should return true for security test files', () => {
      it('should match security.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('security.spec.ts')
        ).toBe(true);
      });

      it('should match security-test.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('security-test.spec.ts')
        ).toBe(true);
      });

      it('should match component.security.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile(
            'component.security.spec.ts'
          )
        ).toBe(true);
      });

      it('should match auth.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('auth.spec.ts')
        ).toBe(true);
      });

      it('should match auth-guard.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('auth-guard.spec.ts')
        ).toBe(true);
      });

      it('should match authentication.spec.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('authentication.spec.ts')
        ).toBe(true);
      });

      it('should match component.security.test.ts', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile(
            'component.security.test.ts'
          )
        ).toBe(true);
      });
    });

    describe('should return false for non-security test files', () => {
      it('should not match regular spec files', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('component.spec.ts')
        ).toBe(false);
      });

      it('should not match regular test files', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('service.test.ts')
        ).toBe(false);
      });

      it('should not match non-test files', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('security.ts')
        ).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should be case insensitive', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile('SECURITY.spec.ts')
        ).toBe(true);
        expect(
          SecurityTestFileConstants.isSecurityTestFile('Auth.spec.ts')
        ).toBe(true);
      });

      it('should handle full paths', () => {
        expect(
          SecurityTestFileConstants.isSecurityTestFile(
            'src/app/security.spec.ts'
          )
        ).toBe(true);
      });
    });
  });

  describe('isTestFile', () => {
    describe('should return true for test files', () => {
      it('should match .spec.ts files', () => {
        expect(SecurityTestFileConstants.isTestFile('component.spec.ts')).toBe(
          true
        );
      });

      it('should match .test.ts files', () => {
        expect(SecurityTestFileConstants.isTestFile('service.test.ts')).toBe(
          true
        );
      });

      it('should match .spec.js files', () => {
        expect(SecurityTestFileConstants.isTestFile('util.spec.js')).toBe(true);
      });

      it('should match .test.js files', () => {
        expect(SecurityTestFileConstants.isTestFile('helper.test.js')).toBe(
          true
        );
      });
    });

    describe('should return false for non-test files', () => {
      it('should not match regular .ts files', () => {
        expect(SecurityTestFileConstants.isTestFile('component.ts')).toBe(
          false
        );
      });

      it('should not match regular .js files', () => {
        expect(SecurityTestFileConstants.isTestFile('service.js')).toBe(false);
      });

      it('should not match .tsx files', () => {
        expect(SecurityTestFileConstants.isTestFile('component.tsx')).toBe(
          false
        );
      });

      it('should not match .json files', () => {
        expect(SecurityTestFileConstants.isTestFile('package.json')).toBe(
          false
        );
      });
    });
  });
});
