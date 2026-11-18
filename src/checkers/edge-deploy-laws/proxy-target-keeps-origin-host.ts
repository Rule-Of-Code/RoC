/**
 * Proxy Target Keeps Origin Host
 *
 * A proxy that builds its upstream URL with `new URL(incomingPath, ORIGIN)`
 * (Python: `urljoin(ORIGIN, path)`) forwards to whatever host a `//host/…`
 * path names, with the headers it adds — a shared origin secret too. The
 * safe form starts from the origin and copies only the path and query.
 * What is followed and what is not: utils/edge-deploy/proxy-target.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { gateFiles } from '../../utils/edge-deploy/gate-files';
import {
  type UpstreamCall,
  UpstreamUrlScan,
} from '../../utils/edge-deploy/proxy-target';
import { pythonUpstreamCalls } from '../../utils/edge-deploy/proxy-target-python';
import { REQUIRES_PROXY_UPSTREAM_URL } from '../../utils/edge-deploy/requirements';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../../utils/react/tsx-source';
import {
  EdgeDeployLawBase,
  newTally,
  type Tally,
} from './edge-deploy-law-base';

const NOT_SEEN =
  'a URL built in a helper and returned to the caller, a guard that rejects // paths before the call, frameworks that proxy by configuration (http-proxy target, rewrites)';

export class ProxyTargetKeepsOriginHostLaw extends EdgeDeployLawBase {
  static readonly LAW_NAME = 'Proxy Target Keeps Origin Host';

  static check(context: LawCheckContext): LawResult {
    const tally = newTally();
    const files = gateFiles(context, REQUIRES_PROXY_UPSTREAM_URL);
    const ts = files.some(file => !file.rel.endsWith('.py'))
      ? loadTypeScript(context.projectRoot)
      : null;
    let calls = 0;
    for (const file of files) {
      if (file.rel.endsWith('.py')) {
        calls += this.judge(file.rel, pythonUpstreamCalls(file.content), tally);
      } else if (ts) {
        calls += this.judge(
          file.rel,
          new UpstreamUrlScan(
            TsxSource.parse(ts, file.file, file.content)
          ).calls(),
          tally
        );
      } else {
        tally.notes.push(
          `${file.rel}: ${parserUnavailable(context.projectRoot)} — not judged`
        );
      }
    }
    return this.conclude(context, {
      name: this.LAW_NAME,
      category: 'SECURITY',
      tally,
      filesRead: files.length,
      subject: 'a URL built against a base (new URL(x, base) / urljoin)',
      unit: 'URL(s) built against a base judged',
      notSeen: NOT_SEEN,
      recommendations: [
        'Start from the origin and copy only the path and query: const t = new URL(ORIGIN); t.pathname = incoming.pathname; t.search = incoming.search',
        'Reject an incoming path that does not start with exactly one "/" (//host and /\\host are other hosts)',
      ],
      metrics: { urlCalls: calls },
    });
  }

  /** Count the calls and report those that forward a request-derived reference. */
  private static judge(
    rel: string,
    calls: UpstreamCall[],
    tally: Tally
  ): number {
    for (const call of calls) {
      tally.judged++;
      if (call.verdict !== 'escapes') continue;
      tally.findings.push(
        `${rel}:${call.line}: the upstream URL is resolved from the incoming request (${call.input}) against a base and then requested — a path starting with // (or /\\) names another host, and the request goes there with the headers this proxy adds`
      );
    }
    return calls.length;
  }
}
