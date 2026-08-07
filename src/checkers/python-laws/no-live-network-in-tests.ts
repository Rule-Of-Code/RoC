/**
 * No Live Network In Tests
 * Unit tests must be hermetic: a real HTTP/socket call makes them slow, flaky and
 * dependent on the outside world. Mock the client (responses/respx/httpx
 * MockTransport) or use a fake. Integration/e2e suites, which exist precisely to
 * hit real services, are exempt.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoLiveNetworkInTestsLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Live Network In Tests';
  private static readonly NETWORK =
    /\b(requests|httpx)\.(get|post|put|patch|delete|head|request)\s*\(|\burllib\.request\.urlopen\s*\(|\bsocket\.socket\s*\(|\bhttpx\.Client\s*\(/;
  private static readonly INTEGRATION = /(integration|e2e|end_to_end|functional)/i;

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
      if (!this.isTestFile(file)) continue;
      const normalized = file.replace(/\\/g, '/');
      if (this.INTEGRATION.test(normalized)) continue; // integration/e2e may hit the network
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);

      for (let i = 0; i < lines.length; i++) {
        const m = (lines[i] ?? '').match(this.NETWORK);
        if (m) {
          violations.push(
            `${rel}:${i + 1}: live network call in a test (${(m[1] ?? m[0]).trim()}) — mock the client (responses/respx) or use a fake; keep unit tests hermetic`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Mock HTTP with responses (requests) or respx / MockTransport (httpx)',
        'Move tests that must hit real services into an integration/e2e suite',
      ],
      context
    );
  }
}
