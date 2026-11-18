/**
 * The verdict shape of the cache and harness laws.
 *
 * Each of these laws is selected by what git publishes (`requires`) and
 * judges a subject it finds in exactly those files: a cache, a router set up
 * by a test, a perf script. It passes only when it judged at least one, and
 * then says how many, and what it does not see, in the message, the details
 * and `metrics`. When the files that selected it hold no subject after all
 * (the gate's text sat in a comment or a string), it reports judged nothing,
 * never compliant.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { LawBase } from '../law-base';

export interface SubjectVerdict {
  lawName: string;
  category: string;
  context: LawCheckContext;
  findings: string[];
  suggestions: string[];
  /** How many subjects were judged; 0 → judged nothing. */
  judged: number;
  /** Why nothing was judged, said when `judged` is 0. */
  nothingJudged: string;
  /** What a clean read judged: `3 cache(s) of database reads in 2 file(s)`. */
  passSummary: string;
  /** What the law does not see, said with every pass. */
  notSeen: string;
  metrics: Record<string, number>;
}

export function subjectResult(verdict: SubjectVerdict): LawResult {
  const { lawName, category, context, findings, suggestions, judged, metrics } = verdict;
  if (judged === 0) {
    return {
      ...markJudgedNothing(
        LawBase.createResult([`${lawName}: nothing was judged — ${verdict.nothingJudged}`], lawName, category, suggestions, context)
      ),
      metrics,
    };
  }
  const result = LawBase.createResult(findings, lawName, category, suggestions, context);
  if (!result.passed) return { ...result, metrics };
  const message = `${lawName}: ${verdict.passSummary}; ${verdict.notSeen}`;
  return { ...result, message, details: [message], metrics };
}

/** Every match of a global pattern in a text, with its 1-based line. */
export function matchesWithLines(content: string, pattern: RegExp): Array<{ text: string; line: number }> {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  const lineStarts = [0];
  for (let i = 0; i < content.length; i++) if (content.charCodeAt(i) === 10) lineStarts.push(i + 1);
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
