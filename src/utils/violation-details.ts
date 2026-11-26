/**
 * Helpers for the laws that name what they counted in `violationDetails`
 * (#43): the place of a `file:line` string a law already printed, and a
 * result with its details attached when there are any.
 */

import type { LawResult, ViolationDetail } from '../types/law.types';

/** `file:line` (or a bare file) as a detail's place. */
export function placeOf(where: string | undefined): {
  file?: string;
  line?: number;
} {
  if (!where) return {};
  const match = /^(.*):(\d+)$/.exec(where);
  return match?.[1] && match[2]
    ? { file: match[1], line: Number(match[2]) }
    : { file: where };
}

/** The result with its details, when there are any. */
export function withViolationDetails<T extends LawResult>(
  result: T,
  details: readonly ViolationDetail[]
): T {
  if (details.length > 0) result.violationDetails = [...details];
  return result;
}
