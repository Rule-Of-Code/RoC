/**
 * Independent Awaits Run Concurrently (#351)
 *
 * Each `await` on I/O is a round trip. An async function that awaits calls
 * one after another, where no call needs an earlier one's result, makes the
 * request pay the sum of those round trips instead of the largest one. The
 * law reports each such run of awaits at its first line and lists every call
 * in it; the shared request-path model reads Python and TS/JS the same way.
 * See `utils/request-path/sequential-awaits.ts` for what cuts a run.
 *
 * It is not about any one database: any awaited call counts. A project with
 * no async function gives it nothing to judge, and it says so (judged
 * nothing), never "compliant".
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { markJudgedNothing, withNotRead } from '../../utils/judged-nothing';
import { declaredClients } from '../../utils/request-path/data-clients';
import {
  describeSequentialRun,
  scanSequentialAwaits,
} from '../../utils/request-path/sequential-awaits';
import { sourcesFromFiles } from '../../utils/request-path/sources';
import { readFilesContaining } from '../../utils/law-requirements';
import { REQUIRES_ASYNC_CODE } from '../../data/request-path-laws';
import { LawBase } from '../law-base';

export class IndependentAwaitsRunConcurrentlyLaw extends LawBase {
  static readonly LAW_NAME = 'Independent Awaits Run Concurrently';

  static check(context: LawCheckContext): LawResult {
    // The files that selected the law (requires.anyFileContaining), read the way the gate read them.
    const files = (REQUIRES_ASYNC_CODE.anyFileContaining ?? []).flatMap(entry =>
      readFilesContaining(
        context.projectRoot,
        entry,
        context.config.ignores?.global ?? []
      )
    );
    const sources = sourcesFromFiles(context.projectRoot, files);
    const { runs, asyncFunctions } = scanSequentialAwaits(
      sources.modules,
      declaredClients(context.projectRoot)
    );
    const suggestions = [
      'Start independent calls together and await them once: asyncio.gather(a(), b()) in Python, await Promise.all([a(), b()]) in TS/JS',
      'Keep an order that is part of the meaning (a write before its read, a transaction) and mark it on the line: roc: sequential-ok <reason>',
    ];
    if (asyncFunctions === 0 && sources.unread.length === 0) {
      return markJudgedNothing(
        this.createResult(
          [
            `${this.LAW_NAME}: nothing was judged — no async function in ${sources.counts.python} Python and ${sources.counts.typescript} TS/JS source file(s)`,
          ],
          this.LAW_NAME,
          'PERFORMANCE',
          [
            'Declare the law not applicable (laws.notApplicable) with a reason if the project does no async I/O',
          ],
          context
        )
      );
    }
    const result = this.createResult(
      runs.map(describeSequentialRun),
      this.LAW_NAME,
      'PERFORMANCE',
      suggestions,
      context
    );
    // What could not be read is a note, not a finding (#453).
    return withNotRead(result, sources.unread);
  }
}
