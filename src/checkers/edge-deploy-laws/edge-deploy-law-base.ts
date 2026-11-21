/**
 * One verdict shape for the edge and deploy-security laws.
 *
 * A law that read no file of its subject judged nothing (the gate does not
 * select it then). A read of one or more files is a pass unless a finding
 * says otherwise — also when every case it found is a note it could not
 * judge (listed, with the counts), and when the files held nothing it takes
 * for its subject (the gate matched a comment). "Nothing was judged" is
 * never a violation, except when the parser the law needs cannot be loaded.
 * A pass counts what it judged, in the message and in `metrics`, and says
 * what it does not see — "compliance verified" alone would claim more.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { withNotes } from '../../utils/ionic/law-notes';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { LawBase } from '../law-base';

export interface Tally {
  findings: string[];
  notes: string[];
  judged: number;
}

/** An empty tally, for a law to count into while it reads its files. */
export const newTally = (): Tally => ({ findings: [], notes: [], judged: 0 });

export interface Conclusion {
  name: string;
  category: string;
  tally: Tally;
  filesRead: number;
  /** What the files hold, for messages: "a wrangler configuration". */
  subject: string;
  /** What `judged` counts: "wrangler configuration(s) judged". */
  unit: string;
  /** What the law does not see, named in a pass. */
  notSeen: string;
  recommendations: string[];
  metrics?: Record<string, number>;
  /** The parser the law needs could not be loaded — the one case a read with nothing judged is "judged nothing". */
  parserUnavailable?: boolean;
}

/**
 * Base of the edge and deploy-security laws (hosting rewrite region, job
 * definition dumps, proxy origin host, test-build Firebase config, worker
 * public URLs). `conclude` turns a law's tally into its LawResult by the rule
 * in this file's header: sorted findings, notes attached, counts in `metrics`,
 * and judged nothing only when no file was read or the parser was missing.
 */
export abstract class EdgeDeployLawBase extends LawBase {
  protected static conclude(
    context: LawCheckContext,
    c: Conclusion
  ): LawResult {
    const metrics = {
      filesRead: c.filesRead,
      judged: c.tally.judged,
      notJudged: c.tally.notes.length,
      findings: c.tally.findings.length,
      ...c.metrics,
    };
    if (c.tally.judged === 0) return { ...this.unjudged(context, c), metrics };
    const findings = [...c.tally.findings].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
    const result = this.createResult(
      findings,
      c.name,
      c.category,
      c.recommendations,
      context
    );
    const counted = result.passed
      ? {
          ...result,
          message: `${c.name}: ${c.tally.judged} ${c.unit} in ${c.filesRead} file(s), no finding; not seen: ${c.notSeen}`,
        }
      : result;
    return { ...withNotes(counted, c.tally.notes), metrics };
  }

  private static unjudged(context: LawCheckContext, c: Conclusion): LawResult {
    if (c.filesRead > 0 && !c.parserUnavailable) {
      const result = this.createResult([], c.name, c.category, [], context);
      const message =
        c.tally.notes.length === 0
          ? `${c.name}: ${c.filesRead} file(s) read, none holds ${c.subject} this law can judge (what selected it is not one here, e.g. a commented-out line)`
          : `${c.name}: ${c.filesRead} file(s) read, 0 ${c.unit}; ${c.tally.notes.length} case(s) not judged (listed in the notes) — no finding`;
      return withNotes({ ...result, message }, c.tally.notes);
    }
    const why =
      c.filesRead === 0
        ? `read no file with ${c.subject}`
        : `could not parse the ${c.filesRead} file(s) it read (see the notes)`;
    const result = this.createResult(
      [`${c.name} ${why} — this law judged nothing`],
      c.name,
      c.category,
      [],
      context
    );
    return withNotes(markJudgedNothing(result), c.tally.notes);
  }
}
