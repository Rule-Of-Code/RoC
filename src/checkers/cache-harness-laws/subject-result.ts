/**
 * The verdict shape of the cache and harness laws.
 *
 * Each of these laws is selected by what git publishes (`requires`) and
 * judges a subject it finds in exactly those files: a cache, a router set up
 * by a test, a perf script. The verdict follows the 7.27.0 rule:
 *
 * - no file could be read (none left, or the parser did not load): judged
 *   nothing — the law saw nothing, and says so;
 * - files read, a violation: the findings, each at file:line;
 * - files read, no violation: a pass that says what it read and judged, and
 *   what it does not see — in the message, the details and `metrics`;
 * - files read, but no subject in them (the gate's text matched where the
 *   parser finds nothing to judge): also a pass, with the counters saying
 *   "0 … — nothing to judge". A law that read its files and found no
 *   violation never reports judged nothing.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing, withNotRead } from '../../utils/judged-nothing';
import { LawBase } from '../law-base';

export interface SubjectVerdict {
  lawName: string;
  category: string;
  context: LawCheckContext;
  findings: string[];
  /** What the law could not read, apart from its findings (#453). */
  notRead?: string[];
  suggestions: string[];
  /** Files of the subject the law read (and could parse). 0 → judged nothing. */
  filesRead: number;
  /** Why no file was read, said when `filesRead` is 0. */
  nothingRead: string;
  /** How many subjects were judged in the files read. */
  judged: number;
  /** What a read with no subject found: `0 async functions that check then store a keyed container — nothing to judge`. */
  noSubject: string;
  /** What a clean read judged: `3 cache(s) of database reads in 2 file(s)`. */
  passSummary: string;
  /** What the law does not see, said with every pass. */
  notSeen: string;
  metrics: Record<string, number>;
}

/**
 * The LawResult of a cache or harness law, by the rule in this file's header:
 * no file read is judged nothing; findings fail; a clean read passes with a
 * message naming what was read and judged (or "nothing to judge") and what
 * the law does not see. `metrics` is attached in every case.
 */
export function subjectResult(verdict: SubjectVerdict): LawResult {
  const { lawName, category, context, findings, suggestions, metrics } =
    verdict;
  if (verdict.filesRead === 0) {
    return {
      ...markJudgedNothing(
        LawBase.createResult(
          [`${lawName}: nothing was judged — ${verdict.nothingRead}`],
          lawName,
          category,
          suggestions,
          context
        )
      ),
      metrics,
    };
  }
  const created = LawBase.createResult(
    findings,
    lawName,
    category,
    suggestions,
    context
  );
  const result = withNotRead(created, verdict.notRead ?? []);
  if (!result.passed) return { ...result, metrics };
  const summary =
    verdict.judged === 0
      ? `${verdict.filesRead} file(s) read, ${verdict.noSubject}`
      : verdict.passSummary;
  const message = `${lawName}: ${summary}; ${verdict.notSeen}`;
  return { ...result, message, details: [message], metrics };
}

/** Every match of a global pattern in a text, with its 1-based line. */
export function matchesWithLines(
  content: string,
  pattern: RegExp
): Array<{ text: string; line: number }> {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++)
    if (content.charCodeAt(i) === 10) lineStarts.push(i + 1);
  const lineOf = (index: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] as number) <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const out: Array<{ text: string; line: number }> = [];
  for (let m = re.exec(content); m !== null; m = re.exec(content)) {
    out.push({ text: m[0], line: lineOf(m.index) });
    if (m[0] === '') re.lastIndex++;
  }
  return out;
}
