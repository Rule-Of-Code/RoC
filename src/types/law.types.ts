/**
 * Constitutional Law Types and Interfaces
 * Centralized type definitions for the RuleOfCode system
 */

import type { RuleOfCodeConfig } from '../config/types';

export interface ConstitutionalLaw {
  id: string;
  name: string;
  description: string;
  category:
    | 'foundational'
    | 'maintainability'
    | 'performance'
    | 'quality'
    | 'security';
  severity: 'error' | 'info' | 'warning';
  impact: 'high' | 'low' | 'medium';
  paretoCore: boolean; // Is this part of the 20% that catches 80% of issues?
  /** Gate-of-the-gate: runs regardless of paretoMode / laws.enabled / notApplicable. */
  alwaysEnabled?: boolean;
  applicableFrameworks: string[];
  /** What this law does NOT claim — see EnhancedConstitutionalLaw.detectionLimits. */
  detectionLimits?: string[];
  /** WHY the law exists — see EnhancedConstitutionalLaw.rationale. */
  rationale?: string;
  /** How to satisfy the law per stack — see EnhancedConstitutionalLaw.satisfiedBy. */
  satisfiedBy?: { typescript?: string; angular?: string; python?: string };
  /**
   * Legacy numeric id, for migration only. NOT a config key: 25 legacyIds are
   * shared by 51 laws (v7.10.0 refuses ambiguous keys). Key by name or slug.
   */
  legacyId?: number;
  stack?: 'frontend' | 'python' | 'typescript'; // Stack scope (omitted = universal)
  check: (projectRoot: string, config: RuleOfCodeConfig) => Promise<LawResult>;
}

/**
 * Structured violation information with file and line details
 */
export interface ViolationDetail {
  file?: string; // File path (relative to project root)
  line?: number; // Line number (1-based)
  column?: number; // Column number (1-based, optional)
  message: string; // Violation message
  code?: string; // Optional violation code (e.g., 'COMPLEX-001')
  severity?: 'error' | 'warning' | 'info'; // Optional severity
}

export interface LawResult {
  lawName?: string; // Optional name of the law for reporting
  passed: boolean;
  message: string;
  details?: string[];
  score: number; // 0-100
  fixable?: boolean;
  fixCommand?: string;
  suggestions?: string[];
  violations?: string[];
  violationDetails?: ViolationDetail[]; // NEW: Structured violation information
  config: RuleOfCodeConfig; // Optional configuration information
  metrics?: Record<string, unknown>; // Optional metrics data
}

export interface LawCheckContext {
  projectRoot: string;
  config: RuleOfCodeConfig;
  lawId?: string;
}

export interface CheckerResult {
  violations: string[];
  suggestions: string[];
  score: number;
}

export interface GlobOptions {
  cwd: string;
  ignore?: string[];
}

// Re-export RawConstitutionalLaw from data
export { ConstitutionalLaw as RawConstitutionalLaw } from '../data/constitutional-laws';

// Re-export RuleOfCodeConfig type
export type { RuleOfCodeConfig };
