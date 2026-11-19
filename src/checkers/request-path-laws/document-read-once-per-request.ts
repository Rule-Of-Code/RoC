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
import { declaredClients } from '../../utils/request-path/data-clients';
import {
  describeDuplicateRead,
  scanDuplicateReads,
} from '../../utils/request-path/duplicate-reads';
import { projectSources } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';
import { requestPathResult } from './request-path-result';

/** Said with every pass: what the comparison cannot see. */
const NOT_SEEN =
  'not compared: reads whose collection or id is computed at run time, reads through a repository or wrapper the reader does not resolve, and reads more than one call deep';

export class DocumentReadOncePerRequestLaw extends LawBase {
  static readonly LAW_NAME = 'Document Read Once Per Request';

  static check(context: LawCheckContext): LawResult {
    const sources = projectSources(context);
    const { duplicates, keyedReads } = scanDuplicateReads(
      sources.modules,
      declaredClients(context.projectRoot)
    );
    return requestPathResult({
      lawName: this.LAW_NAME,
      context,
      sources,
      findings: duplicates.map(describeDuplicateRead),
      suggestions: [
        'Read the document once at the top of the request and pass the value down to the helpers that need it',
        'Or keep it in a request-scoped cache (a dependency scoped to the request, a per-request memo)',
      ],
      compared: keyedReads,
      passSummary:
        keyedReads === 0
          ? '0 document reads keyed by a literal collection — nothing to compare'
          : `${keyedReads} keyed document read(s) compared, no document read twice in one request`,
      notSeen: NOT_SEEN,
    });
  }
}
