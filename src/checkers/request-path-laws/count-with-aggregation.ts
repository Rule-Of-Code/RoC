/**
 * Count With An Aggregation (#354)
 *
 * Fetching whole documents only to take their number (`len(...)`, `.size`,
 * `.length`) makes the database bill and transfer every document and the
 * client decode and copy each one; a count aggregation returns the number
 * alone. The law reports each such site in Python and TS/JS (see
 * `utils/request-path/count-by-fetch.ts` for the shapes), and stays silent
 * when the fetched documents are used for anything else.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { describeCountByFetch, scanCountByFetch } from '../../utils/request-path/count-by-fetch';
import { declaredClients } from '../../utils/request-path/data-clients';
import { projectSources } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';

export class CountWithAggregationLaw extends LawBase {
  static readonly LAW_NAME = 'Count With An Aggregation';

  static check(context: LawCheckContext): LawResult {
    const sources = projectSources(context);
    const { sites, fetches } = scanCountByFetch(sources.modules, declaredClients(context.projectRoot));
    if (fetches === 0 && sources.unread.length === 0) {
      return markJudgedNothing(
        this.createResult(
          [
            `${this.LAW_NAME}: nothing was judged — no whole-result query fetch in ${sources.counts.python} Python and ${sources.counts.typescript} TS/JS source file(s)`,
          ],
          this.LAW_NAME,
          'PERFORMANCE',
          ['Declare the law not applicable (laws.notApplicable) with a reason if the project runs no queries'],
          context
        )
      );
    }
    return this.createResult(
      [...sources.unread, ...sites.map(describeCountByFetch)],
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Ask the database for the number: a count aggregation (Firestore count() / getCountFromServer, Mongo count_documents / countDocuments, SQL COUNT, an ORM count())',
      ],
      context
    );
  }
}
