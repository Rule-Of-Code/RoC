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
import { describeCountByFetch, scanCountByFetch } from '../../utils/request-path/count-by-fetch';
import { declaredClients } from '../../utils/request-path/data-clients';
import { projectSources } from '../../utils/request-path/sources';
import { LawBase } from '../law-base';
import { requestPathResult } from './request-path-result';

export class CountWithAggregationLaw extends LawBase {
  static readonly LAW_NAME = 'Count With An Aggregation';

  static check(context: LawCheckContext): LawResult {
    const sources = projectSources(context);
    const { sites, fetches } = scanCountByFetch(sources.modules, declaredClients(context.projectRoot));
    return requestPathResult({
      lawName: this.LAW_NAME,
      context,
      sources,
      findings: sites.map(describeCountByFetch),
      suggestions: [
        'Ask the database for the number: a count aggregation (Firestore count() / getCountFromServer, Mongo count_documents / countDocuments, SQL COUNT, an ORM count())',
      ],
      compared: fetches,
      passSummary:
        fetches === 0
          ? 'no whole-result fetch counted — nothing to check'
          : `${fetches} whole-result fetch(es) checked, none fetched only to be counted`,
      notSeen:
        'not checked: counts through a repository method the client registry does not list, and documents counted in a helper the fetch was passed to',
    });
  }
}
