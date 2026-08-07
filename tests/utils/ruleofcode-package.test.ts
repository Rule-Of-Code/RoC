/**
 * RuleOfCode package-name recognition — unit tests.
 *
 * Regression guard for the dual-name distribution: the tool is published as both
 * the unscoped `ruleofcode` and the scoped `@ruleofcode/core`, and every
 * "is RoC here?" check must accept the whole set, never one hard-coded string.
 */
import {
  RULEOFCODE_PACKAGE_NAMES,
  isRuleOfCodePackageName,
  dependenciesIncludeRuleOfCode,
} from '../../src/utils/ruleofcode-package';

describe('ruleofcode-package recognition', () => {
  describe('RULEOFCODE_PACKAGE_NAMES', () => {
    it('carries both the unscoped public and the scoped internal name', () => {
      expect(RULEOFCODE_PACKAGE_NAMES).toContain('ruleofcode');
      expect(RULEOFCODE_PACKAGE_NAMES).toContain('@ruleofcode/core');
    });
  });

  describe('isRuleOfCodePackageName', () => {
    it('accepts the unscoped public name', () => {
      expect(isRuleOfCodePackageName('ruleofcode')).toBe(true);
    });

    it('accepts the scoped internal name', () => {
      expect(isRuleOfCodePackageName('@ruleofcode/core')).toBe(true);
    });

    it('rejects an unrelated package name', () => {
      expect(isRuleOfCodePackageName('react')).toBe(false);
    });

    it('rejects null / undefined without throwing', () => {
      expect(isRuleOfCodePackageName(undefined)).toBe(false);
      expect(isRuleOfCodePackageName(null)).toBe(false);
    });
  });

  describe('dependenciesIncludeRuleOfCode', () => {
    it('finds RoC installed under the unscoped public name', () => {
      expect(dependenciesIncludeRuleOfCode({ ruleofcode: '^7.17.0' })).toBe(true);
    });

    it('finds RoC installed under the scoped internal name', () => {
      expect(
        dependenciesIncludeRuleOfCode({ '@ruleofcode/core': '^7.17.0' })
      ).toBe(true);
    });

    it('finds a *ruleofcode* variant (fork / re-scope)', () => {
      expect(
        dependenciesIncludeRuleOfCode({ '@acme/ruleofcode-fork': '^1.0.0' })
      ).toBe(true);
    });

    it('does not fire on an unrelated dependency set', () => {
      expect(
        dependenciesIncludeRuleOfCode({ react: '^18.0.0', chalk: '^4.0.0' })
      ).toBe(false);
    });

    it('handles an empty / missing dependency map without throwing', () => {
      expect(dependenciesIncludeRuleOfCode({})).toBe(false);
      expect(dependenciesIncludeRuleOfCode(null)).toBe(false);
      expect(dependenciesIncludeRuleOfCode(undefined)).toBe(false);
    });
  });
});
