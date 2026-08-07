/**
 * No Web Framework Outside The Interface Layer
 * The web framework (FastAPI/Starlette/Flask/...) is a delivery-mechanism detail
 * and belongs only in the interface layer. The application and infrastructure
 * layers must stay transport-agnostic: a use case or repository that imports the
 * web framework cannot be reused or tested outside HTTP. (The domain layer is
 * covered by Domain Layer Framework Independence.)
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class NoWebFrameworkOutsideInterfaceLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'No Web Framework Outside Interface';
  private static readonly WEB_FRAMEWORK =
    /^\s*(?:from|import)\s+(fastapi|starlette|flask|quart|sanic|django\.http|rest_framework)\b/;

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
      const layer = this.layerOfPath(file);
      // domain is owned by Domain Layer Framework Independence; interface is the
      // correct home for the web framework.
      if (layer !== 'application' && layer !== 'infrastructure') continue;

      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const rel = PathOperations.getRelative(projectRoot, file);

      for (const line of this.stripPython(raw).split('\n')) {
        const m = line.match(this.WEB_FRAMEWORK);
        if (m) {
          violations.push(
            `${rel}: ${layer} layer imports the web framework "${m[1]}" — keep web concerns in the interface layer (this layer must stay transport-agnostic)`
          );
          break;
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Move HTTP/web-framework code to the interface layer',
        'Pass plain data (Pydantic/domain objects) into application/infrastructure, not Request/Response',
      ],
      context
    );
  }
}
