/**
 * Findings a law reports without failing: what it saw but did not judge
 * (a name computed at runtime, a class reached only through a variable) and
 * what the issue asks to be reported as information (pinch-zoom disabled, a
 * registered icon nobody uses). They travel in `suggestions` and in the
 * message — never in `violations` or `details`, which the reporter counts as
 * violations — so a passing law still says what it did not prove.
 */

import type { LawResult } from '../../types/law.types';

export function withNotes(result: LawResult, notes: string[]): LawResult {
  if (notes.length === 0) return result;
  return {
    ...result,
    message: `${result.message} — ${notes.length} note(s): ${notes.slice(0, 3).join(' · ')}${notes.length > 3 ? ' …' : ''}`,
    suggestions: [...(result.suggestions ?? []), ...notes],
  };
}
