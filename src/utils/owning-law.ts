import type { LawCheckContext, LawResult } from '../types/law.types';
import { concernIsWaived } from './law-waivers';

/**
 * Does the law that OWNS a concern say the project meets it?
 *
 * A checklist law names concerns that are also laws in their own right —
 * authentication, health checks, logging, benchmarking. Since #96 those
 * sub-checks defer to an adopter's written `notApplicable`, which settles the
 * case where the concern does not exist. This settles the better case: the
 * concern exists, the project meets it, the owning law says so, and the
 * checklist disagrees anyway.
 *
 * Left unfixed it creates a perverse incentive — waive a law you PASS, purely
 * so a different law stops reporting it.
 *
 * The owning law is RUN rather than read out of the audit results, so the
 * answer cannot depend on which law happened to execute first. It is consulted
 * only after the local analyzer has already failed, so the extra work happens
 * on the path that was about to produce a finding.
 */

/** Laws currently being consulted, so a cycle cannot recurse forever. */
const inFlight = new Set<string>();

/** A law class as the registry stores it, reduced to what is needed here. */
interface SyncLawClass {
  check: (context: LawCheckContext) => LawResult | Promise<LawResult>;
}

function resolveLawClass(lawName: string): SyncLawClass | null {
  // Required lazily: the registry imports every law, so a law importing the
  // registry at module scope would close a cycle. By the time a check runs,
  // every module is loaded.
  const { ALL_ENHANCED_CONSTITUTIONAL_LAWS } = require('../data/enhanced-laws') as {
    ALL_ENHANCED_CONSTITUTIONAL_LAWS: Array<{
      title?: string;
      checkFunction?: string;
    }>;
  };
  const { ModularLawsRegistry } = require('../registry/modular-laws-registry') as {
    ModularLawsRegistry: { LAW_CLASS_MAPPING: Record<string, SyncLawClass> };
  };

  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === lawName);
  if (!law?.checkFunction) return null;

  return ModularLawsRegistry.LAW_CLASS_MAPPING[law.checkFunction] ?? null;
}

export async function owningLawSatisfied(
  context: LawCheckContext,
  lawName: string
): Promise<boolean> {
  if (concernIsWaived(context.config, lawName)) return true;
  if (inFlight.has(lawName)) return false;

  inFlight.add(lawName);
  try {
    const LawClass = resolveLawClass(lawName);
    if (!LawClass) return false;

    // Awaited, because two of the four owning laws answer asynchronously.
    // A synchronous consultation returned false for those, so the deferral
    // could never fire for them — a fix that works for half the cases and
    // says nothing about the other half is the shape this project exists to
    // refuse.
    const result = await LawClass.check(context);
    return result.passed === true;
  } catch {
    // A law that cannot be run tells us nothing, and silence would be a pass
    // this project has not earned.
    return false;
  } finally {
    inFlight.delete(lawName);
  }
}
