/**
 * Audit types and interfaces
 */

import type { RuleOfCodeConfig } from "../../types";
import type { LivenessFloor } from '../../utils/liveness-floor';

/**
 * The one-word answer of a run (#350), for badges and CI steps. `compliance`
 * is a clean pass of every law that applies; `compliance-with-waivers` passed
 * with `laws.notApplicable` waivers (named in `scope.waivedLaws`); `partial`
 * passed a narrowed subset; `failed` and `refused` say what they say. The exit
 * code does not depend on it: 0 for the three passes, 1 otherwise, as before.
 */
export type AuditVerdict = 'compliance' | 'compliance-with-waivers' | 'failed' | 'partial' | 'refused';

/** A law `laws.notApplicable` took out of the run, with the reason given. */
export interface WaivedLaw {
  /** Canonical registry title. */
  law: string;
  lawId: string;
  /** The reason, trimmed. */
  reason: string;
}

export interface AuditResult {
  passed: boolean;
  score: number;
  totalLaws: number;
  passedLaws: number;
  failedLaws: number;
  /** Laws with violations at warning/info severity — reported, not failing */
  warningLaws?: number;
  /**
   * Laws that count as EVIDENCE — everything except the always-on meta-gates.
   * This is the number the liveness floor (laws.minLawsChecked) is compared
   * against, so it must be visible: a consumer who sets the floor to the
   * printed total would otherwise fail for no reason (FE).
   */
  substantiveLaws?: number;
  /**
   * Selected laws this mode does not run — the history laws in pre-commit.
   * They still count toward `substantiveLaws`, so one floor fits every mode.
   */
  deferredLaws?: number;
  /**
   * Set when the engine REFUSED to run the audit: the selection collapsed to
   * nothing, or fell below `laws.minLawsChecked`. No law ran, so every count
   * above is zero — a refusal is not "N laws failed", it is "no law ran".
   */
  refused?: AuditRefusal;
  /**
   * The project type that selected this run's laws, and where it came from
   * (#320). The config echoed in results cannot say this: a detected type is
   * merged into it and looks configured.
   */
  project?: AuditProjectType;
  /** How much of the applicable law set ran, and whether that is partial (#348). */
  scope?: AuditScope;
  /** The run's verdict (#350); exported as the top-level `verdict` of the JSON. */
  verdict?: AuditVerdict;
  results: Map<string, unknown>;
  duration: number;
  paretoMode: boolean;
  executionTime?: number;
  timestamp?: string;
  projectRoot?: string;
  config: RuleOfCodeConfig;
  summary?: AuditStats;
}

export interface AuditOptions {
  mode?: 'fast' | 'full' | 'pre-commit' | 'pre-push';
  verbose?: boolean;
  onlyFailures?: boolean;
  parallel?: boolean;
  projectRoot?: string;
  configPath?: string;
  suggestExceptions?: boolean;
  maxConcurrent?: number;
  timeout?: number;
  includeWarnings?: boolean;
  outputFormat?: string;
  failOnWarnings?: boolean;
  categories?: string[];
  excludePatterns?: string[];
}

export interface AuditScope {
  /** Substantive laws that RAN (the always-on meta-gates excluded): 0 on a refusal; a pre-commit's deferred history laws are not counted. */
  executedLaws: number;
  /** Substantive laws the config selected — what the liveness floor and "partial" compare. */
  selectedLaws: number;
  /** Substantive laws that apply with no allowlist and no Pareto, after waivers — the "M" in "N of M". */
  applicableLaws: number;
  /** The same count before `laws.notApplicable`: `applicableLaws + waivedLaws.length` (#350). */
  applicableBeforeWaivers: number;
  /**
   * The laws `laws.notApplicable` took out of the run, by name and reason,
   * sorted by `law` (#350). Only laws that would otherwise run: a key naming
   * no law, an ambiguous key, a law already gated off by stack or
   * requirement, a meta-gate and an entry with no reason waive nothing and are
   * not listed. Counted against the OPEN selection, so a waived law that an
   * allowlist would also have dropped is still listed.
   */
  waivedLaws: WaivedLaw[];
  /** What narrowed the run, if anything. `laws.notApplicable` waivers do not: they change what applies. */
  narrowedBy: 'laws.enabled' | 'paretoMode' | undefined;
  /** Narrowed AND fewer laws selected than apply: no compliance verdict is printed. Always false on a refusal (no law ran; see `refused`). */
  partial: boolean;
  /**
   * The Audit Liveness floor and its source (#350). Its `applicableLaws` (L)
   * is counted from the registry BEFORE waivers and WITH the meta-gates, so
   * it is not M: on a plain config L = applicableBeforeWaivers + meta-gates.
   */
  liveness: LivenessFloor;
}

export interface AuditProjectType {
  /** The type the law selection used (stack gating, framework defaults). */
  type: string | undefined;
  /**
   * `detected`: from the project's dependencies and markers, with no type in
   * any config (or a config that says `generic`). `configured`: a config
   * names a type the detector would not have chosen. `default`: nothing was
   * detected and no config names a type.
   */
  source: 'configured' | 'default' | 'detected';
}

export interface AuditRefusal {
  /** `no-laws`: nothing selected. `liveness-floor`: fewer than the floor. */
  reason: 'liveness-floor' | 'no-laws';
  /** Substantive laws the config selected (what the floor is compared with). */
  selectedLaws: number;
  /** `laws.minLawsChecked` (0 when unset). */
  floor: number;
}

export interface AuditStats {
  /**
   * Law results actually produced by this run — 0 on a refusal. Always set by
   * generateStats; optional only so existing callers that build stats keep
   * compiling.
   */
  executedLaws?: number;
  totalLaws: number;
  passedLaws: number;
  failedLaws: number;
  warningLaws?: number;
  score: number;
  duration: number;
}
