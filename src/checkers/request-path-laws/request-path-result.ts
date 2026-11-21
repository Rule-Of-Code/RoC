/**
 * The verdict shape the request-path laws share.
 *
 * A law that read the project's sources and found no violation passes, and
 * says what it read: how many files, how many sites it could compare. A
 * project whose reads all go through dynamic collection names gives a
 * duplicate-read law nothing to compare — that is a clean read of the code,
 * not a failure to read it, and failing it would hand every such project a
 * permanent warning it could only waive. Judged nothing is kept for the one
 * case it means: no source file could be read (the parser did not load, or
 * there is no source at all).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { ONE_OFF_SCRIPT_LOCATIONS } from '../../utils/request-path/one-off-scripts';
import type { ProjectSources } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';

/** How many source files a request-path law read: Python plus TS/JS. */
export function filesRead(sources: ProjectSources): number {
  return sources.counts.python + sources.counts.typescript;
}

/** `42 source files read (40 Python, 2 TS/JS), 3 one-off script(s) under scripts/, … not judged`. */
export function describeFilesRead(sources: ProjectSources): string {
  const read = `${filesRead(sources)} source file(s) read (${sources.counts.python} Python, ${sources.counts.typescript} TS/JS)`;
  return sources.oneOffScripts > 0
    ? `${read}, ${sources.oneOffScripts} one-off script(s) under ${ONE_OFF_SCRIPT_LOCATIONS} not judged`
    : read;
}

export interface RequestPathVerdict {
  lawName: string;
  context: LawCheckContext;
  sources: ProjectSources;
  findings: string[];
  suggestions: string[];
  /** How many sites the law could compare (keyed reads, fetches). */
  compared: number;
  /** What a clean read compared: `0 document reads keyed by a literal collection — nothing to compare`. */
  passSummary: string;
  /** What the law does not see, said with every pass. */
  notSeen: string;
}

/**
 * The LawResult of a request-path law: judged nothing only when no source
 * file could be read (with the reason); otherwise the unread notes and the
 * findings, and a pass whose message says how many files were read, what was
 * compared and what the law does not see. File counts go in `metrics`.
 */
export function requestPathResult(verdict: RequestPathVerdict): LawResult {
  const {
    lawName,
    context,
    sources,
    findings,
    suggestions,
    compared,
    passSummary,
    notSeen,
  } = verdict;
  const metrics = {
    filesRead: filesRead(sources),
    pythonFiles: sources.counts.python,
    typescriptFiles: sources.counts.typescript,
    oneOffScriptsSkipped: sources.oneOffScripts,
    compared,
  };
  if (filesRead(sources) === 0) {
    const why =
      sources.unread.length > 0
        ? sources.unread.join('; ')
        : `the project has no Python or TS/JS source file outside tests and one-off scripts (${sources.oneOffScripts} under ${ONE_OFF_SCRIPT_LOCATIONS})`;
    return {
      ...markJudgedNothing(
        LawBase.createResult(
          [
            `${lawName}: nothing was judged — no source file could be read: ${why}`,
          ],
          lawName,
          'PERFORMANCE',
          suggestions,
          context
        )
      ),
      metrics,
    };
  }
  const result = LawBase.createResult(
    [...sources.unread, ...findings],
    lawName,
    'PERFORMANCE',
    suggestions,
    context
  );
  if (!result.passed) return { ...result, metrics };
  const message = `${lawName}: ${describeFilesRead(sources)}, ${passSummary}; ${notSeen}`;
  return { ...result, message, details: [message], metrics };
}
