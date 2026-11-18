/**
 * The liveness floor: how few laws an audit may run before it is a collapsed
 * selection rather than evidence — and where that number comes from.
 *
 * One function, read by the two places that need it: the Audit Liveness
 * Assertion law judges the run against it, and the engine reports it in
 * `scope.liveness` and prints it. Computed twice by two copies, the number a
 * user reads and the number the law enforces could drift apart without anyone
 * noticing (#350).
 *
 * The count L is taken from the registry BEFORE `laws.notApplicable` and WITH
 * the always-on meta-gates: waiving laws must not lower the floor, which is
 * the point of a floor. It is a different set from `scope.applicableLaws` (M,
 * after waivers, without the meta-gates); on a plain config L = M + W + G.
 *
 * L is counted for the configured type AND for the type the selection uses,
 * and the larger count is taken (#371): a config saying `generic` on a
 * project detected as Python counted 60 laws while 95 applied, so the floor
 * was 15 where 25% of what runs is 24. Taking the selection's type alone
 * could LOWER a floor (no configured type counts every law), so the floor
 * may only go up.
 */
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../data/enhanced-laws';
import { lawAppliesToProjectType, runsWithoutAllowlist } from './law-identity';
import { lawRequirementsMet } from './law-requirements';
import { selectionProjectType } from './selection-project-type';

export type LivenessFloorSource =
  'default-25%' | 'laws.minLawsChecked' | 'narrowed';
export type LawNarrowing = 'laws.enabled' | 'paretoMode' | 'categories';

/**
 * Where the engine records a narrowing by `categories` (a constructor option,
 * not a config key) in the config it audits with, so that the selector, the
 * scope and the Audit Liveness law — which receives only the config — read
 * one value.
 */
export const CATEGORIES_KEY = '__categories';

export interface LivenessFloor {
  /** L: registry laws applicable to this project, before waivers, meta-gates included. */
  applicableLaws: number;
  /** The fewest substantive laws the run may select. */
  floor: number;
  /** `laws.minLawsChecked` when set; 0 for a deliberate narrowing; else 25% of L. */
  floorSource: LivenessFloorSource;
}

/** Default floor: 25% of the registry laws applicable to this stack. */
export const DEFAULT_FLOOR_RATIO = 0.25;

/**
 * The parts of a config the floor reads. Structural, so that both config
 * types in use (the engine's and the laws') are accepted as they are.
 */
export interface LivenessConfig {
  laws?: unknown;
  project?: { type?: string };
  ignores?: { global?: readonly string[] };
}

interface LivenessLawsConfig {
  minLawsChecked?: number | null;
  enabled?: Record<string, boolean>;
  paretoMode?: boolean;
  severity?: Record<string, unknown>;
  [CATEGORIES_KEY]?: unknown;
}

/** The categories the run is narrowed to; empty when it is not. */
export function categoriesOf(laws: unknown): string[] {
  const value = ((laws ?? {}) as LivenessLawsConfig)[CATEGORIES_KEY];
  return Array.isArray(value)
    ? value.filter((c): c is string => typeof c === 'string')
    : [];
}

/**
 * What deliberately narrowed the selection, if anything. Every one of them
 * makes a run with fewer laws than apply partial; the first that applies is
 * named: Pareto (applied first by the selector), then a `laws.enabled`
 * allowlist, then `categories` (#370).
 */
export function narrowingOf(laws: unknown): LawNarrowing | undefined {
  const config = (laws ?? {}) as LivenessLawsConfig;
  if (config.paretoMode === true) return 'paretoMode';
  if (config.enabled !== undefined) return 'laws.enabled';
  return categoriesOf(laws).length > 0 ? 'categories' : undefined;
}

/**
 * L. Requirement-gated laws (Ionic, Capacitor) count only where the project
 * declares their subject, and an opt-in law (`defaultEnabled: false`) counts
 * when its severity turns it on — the selector's own rules, so the floor is a
 * fraction of what can actually run. `laws.notApplicable` is NOT subtracted.
 * The larger of the counts for the configured type and for the type the
 * selection uses (see the header).
 */
export function livenessApplicableLaws(
  config: LivenessConfig,
  projectRoot: string
): number {
  const configured = config.project?.type;
  const selected = selectionProjectType(configured, projectRoot);
  const forConfigured = applicableLawsFor(configured, config, projectRoot);
  return selected === configured
    ? forConfigured
    : Math.max(forConfigured, applicableLawsFor(selected, config, projectRoot));
}

/** L for one project type. */
function applicableLawsFor(
  projectType: string | undefined,
  config: LivenessConfig,
  projectRoot: string
): number {
  const severity = (config.laws as LivenessLawsConfig | undefined)?.severity;
  return ALL_ENHANCED_CONSTITUTIONAL_LAWS.filter(
    l =>
      runsWithoutAllowlist(
        { name: l.title, id: l.id, defaultEnabled: l.defaultEnabled },
        severity
      ) &&
      lawAppliesToProjectType(
        l.stack,
        projectType,
        projectRoot,
        l,
        config.ignores?.global
      ) &&
      lawRequirementsMet(l.requires, projectRoot, config.ignores?.global)
  ).length;
}

/**
 * The floor in effect. A `laws.enabled` allowlist, Pareto or `categories` is
 * a DELIBERATE narrowing: the default 25% would punish an explicit choice, so
 * there the project declares its own floor via `laws.minLawsChecked`.
 */
export function livenessFloorOf(
  config: LivenessConfig,
  projectRoot: string
): LivenessFloor {
  const laws = (config.laws ?? {}) as LivenessLawsConfig;
  const applicableLaws = livenessApplicableLaws(config, projectRoot);
  if (laws.minLawsChecked !== undefined && laws.minLawsChecked !== null) {
    return {
      applicableLaws,
      floor: laws.minLawsChecked,
      floorSource: 'laws.minLawsChecked',
    };
  }
  if (narrowingOf(laws) !== undefined) {
    return { applicableLaws, floor: 0, floorSource: 'narrowed' };
  }
  return {
    applicableLaws,
    floor: Math.max(1, Math.ceil(DEFAULT_FLOOR_RATIO * applicableLaws)),
    floorSource: 'default-25%',
  };
}

/** One line: the floor and where it comes from. */
export function describeLivenessFloor(
  floor: LivenessFloor,
  narrowedBy?: LawNarrowing
): string {
  switch (floor.floorSource) {
    case 'laws.minLawsChecked':
      return `floor ${floor.floor} — laws.minLawsChecked`;
    case 'narrowed':
      return `floor 0 — narrowed by ${narrowedBy ?? 'laws.enabled'}; set laws.minLawsChecked`;
    default:
      return `floor ${floor.floor} — default 25% of ${floor.applicableLaws} stack-applicable laws (meta-gates included, counted before waivers)`;
  }
}
