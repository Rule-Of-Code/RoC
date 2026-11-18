/**
 * Audit Liveness Assertion
 * Born from the v7.5.1 incident: a real config executed ZERO laws and printed
 * PASSED with exit 0 — the consumer survived only via their own bash floor
 * (Total Laws Checked >= 40). The floor belongs IN the tool, as a law: the
 * audit fails when it planned fewer laws than the liveness floor, regardless
 * of how green the individual checks are. Zero (or near-zero) checks is never
 * compliance.
 *
 * The engine injects the planned law count into config before the run (see
 * RuleOfCodeAuditor.executeLawChecks); without it (direct invocation in unit
 * tests) the law passes — the engine-level zero-refusal still guards hard zero.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { describeLivenessFloor, livenessFloorOf, narrowingOf } from '../../utils/liveness-floor';
import { LawBase } from '../law-base';

export class AuditLivenessLaw extends LawBase {
  private static readonly LAW_NAME = 'Audit Liveness Assertion';

  static check(context: LawCheckContext): LawResult {
    const { config } = context;
    const planned = (config.laws as { __plannedLawCount?: number }).__plannedLawCount;
    if (typeof planned !== 'number') return this.result([], context);

    // The floor and its source come from the one function the engine also
    // reports in scope.liveness, so the number printed is the number judged.
    // A laws.enabled allowlist or paretoMode is a DELIBERATE narrowing: the
    // default 25% would punish an explicit choice, so there the project sets
    // laws.minLawsChecked (which the engine enforces as a hard refusal).
    const floor = livenessFloorOf(config, context.projectRoot);
    if (planned < floor.floor) {
      return this.result(
        [
          `Audit is executing only ${planned} laws — below the liveness floor of ${floor.floor} (${
            floor.floorSource === 'laws.minLawsChecked'
              ? 'laws.minLawsChecked'
              : `default 25% of ${floor.applicableLaws} stack-applicable laws`
          }). A collapsed law selection is a disarmed gate, not compliance.`,
        ],
        context
      );
    }

    // A pass names the floor it passed, and where the floor comes from: "compliance
    // verified" alone left the floor in effect invisible (#350).
    const passed = this.result([], context);
    return {
      ...passed,
      message: `${this.LAW_NAME}: ${planned} laws selected — ${describeLivenessFloor(floor, narrowingOf(config.laws))}`,
    };
  }

  private static result(violations: string[], context: LawCheckContext): LawResult {
    return this.createResult(
      violations,
      this.LAW_NAME,
      'SECURITY',
      [
        'Check laws.enabled / laws.notApplicable / paretoMode — something collapsed the selection',
        'Set an explicit laws.minLawsChecked floor for your project (e.g. your known post-waiver count)',
      ],
      context
    );
  }
}
