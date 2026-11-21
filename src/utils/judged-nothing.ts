/**
 * One verdict, one score: a law that judged nothing is a failure scored 0.
 *
 * Laws scored this verdict three different ways — 100, 90 and 0 — and the 100
 * contradicted its own `passed: false` while the overall score averaged it as
 * a perfect law, so "judged nothing" cost nothing. No evidence earns no score.
 * Severity still decides whether the result blocks.
 */

/**
 * The wording laws use when they found nothing to judge. A result that says
 * so in a violation is treated exactly like one that sets `judgedNothing`, so
 * the flag and the text cannot drift apart.
 */
export const JUDGED_NOTHING_TEXT =
  /\b(?:judged|inspected) nothing\b|\bnothing was judged\b/i;

interface JudgeableResult {
  judgedNothing?: boolean;
  violations?: unknown;
  message?: unknown;
}

/** A note that says the law judged nothing, or that files were not read. */
const NOT_JUDGED_NOTE = new RegExp(
  String.raw`${JUDGED_NOTHING_TEXT.source}|\bNOT read\b`,
  'i'
);

/**
 * The result, marked as having judged nothing: failed, score 0, and its
 * message taken from its own not-judged note. A law that computed a summary
 * from defaults ("poor setup/teardown isolation") would otherwise headline a
 * finding it never made (#427).
 */
export function markJudgedNothing<T extends object>(
  result: T
): T & { judgedNothing: true; passed: false; score: 0 } {
  const res = result as JudgeableResult;
  const note = Array.isArray(res.violations)
    ? res.violations.find(
        (v): v is string => typeof v === 'string' && NOT_JUDGED_NOTE.test(v)
      )
    : undefined;
  const message =
    typeof res.message === 'string' && NOT_JUDGED_NOTE.test(res.message)
      ? res.message
      : note;
  return {
    ...result,
    ...(message !== undefined ? { message } : {}),
    judgedNothing: true,
    passed: false,
    score: 0,
  };
}

/** Whether a law result says — by flag or by its wording — it judged nothing. */
export function saysJudgedNothing(result: unknown): boolean {
  const res = result as JudgeableResult | null | undefined;
  if (!res || typeof res !== 'object') return false;
  if (res.judgedNothing === true) return true;
  return (
    Array.isArray(res.violations) &&
    res.violations.some(
      violation =>
        typeof violation === 'string' && JUDGED_NOTHING_TEXT.test(violation)
    )
  );
}

/** Apply the one verdict to any law result that judged nothing. */
export function normalizeJudgedNothing<T>(result: T): T {
  return saysJudgedNothing(result)
    ? (markJudgedNothing(result as T & object) as T)
    : result;
}
