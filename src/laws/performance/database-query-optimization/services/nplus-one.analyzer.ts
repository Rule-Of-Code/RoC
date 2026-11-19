import type { LawCheckContext } from '../../../../types/law.types';
import { declaredClients } from '../../../../utils/request-path/data-clients';
import {
  describeLoopRead,
  scanLoopReads,
} from '../../../../utils/request-path/loop-reads';
import type { SourceLanguage } from '../../../../utils/request-path/model';
import { projectSources } from '../../../../utils/request-path/sources';

/** The N+1 verdict: one finding per call site, plus what was read to reach it. */
export interface NPlusOneAnalysis {
  addressed: boolean;
  /** `rel/path:line: …` for every read that runs once per loop item. */
  sites: string[];
  /** Files that could not be parsed: never counted as clean. */
  unread: string[];
  /** Awaited reads the client registry recognised anywhere (0 = nothing to judge). */
  recognisedReads: number;
  files: Record<SourceLanguage, number>;
}

/**
 * NPlusOneAnalyzerService
 *
 * Judges N+1 per call site (#352). It used to return "addressed" for the
 * whole project as soon as one service file contained a batching word, so a
 * read per item in a loop in any other file passed. Every source file is
 * read now (not only `*.service.ts`), through the shared request-path model:
 * an awaited read in the body of a loop of the same function is a finding at
 * its own line, unless that call reads many keys at once or the reads are
 * gathered concurrently.
 */
export class NPlusOneAnalyzerService {
  static analyze(
    context: LawCheckContext,
    languages: readonly SourceLanguage[]
  ): NPlusOneAnalysis {
    const sources = projectSources(context, languages);
    const scan = scanLoopReads(
      sources.modules,
      declaredClients(context.projectRoot)
    );
    const sites = scan.sites.map(describeLoopRead);
    return {
      addressed: sites.length === 0 && sources.unread.length === 0,
      sites,
      unread: sources.unread,
      recognisedReads: scan.recognisedReads,
      files: sources.counts,
    };
  }
}
