/**
 * Audit types and interfaces
 */

import type { RuleOfCodeConfig } from "../../types";

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
