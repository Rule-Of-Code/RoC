import type { LawRequirement } from '../types/enhanced-law.types';
import type { LawCheckContext, LawResult } from '../types/law.types';
import { lawAppliesToProjectType } from './law-identity';
import { lawRequirementsMet } from './law-requirements';
import { concernIsWaived } from './law-waivers';
import { selectionProjectType } from './selection-project-type';

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
 *
 * An owning law the audit would not select for this project — its `stack`
 * excludes the project type, or its `requires` names a subject the project
 * does not declare — says the concern does not exist here, exactly as a
 * written `notApplicable` does. Running it anyway asks a law about a subject
 * that is absent; it inspects nothing and fails, and the checklist would
 * report a concern the audit itself has already ruled out (#428).
 */

/** Laws currently being consulted, so a cycle cannot recurse forever. */
const inFlight = new Set<string>();

/** A law class as the registry stores it, reduced to what is needed here. */
interface SyncLawClass {
  check: (context: LawCheckContext) => LawResult | Promise<LawResult>;
}

/** A law card, reduced to what selection and resolution read. */
interface LawCard {
  title?: string;
  checkFunction?: string;
  stack?: string;
  staticSiteHtml?: boolean;
  requires?: LawRequirement;
}

function lawCard(lawName: string): LawCard | undefined {
  // Required lazily: the registry imports every law, so a law importing the
  // registry at module scope would close a cycle. By the time a check runs,
  // every module is loaded.
  const { ALL_ENHANCED_CONSTITUTIONAL_LAWS } =
    require('../data/enhanced-laws') as {
      ALL_ENHANCED_CONSTITUTIONAL_LAWS: LawCard[];
    };
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === lawName);
}

/** Would the audit select this law for this project at all (stack and requires)? */
function selectedFor(context: LawCheckContext, law: LawCard): boolean {
  const config = context.config as {
    project?: { type?: string };
    ignores?: { global?: readonly string[] };
  };
  const ignores = config.ignores?.global ?? [];
  const projectType = selectionProjectType(
    config.project?.type,
    context.projectRoot
  );
  return (
    lawAppliesToProjectType(
      law.stack,
      projectType,
      context.projectRoot,
      law,
      ignores
    ) && lawRequirementsMet(law.requires, context.projectRoot, ignores)
  );
}

function resolveLawClass(law: LawCard): SyncLawClass | null {
  const { ModularLawsRegistry } =
    require('../registry/modular-laws-registry') as {
      ModularLawsRegistry: { LAW_CLASS_MAPPING: Record<string, SyncLawClass> };
    };

  if (!law.checkFunction) return null;
  return ModularLawsRegistry.LAW_CLASS_MAPPING[law.checkFunction] ?? null;
}

/**
 * Runs the law titled `lawName` against `context` and resolves true when it
 * passes, or when the project waives that concern. Resolves false when the
 * law is unknown, throws, or is already being consulted further up the call
 * stack (a cycle).
 */
export async function owningLawSatisfied(
  context: LawCheckContext,
  lawName: string
): Promise<boolean> {
  if (concernIsWaived(context.config, lawName)) return true;
  if (inFlight.has(lawName)) return false;

  inFlight.add(lawName);
  try {
    const law = lawCard(lawName);
    if (!law) return false;
    if (!selectedFor(context, law)) return true;
    const LawClass = resolveLawClass(law);
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
