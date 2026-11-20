import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';

/**
 * Error Handling Standards — no verified detection path (#390).
 *
 * The law had five checks: critical areas missing try/catch, error logging,
 * user-friendly error messages, HTTP error handling and Observable error
 * handling. Each was a whole-file pattern match. Once #369 let them see the
 * source files, a random sample of each was measured on real projects: 17%,
 * 0%, 0% (three findings in all), 0% and 33% true — an await that propagates
 * on purpose, an error turned into UI state, a value of a union type, a
 * repository that returns its promise to the caller, a router stream that
 * cannot error. A check stays only at ≥ 80% true on ≥ 10 findings, so all five
 * were removed.
 *
 * The law itself stays: its key keeps working in configs (a waiver of it is
 * not an unknown key), and it stays opt-in. Turned on, it does not pass a
 * project it did not judge (#369): it reports that it judged nothing, which
 * the engine scores as a failure with score 0.
 */
export class ErrorHandlingStandardsLaw {
  static readonly NO_VERIFIED_PATH =
    'Error Handling Standards has no verified detection path in this version — this law judged nothing. Its five checks were measured on real projects at 0–33% precision and removed (#390); waive it or leave it off until a check is verified.';

  static async check(context: LawCheckContext): Promise<LawResult> {
    return Promise.resolve(
      markJudgedNothing({
        passed: false,
        message: `⚠️ ${ErrorHandlingStandardsLaw.NO_VERIFIED_PATH}`,
        violations: [ErrorHandlingStandardsLaw.NO_VERIFIED_PATH],
        suggestions: [
          'Waive it in laws.notApplicable with the reason, or remove it from laws.severity / laws.enabled, until a verified check ships.',
        ],
        details: [ErrorHandlingStandardsLaw.NO_VERIFIED_PATH],
        score: 0,
        fixable: false,
        config: context.config,
      })
    );
  }
}
