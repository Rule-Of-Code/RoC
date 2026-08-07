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

export interface AuditStats {
  totalLaws: number;
  passedLaws: number;
  failedLaws: number;
  warningLaws?: number;
  score: number;
  duration: number;
}
