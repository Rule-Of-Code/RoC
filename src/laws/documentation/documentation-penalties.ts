/**
 * Points each documentation law takes off its score of 100, per check that
 * finds something missing, and the limits those checks compare against.
 * Beside the laws rather than in them: their files are already past the
 * module size limit.
 */

/** Internationalization Compliance Policy. */
export const I18N_POLICY_PENALTY = {
  angularI18nConfig: 30,
  translationFiles: 25,
  hardcodedTemplateText: 20,
  hardcodedJsxText: 20,
} as const;

/** MD Footer Template. `missingMax` caps the share-based deduction. */
export const MD_FOOTER_PENALTY = {
  missingMax: 40,
  invalidFormat: 20,
  missingElements: 15,
  invalidRatings: 10,
  invalidDates: 10,
} as const;

/** Strategic Document Updates: its deductions, and when a document is stale. */
export const STRATEGIC_DOCS = {
  penalty: {
    readmeMissing: 30,
    readmeBasic: 10,
    statusRecord: 25,
    changelog: 20,
    freshness: 15,
    versionConsistency: 10,
  },
  /** A strategic document untouched for longer than this many days is stale. */
  freshnessDays: 30,
} as const;

/** TODO allowance used when thresholds.documentation.maxTodoCount is not set. */
const DEFAULT_MAX_TODOS = 30;
/** The most the TODO count can cost. */
const EXCESS_TODOS_MAX_PENALTY = 40;

/** TODO Management: its deductions and limits. */
export const TODO_RULES = {
  penalty: { improperFormat: 25, vague: 15, needsIssue: 10, stale: 10 },
  defaultMax: DEFAULT_MAX_TODOS,
  /** Below this percentage of properly formatted TODOs the format check fails. */
  minFormatted: 80,
  /** One sprint as the law counts them: a week, in milliseconds. */
  weekMs: 7 * 24 * 60 * 60 * 1000,
  /**
   * The deduction for `count` TODOs: the excess over the DEFAULT allowance,
   * relative to it, up to EXCESS_TODOS_MAX_PENALTY — the allowance a config
   * sets decides whether this applies, not how much it costs.
   */
  excessPenalty: (count: number): number =>
    Math.min(
      EXCESS_TODOS_MAX_PENALTY,
      ((count - DEFAULT_MAX_TODOS) / DEFAULT_MAX_TODOS) *
        EXCESS_TODOS_MAX_PENALTY
    ),
} as const;
