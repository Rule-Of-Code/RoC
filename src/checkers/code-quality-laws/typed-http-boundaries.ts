/**
 * Typed HTTP Boundaries Law
 * Requires a response-type generic on HttpClient calls (`http.get<T>(...)`).
 * Without it the response is `Object`/`any` deep in the app — an untyped seam at
 * the most error-prone boundary. (A generic is compile-time trust, not runtime
 * validation; schema validation at the boundary is the next maturity step.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CodeQualityLawBase } from './code-quality-law-base';
import { readSource } from './source-view';

export class TypedHttpBoundariesLaw extends CodeQualityLawBase {
  // Receiver whose identifier contains "http" (this.http, httpClient, _http, …)
  // calling an HttpClient verb WITHOUT a generic. A typed call is `.get<T>(` —
  // there the `<` sits between the method and `(`, so `(verb)\s*\(` cannot match.
  private static readonly UNTYPED_HTTP =
    /\b[\w$]*[Hh]ttp[\w$]*\s*\.\s*(get|post|put|patch|delete|request)\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = this.findTypeScriptFiles(projectRoot, context);
    // Read from the parse (#424): `http.get(` in a law's prose or a message
    // is not a call. Without the parser the files are not read — said so.
    const ts = loadTypeScript(projectRoot);
    if (!ts && files.length > 0) {
      return markJudgedNothing(
        this.createResult(
          [
            `${parserUnavailable(projectRoot, `the ${files.length} .ts file(s)`)} — Typed HTTP Boundaries judged nothing`,
          ],
          'Typed HTTP Boundaries',
          'CODE_QUALITY_LAW',
          [],
          context
        )
      );
    }
    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content || !ts) continue;

      const { code } = readSource(ts, content, file);
      const matches = code.match(this.UNTYPED_HTTP);
      if (matches && matches.length > 0) {
        const relativePath = PathOperations.getRelative(projectRoot, file);
        violations.push(
          `Untyped HttpClient call(s) in ${relativePath}: ${matches.length} — add a response-type generic (e.g. http.get<ResponseType>(...)).`
        );
      }
    }

    return this.createResult(
      violations,
      'Typed HTTP Boundaries',
      'CODE_QUALITY_LAW',
      [
        'Add a response-type generic to every HttpClient call',
        'Consider schema validation at the boundary for runtime safety',
      ],
      context
    );
  }
}
