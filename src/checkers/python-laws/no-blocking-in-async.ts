/**
 * No Blocking Calls In Async Functions
 * A synchronous blocking call inside `async def` stalls the entire event loop —
 * in any async app (FastAPI, aiohttp, plain asyncio) that means every concurrent
 * task waits. Use the async equivalent: `await asyncio.sleep(...)` instead of
 * `time.sleep(...)`, and an async HTTP client (httpx.AsyncClient / aiohttp)
 * instead of `requests`. This is a general async-Python correctness rule, so it
 * gates on the project being Python (not specifically FastAPI).
 *
 * Detection extracts each `async def` body by indentation so a blocking call in
 * a sibling sync function does not cause a false positive.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoBlockingInAsyncLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Blocking Calls In Async';
  private static readonly BLOCKING =
    /\b(time\.sleep|requests\.(?:get|post|put|patch|delete|head|request)|urllib\.request\.urlopen)\s*\(/;

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
      if (!raw || !raw.includes('async def')) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectAsyncDefViolations(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Replace time.sleep() with await asyncio.sleep() in async code',
        'Replace requests with an async client (httpx.AsyncClient / aiohttp), or run blocking work via run_in_executor',
      ],
      context
    );
  }

  /** Flags every blocking call inside each `async def` body in the file. */
  private static collectAsyncDefViolations(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      const header = lines[i] ?? '';
      const m = header.match(/^(\s*)async\s+def\s+(\w+)/);
      if (!m) continue;
      const indent = (m[1] ?? '').length;
      this.scanAsyncBody(lines, i, indent, m[2], rel, violations);
    }
  }

  /** Body = following lines indented deeper than the header. */
  private static scanAsyncBody(
    lines: string[],
    headerIdx: number,
    indent: number,
    fnName: string | undefined,
    rel: string,
    violations: string[]
  ): void {
    for (let j = headerIdx + 1; j < lines.length; j++) {
      const line = lines[j] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= indent) break; // dedent → end of this async def
      const b = line.match(this.BLOCKING);
      if (b) {
        violations.push(
          `${rel}:${j + 1}: blocking call "${b[1]}(" inside async def ${fnName}() — use the async equivalent (asyncio.sleep / httpx.AsyncClient) so the event loop is not blocked`
        );
      }
    }
  }
}
