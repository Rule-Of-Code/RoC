/**
 * One verdict shape for the edge and deploy-security laws.
 *
 * A law that read no file of its subject judged nothing. One that read
 * files but could judge none of what it found (every case a note) judged
 * nothing too. One whose files held nothing it takes for its subject (the
 * gate matched a comment) passes and says it found nothing to judge. A pass
 * otherwise counts what it judged, in the message and in `metrics`, and says
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
}

export abstract class EdgeDeployLawBase extends LawBase {
  protected static conclude(context: LawCheckContext, c: Conclusion): LawResult {
    const metrics = { filesRead: c.filesRead, judged: c.tally.judged, notJudged: c.tally.notes.length, findings: c.tally.findings.length, ...c.metrics };
    if (c.tally.judged === 0) return { ...this.unjudged(context, c), metrics };
    const findings = [...c.tally.findings].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const result = this.createResult(findings, c.name, c.category, c.recommendations, context);
    const counted = result.passed
      ? { ...result, message: `${c.name}: ${c.tally.judged} ${c.unit} in ${c.filesRead} file(s), no finding; not seen: ${c.notSeen}` }
      : result;
    return { ...withNotes(counted, c.tally.notes), metrics };
  }

  private static unjudged(context: LawCheckContext, c: Conclusion): LawResult {
    if (c.filesRead > 0 && c.tally.notes.length === 0) {
      const result = this.createResult([], c.name, c.category, [], context);
      return { ...result, message: `${c.name}: ${c.filesRead} file(s) read, none holds ${c.subject} this law can judge (what selected it is not one here, e.g. a commented-out line)` };
    }
    const why =
      c.filesRead === 0
        ? `read no file with ${c.subject}`
        : `read ${c.filesRead} file(s) with ${c.subject} but could judge none of it (see the notes)`;
    const result = this.createResult([`${c.name} ${why} — this law judged nothing`], c.name, c.category, [], context);
    return withNotes(markJudgedNothing(result), c.tally.notes);
  }
}
