import {
  runsComplianceCheck,
  runsConstitutionalAudit,
  complianceScriptSuggestion,
  COMPLIANCE_SCRIPT_NAMES,
} from '../../src/utils/compliance-scripts';

/**
 * Two laws decided whether a project enforces its constitution by looking up a
 * script NAME and never reading what the script runs.
 *
 * A project whose `audit` script invokes this very CLI — inside a pre-push gate
 * that runs on every push — was told it had no constitutional enforcement. The
 * remedy that invites is `"check:laws": "npm run audit"`: ten seconds, both
 * findings cleared, nothing about what runs changed. A number moves and a gate
 * does not appear, which is the edit this tool exists to argue against.
 */
describe('a compliance script is identified by what it runs', () => {
  describe('the audit is recognised whatever the script is called', () => {
    it.each([
      [{ audit: 'ruleofcode audit --mode=full' }, 'a script named audit'],
      [{ verify: 'nx lint web && roc audit && nx test web' }, 'one stage of a gate'],
      [{ precommit: 'npx ruleofcode audit --staged' }, 'run through npx'],
      [{ ci: 'RoC audit --mode=full' }, 'a different capitalisation'],
    ])('accepts %j — %s', (scripts, _label) => {
      expect(runsConstitutionalAudit(scripts as Record<string, string>)).toBe(
        true
      );
    });

    /** The historical names still work on their own. */
    it.each(COMPLIANCE_SCRIPT_NAMES.map(name => [name]))(
      'still accepts the conventional name %s',
      name => {
        expect(runsConstitutionalAudit({ [name]: 'echo something' })).toBe(true);
      }
    );
  });

  /**
   * The red controls. Reading the command must not become "any script counts".
   */
  describe('a script that does not run an audit is not one', () => {
    it.each([
      [{ build: 'nx build web' }, 'a build'],
      [{ test: 'jest' }, 'a test run'],
      [{ lint: 'eslint .' }, 'a lint'],
      [{ start: 'node server.js' }, 'a server'],
      [{}, 'no scripts at all'],
    ])('rejects %j — %s', (scripts, _label) => {
      expect(runsConstitutionalAudit(scripts as Record<string, string>)).toBe(
        false
      );
    });

    it('rejects a script that merely mentions the word audit', () => {
      expect(runsConstitutionalAudit({ docs: 'echo "see the audit page"' })).toBe(
        false
      );
    });

    /**
     * The match stays inside ONE command of a chain, so an unrelated `roc`
     * earlier on the line cannot pair with an `audit` from a later command.
     */
    it('does not pair a tool in one command with a word in the next', () => {
      expect(
        runsConstitutionalAudit({ ci: 'roc laws --list && echo audit' })
      ).toBe(false);
    });

    it('handles a missing scripts block', () => {
      expect(runsConstitutionalAudit(undefined)).toBe(false);
      expect(runsComplianceCheck(undefined)).toBe(false);
    });
  });

  /**
   * The broader check accepts other real scanners, so a project gating on one
   * of those is not told it has no compliance automation.
   */
  describe('other compliance runners count for the broader check', () => {
    it.each([
      [{ 'audit:deps': 'npm audit --audit-level=high' }, 'npm audit'],
      [{ security: 'pip-audit' }, 'pip-audit'],
      [{ scan: 'snyk test' }, 'snyk'],
    ])('accepts %j — %s', (scripts, _label) => {
      expect(runsComplianceCheck(scripts as Record<string, string>)).toBe(true);
    });

    it('still rejects a project that runs none of them', () => {
      expect(runsComplianceCheck({ build: 'nx build web' })).toBe(false);
    });
  });

  /**
   * The advice is generated from what would satisfy the check, so the two
   * cannot drift apart — the defect 7.20.0 fixed for the branch-name laws.
   */
  it('the suggestion names the accepted script names', () => {
    const suggestion = complianceScriptSuggestion();

    for (const name of COMPLIANCE_SCRIPT_NAMES) {
      expect(suggestion).toContain(name);
    }
    expect(suggestion).toMatch(/the command is what is read/);
  });
});