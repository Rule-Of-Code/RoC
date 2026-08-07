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
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../data/enhanced-laws';
import { lawAppliesToProjectType } from '../../utils/law-identity';
import { LawBase } from '../law-base';

export class AuditLivenessLaw extends LawBase {
  private static readonly LAW_NAME = 'Audit Liveness Assertion';
  /** Default floor: 25% of the registry laws applicable to this stack. */
  private static readonly DEFAULT_FLOOR_RATIO = 0.25;

  static check(context: LawCheckContext): LawResult {
    const { config } = context;
    const laws = config.laws as {
      minLawsChecked?: number;
      __plannedLawCount?: number;
      enabled?: Record<string, boolean>;
      paretoMode?: boolean;
    };
    const planned = laws.__plannedLawCount;

    // A laws.enabled allowlist or paretoMode is a DELIBERATE narrowing — the
    // default 25% floor would punish an explicit choice. In those modes the
    // project declares its own floor via laws.minLawsChecked (which the engine
    // enforces as a hard refusal). Everywhere else, a low count means
    // something collapsed, and that is what this law is for.
    const deliberatelyNarrowed =
      laws.enabled !== undefined || laws.paretoMode === true;

    const violations: string[] = [];
    if (typeof planned === 'number') {
      const projectType = config.project?.type;
      const applicable = ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(l =>
        lawAppliesToProjectType(l.stack, projectType)
      ).length;
      const defaultFloor = deliberatelyNarrowed
        ? 0
        : Math.max(
            1,
            Math.ceil(AuditLivenessLaw.DEFAULT_FLOOR_RATIO * applicable)
          );
      const floor = laws.minLawsChecked ?? defaultFloor;

      if (planned < floor) {
        violations.push(
          `Audit is executing only ${planned} laws — below the liveness floor of ${floor} (${
            laws.minLawsChecked !== undefined
              ? 'laws.minLawsChecked'
              : `default 25% of ${applicable} stack-applicable laws`
          }). A collapsed law selection is a disarmed gate, not compliance.`
        );
      }
    }

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
