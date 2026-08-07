/**
 * Tests for DependencyPinningConstants
 *
 * Tests the dependency version pinning configuration and analysis utilities.
 */
import { DependencyPinningConstants } from '../../../src/laws/dependency-scanning/dependency-pinning/constants/dependency-pinning.constants';

describe('DependencyPinningConstants', () => {
  describe('CRITICAL_PACKAGES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(DependencyPinningConstants.CRITICAL_PACKAGES)).toBe(
        true
      );
      expect(
        DependencyPinningConstants.CRITICAL_PACKAGES.length
      ).toBeGreaterThan(0);
    });

    it('should include security-related packages', () => {
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain(
        'jsonwebtoken'
      );
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain('bcrypt');
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain('helmet');
    });

    it('should include common vulnerable packages', () => {
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain('lodash');
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain('axios');
    });

    it('should include authentication packages', () => {
      expect(DependencyPinningConstants.CRITICAL_PACKAGES).toContain(
        'passport'
      );
    });
  });

  describe('LOCK_FILES', () => {
    it('should include npm lock file', () => {
      expect(DependencyPinningConstants.LOCK_FILES).toContain(
        'package-lock.json'
      );
    });

    it('should include yarn lock file', () => {
      expect(DependencyPinningConstants.LOCK_FILES).toContain('yarn.lock');
    });

    it('should include pnpm lock file', () => {
      expect(DependencyPinningConstants.LOCK_FILES).toContain('pnpm-lock.yaml');
    });
  });

  describe('SCORE_DEDUCTIONS', () => {
    it('should have numeric values for all deductions', () => {
      expect(
        typeof DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_PRODUCTION
      ).toBe('number');
      expect(
        typeof DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_CRITICAL
      ).toBe('number');
      expect(
        typeof DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_DEV
      ).toBe('number');
    });

    it('should have higher deduction for production than dev', () => {
      expect(
        DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_PRODUCTION
      ).toBeGreaterThan(
        DependencyPinningConstants.SCORE_DEDUCTIONS.UNPINNED_DEV
      );
    });

    it('should have wildcard version deduction', () => {
      expect(
        DependencyPinningConstants.SCORE_DEDUCTIONS.WILDCARD_VERSIONS
      ).toBeDefined();
    });

    it('should have no lock file deduction', () => {
      expect(
        DependencyPinningConstants.SCORE_DEDUCTIONS.NO_LOCK_FILE
      ).toBeDefined();
    });
  });

  describe('analyzeDependencyVersion', () => {
    describe('exact versions (properly pinned)', () => {
      it('should return null for exact version 1.0.0', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '1.0.0'
        );
        expect(result).toBeNull();
      });

      it('should return null for exact version 10.20.30', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '10.20.30'
        );
        expect(result).toBeNull();
      });

      it('should return null for version 0.0.0', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '0.0.0'
        );
        expect(result).toBeNull();
      });
    });

    describe('wildcard versions', () => {
      it('should detect * as wildcard', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '*'
        );
        expect(result).toEqual({ type: 'wildcard' });
      });

      it('should detect latest as wildcard', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          'latest'
        );
        expect(result).toEqual({ type: 'wildcard' });
      });

      it('should detect x in version as wildcard', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '1.x'
        );
        expect(result).toEqual({ type: 'wildcard' });
      });

      it('should detect 1.0.x as wildcard', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '1.0.x'
        );
        expect(result).toEqual({ type: 'wildcard' });
      });
    });

    describe('unpinned versions (^ or ~)', () => {
      it('should detect caret versions as unpinned', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '^1.0.0'
        );
        expect(result).toEqual({ type: 'unpinned' });
      });

      it('should detect tilde versions as unpinned', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '~1.0.0'
        );
        expect(result).toEqual({ type: 'unpinned' });
      });
    });

    describe('version ranges', () => {
      it('should detect range with dash as range', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '1.0.0 - 2.0.0'
        );
        expect(result).toEqual({ type: 'range' });
      });

      it('should detect || as range', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '1.0.0 || 2.0.0'
        );
        expect(result).toEqual({ type: 'range' });
      });

      it('should detect < as range', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '<2.0.0'
        );
        expect(result).toEqual({ type: 'range' });
      });

      it('should detect > as range', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '>1.0.0'
        );
        expect(result).toEqual({ type: 'range' });
      });

      it('should detect >= as range', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          '>=1.0.0'
        );
        expect(result).toEqual({ type: 'range' });
      });
    });

    describe('non-standard versions', () => {
      it('should detect git+ URLs as unpinned', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          'git+https://github.com/user/repo'
        );
        expect(result).toEqual({ type: 'unpinned' });
      });

      it('should detect http URLs as wildcard due to x in extension', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          'https://example.com/package.tgz'
        );
        expect(result).toEqual({ type: 'wildcard' });
      });

      it('should detect file: protocol as unpinned', () => {
        const result = DependencyPinningConstants.analyzeDependencyVersion(
          'test',
          'file:../my-package'
        );
        expect(result).toEqual({ type: 'unpinned' });
      });
    });
  });

  describe('isCriticalPackage', () => {
    it('should return true for lodash', () => {
      expect(DependencyPinningConstants.isCriticalPackage('lodash')).toBe(true);
    });

    it('should return true for jsonwebtoken', () => {
      expect(DependencyPinningConstants.isCriticalPackage('jsonwebtoken')).toBe(
        true
      );
    });

    it('should return false for non-critical package', () => {
      expect(
        DependencyPinningConstants.isCriticalPackage('some-random-package')
      ).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(DependencyPinningConstants.isCriticalPackage('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(DependencyPinningConstants.isCriticalPackage('LODASH')).toBe(
        false
      );
    });
  });
});
