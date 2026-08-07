/**
 * Async Tests Are Marked
 * An `async def test_*` that is not awaited by pytest never actually runs — pytest
 * collects the coroutine, never awaits it, and reports the test as passed. So an
 * async test must carry @pytest.mark.asyncio (or @pytest.mark.anyio), unless the
 * project enables automatic async mode (asyncio_mode/anyio_mode = auto). Without
 * one of those, the test is a silent false pass.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class AsyncTestsAreMarkedLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Async Tests Are Marked';
  private static readonly ASYNC_TEST = /^(\s*)async\s+def\s+(test_\w+)\s*\(/;
  private static readonly ASYNC_MARKER = /@pytest\.mark\.(asyncio|anyio)\b/;
  /** A module-level `pytestmark = pytest.mark.asyncio` (or a list containing it). */
  private static readonly MODULE_MARK =
    /^pytestmark\s*=\s*[^\n]*mark\.(asyncio|anyio)\b/m;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasPythonProject(root),
      context
    );
    if (early) return early;

    // Auto async mode → no per-test marker required.
    if (this.pytestAutoAsyncio(projectRoot)) {
      return this.createResult([], this.LAW_NAME, 'PYTHON_LAW', [], context);
    }

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      if (!this.isTestFile(file)) continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || !raw.includes('async def test')) continue;
      const stripped = this.stripPython(raw);
      // A module-level `pytestmark = pytest.mark.asyncio` marks EVERY test in the
      // file — a very common form this law used to false-fail.
      if (this.MODULE_MARK.test(stripped)) continue;
      const lines = stripped.split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectUnmarkedAsyncTests(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add @pytest.mark.asyncio (pytest-asyncio) or @pytest.mark.anyio to async tests',
        'Or set asyncio_mode = "auto" in pyproject/pytest config',
      ],
      context
    );
  }

  /** Flags every async test in the file that carries no async marker. */
  private static collectUnmarkedAsyncTests(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const m = (lines[i] ?? '').match(this.ASYNC_TEST);
      if (!m) continue;
      const indent = (m[1] ?? '').length;
      if (
        !this.hasAsyncMarkerAbove(lines, i) &&
        !this.enclosingClassIsMarked(lines, i, indent)
      ) {
        violations.push(
          `${rel}:${i + 1}: async test ${m[2]} has no @pytest.mark.asyncio/anyio (and asyncio_mode is not auto) — it will be collected but never awaited (silent pass)`
        );
      }
    }
  }

  /**
   * Is the test inside a class that carries an async marker? A class-level
   * `@pytest.mark.asyncio` above `class ...:` marks all of its test methods.
   */
  private static enclosingClassIsMarked(
    lines: string[],
    testLine: number,
    testIndent: number
  ): boolean {
    if (testIndent === 0) return false;
    for (let k = testLine - 1; k >= 0; k--) {
      const line = lines[k] ?? '';
      if (line.trim() === '') continue;
      const classMatch = line.match(/^(\s*)class\s+\w+/);
      if (classMatch && (classMatch[1] ?? '').length < testIndent) {
        return this.hasAsyncMarkerAbove(lines, k);
      }
    }
    return false;
  }

  /** Scan decorator lines directly above for an async marker. */
  private static hasAsyncMarkerAbove(lines: string[], testLine: number): boolean {
    for (let k = testLine - 1; k >= 0; k--) {
      const prev = (lines[k] ?? '').trim();
      if (prev === '') continue;
      if (prev.startsWith('@')) {
        if (this.ASYNC_MARKER.test(prev)) return true;
        continue;
      }
      break;
    }
    return false;
  }
}
