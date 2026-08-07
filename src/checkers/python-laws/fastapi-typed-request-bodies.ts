/**
 * FastAPI Typed Request Bodies
 * Write endpoints (POST/PUT/PATCH) should accept a Pydantic model for the body,
 * not read the raw request (`await request.json()`) or take an untyped `dict`.
 * A typed body gives validation, parsing and an explicit contract — the request
 * counterpart of FastAPI Typed Responses (and of Angular typed DTOs).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class FastApiTypedRequestBodiesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'FastAPI Typed Request Bodies';
  private static readonly WRITE_ROUTE =
    /^\s*@[\w.]+\.(?:post|put|patch)\s*\(/;
  private static readonly DEF = /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(/;
  private static readonly RAW_JSON = /\brequest\.json\s*\(/;
  // An untyped dict body parameter, e.g. `payload: dict`, `body: dict[str, Any]`.
  private static readonly DICT_PARAM = /\b\w+\s*:\s*dict\b/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const early = this.createPythonRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasFastApi(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of this.getPythonFiles(projectRoot, context.config)) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw || !this.isApiLayerFile(file)) continue;
      const lines = this.stripPython(raw).split('\n');
      const rel = PathOperations.getRelative(projectRoot, file);
      this.collectWriteRouteViolations(lines, rel, violations);
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Declare the body as a Pydantic model: async def create(item: ItemIn) -> ...',
        'Avoid request.json() and untyped dict bodies in write endpoints',
      ],
      context
    );
  }

  /** Flags every write endpoint in the file with an untyped dict body or a raw request.json() read. */
  private static collectWriteRouteViolations(
    lines: string[],
    rel: string,
    violations: string[]
  ): void {
    for (let i = 0; i < lines.length; i++) {
      if (!this.WRITE_ROUTE.test(lines[i] ?? '')) continue;
      let d = i + 1;
      while (d < lines.length && !this.DEF.test(lines[d] ?? '')) d++;
      const defMatch = (lines[d] ?? '').match(this.DEF);
      if (!defMatch) continue;
      const indent = (defMatch[1] ?? '').length;
      const fn = defMatch[2];

      const { sig, sigEnd } = this.readSignature(lines, d);
      if (this.DICT_PARAM.test(sig)) {
        violations.push(
          `${rel}:${d + 1}: ${fn}() takes an untyped dict body — accept a Pydantic model for validation and a typed contract`
        );
      } else {
        this.checkBodyForRawJson(lines, sigEnd, indent, fn, rel, violations);
      }
      i = d;
    }
  }

  /** Signature may span lines until the closing "):". */
  private static readSignature(
    lines: string[],
    defLine: number
  ): { sig: string; sigEnd: number } {
    let sig = '';
    let sigEnd = defLine;
    for (let k = defLine; k < lines.length; k++) {
      sig += lines[k];
      sigEnd = k;
      if (/\)\s*(->.*)?:\s*$/.test(lines[k] ?? '')) break;
    }
    return { sig, sigEnd };
  }

  /** Scans the handler body (lines indented deeper than the def) for request.json(). */
  private static checkBodyForRawJson(
    lines: string[],
    sigEnd: number,
    indent: number,
    fn: string | undefined,
    rel: string,
    violations: string[]
  ): void {
    for (let j = sigEnd + 1; j < lines.length; j++) {
      const line = lines[j] ?? '';
      if (line.trim() === '') continue;
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= indent) break;
      if (this.RAW_JSON.test(line)) {
        violations.push(
          `${rel}:${j + 1}: ${fn}() reads the raw request body (request.json()) — use a Pydantic model parameter instead`
        );
        break;
      }
    }
  }
}
