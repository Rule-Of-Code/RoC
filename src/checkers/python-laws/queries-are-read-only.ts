/**
 * Queries Are Read-Only (CQRS)
 * In CQRS the read side never writes: a query (or query handler) must not persist
 * changes. A query that calls save/delete/insert/commit/flush mixes the write
 * concern into the read path — the equivalent of mutating state inside an NgRx
 * selector. Writes belong in command handlers.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class QueriesAreReadOnlyLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Queries Are Read-Only';
  private static readonly QUERY_FILE =
    /(^|[\\/])(queries|.*_quer(y|ies)|.*query_handlers?)\.py$/i;
  // Persistence writes (DB/repo-specific verbs + SQL DML). Deliberately excludes
  // generic dict/list verbs (update/add/remove) to stay low false-positive.
  private static readonly MUTATION =
    /\.(save|delete|insert|commit|flush|bulk_save|bulk_create|add_all)\s*\(|\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/i;

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
      if (!raw) continue;
      const content = this.stripPython(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      const isQueryFile = this.QUERY_FILE.test(file.replace(/\\/g, '/'));
      const scopes = this.queryScopes(content, rel, isQueryFile);

      const seen = new Set<string>();
      for (const scope of scopes) {
        if (this.MUTATION.test(scope.text) && !seen.has(scope.label)) {
          seen.add(scope.label);
          violations.push(
            `${scope.label}: the query path performs a persistence write — queries must be read-only (move writes to a command handler)`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Keep query handlers read-only; perform writes in command handlers',
        'Split read and write models (CQRS) so the query side cannot mutate state',
      ],
      context
    );
  }

  /**
   * Scope = the whole file if it is a query module, plus any class whose name
   * contains "Query" (e.g. GetOrders Query / OrderQueryHandler).
   */
  private static queryScopes(
    content: string,
    rel: string,
    isQueryFile: boolean
  ): { label: string; text: string; line: number }[] {
    const scopes: { label: string; text: string; line: number }[] = [];
    if (isQueryFile) {
      // Whole-file scope already covers any Query class inside it.
      scopes.push({ label: rel, text: content, line: 1 });
    } else {
      for (const b of this.pythonClassBlocks(content)) {
        if (/query/i.test(b.name)) {
          scopes.push({ label: `${rel} (class ${b.name})`, text: b.body, line: b.line });
        }
      }
    }
    return scopes;
  }
}
