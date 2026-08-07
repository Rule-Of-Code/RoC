/**
 * Typed HTTP Boundaries Law
 * Requires a response-type generic on HttpClient calls (`http.get<T>(...)`).
 * Without it the response is `Object`/`any` deep in the app — an untyped seam at
 * the most error-prone boundary. (A generic is compile-time trust, not runtime
 * validation; schema validation at the boundary is the next maturity step.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

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
    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;

      const code = this.stripComments(content);
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
