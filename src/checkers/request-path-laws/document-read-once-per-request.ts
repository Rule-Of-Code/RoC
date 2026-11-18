/**
 * Document Read Once Per Request (#353)
 *
 * Helpers on one request path that each read the same document (the
 * caller's profile, a settings record) make the request pay for it two or
 * three times. The law follows a function and the functions it calls one
 * step deep (same module or one import), puts every read in the caller's
 * terms, and reports a document read more than once, naming every site.
 * Precision before recall: only a literal collection and an identical id
 * expression make two reads the same document (see
 * `utils/request-path/duplicate-reads.ts`).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { declaredClients } from '../../utils/request-path/data-clients';
import { describeDuplicateRead, scanDuplicateReads } from '../../utils/request-path/duplicate-reads';
import { projectSources } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';

export class DocumentReadOncePerRequestLaw extends LawBase {
  static readonly LAW_NAME = 'Document Read Once Per Request';

  static check(context: LawCheckContext): LawResult {
    const sources = projectSources(context);
    const { duplicates, keyedReads } = scanDuplicateReads(sources.modules, declaredClients(context.projectRoot));
    if (keyedReads === 0 && sources.unread.length === 0) {
      return markJudgedNothing(
        this.createResult(
          [
            `${this.LAW_NAME}: nothing was judged — no read of one document by a literal collection and an id in ${sources.counts.python} Python and ${sources.counts.typescript} TS/JS source file(s)`,
          ],
          this.LAW_NAME,
          'PERFORMANCE',
          ['Declare the law not applicable (laws.notApplicable) with a reason if the project reads no documents by key'],
          context
        )
      );
    }
    return this.createResult(
      [...sources.unread, ...duplicates.map(describeDuplicateRead)],
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Read the document once at the top of the request and pass the value down to the helpers that need it',
        'Or keep it in a request-scoped cache (a dependency scoped to the request, a per-request memo)',
      ],
      context
    );
  }
}
