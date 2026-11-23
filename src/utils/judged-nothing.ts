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
  notRead?: unknown;
  message?: unknown;
}

/** The string notes of a result field (violations or notRead). */
const notesOf = (field: unknown): string[] =>
  Array.isArray(field)
    ? field.filter((v): v is string => typeof v === 'string')
    : [];

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
  // The note may be among the violations, or in notRead (#453).
  const note = [...notesOf(res.violations), ...notesOf(res.notRead)].find(v =>
    NOT_JUDGED_NOTE.test(v)
  );
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

/**
 * The note of a law that could not load the TypeScript parser
 * (`parserUnavailable`). Without the parser no file read through it is read.
 */
export const PARSER_UNAVAILABLE_TEXT =
  /could not load the 'typescript' package/;

/**
 * Appended to a parser-unavailable note by a law that also reads input
 * without the parser (a tsconfig.json, a JSON config) and judged it. Its note
 * covers part of what it reads, so the law has not judged nothing.
 */
export const PARTLY_READ_TEXT = 'the rest of what this law reads was judged';

const readsNothing = (violation: unknown): boolean =>
  typeof violation === 'string' &&
  PARSER_UNAVAILABLE_TEXT.test(violation) &&
  !violation.includes(PARTLY_READ_TEXT);

/**
 * Whether a law result says — by flag or by its wording — it judged nothing.
 * A result whose every violation is a parser-unavailable note read none of
 * its files: it judged nothing, whatever the law. Counted as a finding it
 * made the run "compliance with warnings" where a law that says "judged
 * nothing" made it partial (#427). A note that covers part of the input
 * (`PARTLY_READ_TEXT`), or a note beside real findings, is not judged nothing.
 */
export function saysJudgedNothing(result: unknown): boolean {
  const res = result as JudgeableResult | null | undefined;
  if (!res || typeof res !== 'object') return false;
  if (res.judgedNothing === true) return true;
  const violations = Array.isArray(res.violations) ? res.violations : [];
  // A law that moved its notes to notRead (#453) and has no finding: every
  // note a parser-unavailable note that covers all its input is still
  // "read none of its files".
  const notRead = notesOf(res.notRead);
  if (
    violations.length === 0 &&
    notRead.length > 0 &&
    notRead.every(readsNothing)
  )
    return true;
  return (
    violations.some(
      violation =>
        typeof violation === 'string' && JUDGED_NOTHING_TEXT.test(violation)
    ) ||
    (violations.length > 0 && violations.every(readsNothing))
  );
}

/**
 * A law that found nothing wrong in what it read and says, in `notRead`, what
 * it could not read (#453). Not judged nothing — it read something — and not
 * a pass: what was not read cannot have passed.
 */
export function readsPartly(result: unknown): boolean {
  const res = result as
    (JudgeableResult & { notRead?: unknown }) | null | undefined;
  if (!res || typeof res !== 'object' || res.judgedNothing === true)
    return false;
  const notRead = Array.isArray(res.notRead) ? res.notRead : [];
  const violations = Array.isArray(res.violations) ? res.violations : [];
  return notRead.length > 0 && violations.length === 0;
}

/**
 * Apply the one verdict to any law result that judged nothing; a result that
 * read part of its input is marked not passed, its score kept (it is what
 * the law found in what it read).
 */
export function normalizeJudgedNothing<T>(result: T): T {
  if (saysJudgedNothing(result))
    return markJudgedNothing(result as T & object) as T;
  if (readsPartly(result)) return { ...(result as T & object), passed: false };
  return result;
}

/**
 * The law result with what it could not read (#453): `notRead` set and the
 * result not passed — what was not read cannot have passed. Unchanged when
 * every input was read.
 */
export function withNotRead<T extends { passed: boolean }>(
  result: T,
  notRead: readonly string[]
): T & { notRead?: string[] } {
  if (notRead.length === 0) return result;
  return { ...result, notRead: [...notRead], passed: false };
}
