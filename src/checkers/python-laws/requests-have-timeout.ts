/**
 * Requests Have A Timeout
 * requests has no default timeout: a call with none can block the worker forever
 * if the peer stalls, exhausting the pool and taking the service down. Always pass
 * timeout=. (urllib.request.urlopen has the same trap.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class RequestsHaveTimeoutLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Requests Have Timeout';
  private static readonly REQUEST =
    /\brequests\.(get|post|put|patch|delete|head|options|request)\s*\(|\burllib\.request\.urlopen\s*\(/g;

  private static lineOf(content: string, index: number): number {
    return content.slice(0, index).split('\n').length;
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || (!raw.includes('requests.') && !raw.includes('urlopen')))
        continue;
      const content = this.stripPython(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectCallsWithoutTimeout(content, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Pass a timeout: requests.get(url, timeout=5)',
        'Set a sensible connect/read timeout for every outbound call',
      ],
      context
    );
  }

  /** Flag each outbound call with no timeout, or with the never-expiring timeout=None. */
  private static collectCallsWithoutTimeout(
    content: string,
    rel: string,
    violations: string[]
  ): void {
    let m: RegExpExecArray | null;
    this.REQUEST.lastIndex = 0;
    while ((m = this.REQUEST.exec(content)) !== null) {
      const args = this.readBalancedParens(content, this.REQUEST.lastIndex - 1);
      if (args === null) continue;
      // timeout=None is the SAME as no timeout — it blocks forever. A present
      // token used to satisfy the check; the disabling value must not.
      const isNone = /\btimeout\s*=\s*None\b/.test(args);
      const hasRealTimeout = /\btimeout\s*=/.test(args) && !isNone;
      if (hasRealTimeout) continue;
      const call = m[1] ? `requests.${m[1]}` : 'urlopen';
      const why = isNone ? 'has timeout=None, which never times out' : 'has no timeout=';
      violations.push(
        `${rel}:${this.lineOf(content, m.index)}: ${call}() ${why} — it can hang forever and exhaust the worker pool; pass an explicit timeout`
      );
    }
  }
}
