import { BranchGovernanceLaw } from '../../src/checkers/git-laws/branch-governance';
import { FeatureBranchProtectionLaw } from '../../src/checkers/git-laws/feature-branch-protection';
import {
  branchConventionSuggestion,
  followsBranchConvention,
} from '../../src/utils/git/branch-naming';
import { FileUtils } from '../../src/utils';

/**
 * Two laws judged branch names independently and disagreed four ways. The
 * sharpest was self-contradiction rather than strictness: Feature Branch
 * Protection accepted `chore/` and printed "Use branch prefixes: feature/,
 * bugfix/, hotfix/, release/, chore/" as its advice, while Branch Governance
 * rejected it — following the tool's suggestion produced the tool's violation.
 *
 * The other three were accidents of implementation: a character class of
 * `[a-z0-9.-]` rejected the uppercase of an issue key, the underscore of
 * `feature/add_auth`, and the `/` of a nested scope, while a prefix test had no
 * opinion on any of them.
 */
describe('one branch-naming rule, shared by both laws', () => {
  describe('the two laws agree, whatever the answer is', () => {
    it.each([
      ['feature/add-user-auth', true],
      ['chore/update-deps', true],
      ['feature/Add_User_Auth', true],
      ['feature/roc/sub-scope', true],
      ['feature/ABC-123', true],
      ['release/v1.4.0', true],
      ['fix/some-thing', false],
      ['nonsense', false],
      ['feature/', false],
    ])('%s is accepted=%s', (branch, expected) => {
      expect(followsBranchConvention(branch)).toBe(expected);
    });

    it('the advice names exactly the prefixes that are accepted', () => {
      const advice = branchConventionSuggestion();

      for (const prefix of ['feature/', 'bugfix/', 'hotfix/', 'release/']) {
        expect(advice).toContain(prefix);
        expect(followsBranchConvention(`${prefix}thing`)).toBe(true);
      }
      // The contradiction that started this: chore/ was advised and rejected.
      expect(advice).toContain('chore/');
      expect(followsBranchConvention('chore/update-deps')).toBe(true);
    });
  });

  /** The trunk carries no prefix by definition. */
  it.each([['main'], ['master'], ['develop'], ['development']])(
    '%s is not judged against the prefix convention',
    branch => {
      expect(followsBranchConvention(branch)).toBe(true);
    }
  );

  describe('a project can state its own convention', () => {
    const withPrefixes = (prefixes: string[]) => {
      const config = FileUtils.getMinimalDefaultConfig();
      config.thresholds = {
        ...config.thresholds,
        git: { ...config.thresholds?.git, branchPrefixes: prefixes },
      };
      return config;
    };

    it('can be stricter than the default', () => {
      const config = withPrefixes(['feature', 'bugfix', 'hotfix', 'release']);

      expect(followsBranchConvention('chore/update-deps', config)).toBe(false);
      expect(followsBranchConvention('feature/x', config)).toBe(true);
    });

    it('can name prefixes of its own', () => {
      const config = withPrefixes(['spike', 'poc']);

      expect(followsBranchConvention('spike/new-parser', config)).toBe(true);
      expect(followsBranchConvention('feature/x', config)).toBe(false);
    });

    /**
     * The advice follows what is declared, so it can never recommend a prefix
     * the check rejects — which is the defect this shared rule exists to end.
     */
    it('the advice follows the declared set', () => {
      const config = withPrefixes(['spike', 'poc']);
      const advice = branchConventionSuggestion(config);

      expect(advice).toContain('spike/');
      expect(advice).toContain('poc/');
      expect(advice).not.toContain('feature/');
    });

    it('tolerates a declared prefix written with its slash', () => {
      const config = withPrefixes(['spike/']);

      expect(followsBranchConvention('spike/new-parser', config)).toBe(true);
    });
  });

  /**
   * Both laws read the same rule, so a branch cannot be reported by one and
   * accepted by the other. Asserted against the laws themselves, not only the
   * helper, since the defect was that each held its own copy.
   */
  it('neither law carries a branch-name rule of its own', () => {
    const source = [
      BranchGovernanceLaw.check.toString(),
      FeatureBranchProtectionLaw.check.toString(),
    ].join('\n');

    expect(source).not.toMatch(/feature\|hotfix\|bugfix\|release/);
    expect(source).not.toMatch(/validPrefixes/);
  });
});
