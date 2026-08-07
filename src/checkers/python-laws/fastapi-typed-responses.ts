/**
 * FastAPI Typed Response Models
 * A FastAPI route that returns data should declare an explicit `response_model`
 * (a Pydantic model) — the backend equivalent of Angular's typed DTOs. It gives
 * a validated, documented, serialization-bounded contract instead of leaking raw
 * dicts/ORM objects. Routes returning a custom `response_class` (streaming/file)
 * or a 204 No-Content are exempt; DELETE routes are not checked.
 *
 * Gates on FastAPI being present (like Angular laws gate on isAngularProject).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class FastApiTypedResponsesLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'FastAPI Typed Responses';
  // @app.get( / @router.post( ... — capture verb and the opening paren index.
  private static readonly ROUTE = /@[\w.]+\.(get|post|put|patch)\s*\(/g;

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
      if (!raw) continue;
      const content = this.stripPython(raw);
      const rel = PathOperations.getRelative(projectRoot, file);

      let m: RegExpExecArray | null;
      const re = new RegExp(this.ROUTE);
      while ((m = re.exec(content)) !== null) {
        const verb = m[1];
        const args = this.readBalancedParens(content, re.lastIndex - 1);
        if (args === null) continue;
        if (
          !/\bresponse_model\s*=/.test(args) &&
          !/\bresponse_class\s*=/.test(args) &&
          !/status_code\s*=\s*[^,)]*\b204\b/.test(args)
        ) {
          const line = content.slice(0, m.index).split('\n').length;
          violations.push(
            `${rel}:${line}: @${'{router}'}.${verb}() has no response_model — declare a Pydantic response_model for a typed, validated response contract`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Add response_model=YourPydanticModel to data-returning routes',
        'Use a custom response_class (Streaming/File) or status_code=204 only when there is no JSON body',
      ],
      context
    );
  }
}
