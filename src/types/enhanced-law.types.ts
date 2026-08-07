/**
 * Enhanced Constitutional Law Types
 * Advanced enterprise-grade type definitions with Pareto optimization
 */

export type LawPriority = "CRITICAL" | "HIGH" | "LOW" | "MEDIUM";

export type LawCategory =
  "ACCESSIBILITY" | "CODE_QUALITY" | "DEPLOYMENT" | "DOCUMENTATION" | "FRAMEWORK" | "PERFORMANCE" | "PROJECT_SPECIFIC" | "PYTHON" | "SACRED_LAW" | "SECURITY" | "TESTING" | "VERSION_CONTROL";

export type AutomationType = "AUTOMATED" | "CONFIGURABLE" | "MANUAL";

export type LawSeverity = "error" | "info" | "warning";

/**
 * Stack scope of a law — which project stacks it is meaningful for. Omitted means
 * universal (applies to every stack: git, secrets, CI/CD, generic docs, …).
 *   - "frontend"   → browser/UI frameworks (angular/react/vue/ionic)
 *   - "typescript" → TS-language laws (any TS project, but NOT python)
 *   - "python"     → Python backend laws (FastAPI + Clean Architecture/CQRS)
 * The audit skips a law whose stack does not include the detected project type,
 * so e.g. Core Web Vitals / bundle / NgRx never fire on a Python backend and the
 * Python laws never fire on an Angular frontend.
 */
export type LawStack = "frontend" | "python" | "typescript";

export interface EnhancedConstitutionalLaw {
  id: string; // Changed from number to string for hash-based IDs
  article?: string;
  section?: string;
  subsection: string;
  title: string;
  emoji: string;
  description: string;
  priority: LawPriority;
  category: LawCategory;
  automation: AutomationType;
  defaultEnabled: boolean; // Pareto defaults
  /** Gate-of-the-gate: cannot be disabled by config (paretoMode/enabled/notApplicable). */
  alwaysEnabled?: boolean;
  defaultSeverity: LawSeverity;
  checkFunction?: string;
  violationMessage: string;
  remediation: string;
  /**
   * What this law does NOT claim — the boundaries of its detection, in the
   * author's words, next to the detector. This is the "Detection Limits" section
   * of the site's Law Card, and it exists because false confidence is the enemy
   * this whole tool is built to kill: a law that silently misses a case, while
   * looking like it covers it, is the `unauthorized_401` metric that fed nothing.
   * Declared here so it is reviewed as CODE and cannot drift from the detector.
   * Absent = not declared yet (rendered as visible debt, never as "no limits").
   */
  detectionLimits?: string[];
  /**
   * WHY this law exists — the incident or principle that birthed it, not what the
   * check does (that is `description`). The difference between a "rule" and a
   * "law". Where there is a real story (the zero-laws PASSED, the checklist that
   * demanded a lie, the metric that fed nothing) it is the strongest argument we
   * own. Absent = not declared yet.
   */
  rationale?: string;
  /**
   * How a project SATISFIES this law, in the language of each stack it applies
   * to — a short, real fragment, not a paragraph. Without it, every consumer asks
   * "ok, now what do I do?" and gets `description`, which is not an answer. Keys
   * are only the stacks the law is meaningful for. Absent = not declared yet.
   */
  satisfiedBy?: {
    typescript?: string;
    angular?: string;
    python?: string;
  };
  /**
   * Legacy numeric id, for migration only. NOT a config key: 25 legacyIds are
   * shared by 51 laws, so keying a config by one silently affects several. Key by
   * canonical name or slug; the engine refuses ambiguous keys (v7.10.0).
   */
  legacyId?: number;
  stack?: LawStack; // Stack scope (omitted = universal). See LawStack.
}

export interface ParetoCategories {
  HIGH_IMPACT: string[];
  MEDIUM_IMPACT: string[];
  LOW_IMPACT: string[];
}

export interface FrameworkLaws {
  angular: string[];
  react: string[];
  vue: string[];
}

export type ProjectLaws = Record<string, string[]>;
