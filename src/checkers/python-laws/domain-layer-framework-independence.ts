/**
 * Domain Layer Framework Independence (Clean Architecture)
 * The domain layer is the core of the application and must not depend on web
 * frameworks, ORMs, HTTP clients, cloud SDKs, or other infrastructure. A file
 * under a `domain/` package that imports such a framework leaks infrastructure
 * into the core — the equivalent of putting HTTP/store concerns in an NgRx
 * reducer. Dependencies must point inward (interface → application → domain).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonLawBase } from './python-law-base';

export class DomainLayerFrameworkIndependenceLaw extends PythonLawBase {
  private static readonly LAW_NAME = 'Domain Layer Framework Independence';
  // Infrastructure / framework packages that must not appear in the domain.
  private static readonly FORBIDDEN =
    /^\s*(?:from|import)\s+(fastapi|starlette|flask|django|sqlalchemy|sqlmodel|alembic|requests|httpx|aiohttp|redis|aioredis|boto3|pymongo|psycopg2?|asyncpg|google\.cloud|firebase_admin|kafka|celery)\b/;

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

    const domainFiles = this.getPythonFiles(projectRoot, context.config).filter(f =>
      /(^|\/)domain(\/|$)/.test(f.replace(/\\/g, '/').toLowerCase())
    );

    for (const file of domainFiles) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const content = this.stripPython(raw);
      const rel = PathOperations.getRelative(projectRoot, file);
      for (const line of content.split('\n')) {
        const m = line.match(this.FORBIDDEN);
        if (m) {
          violations.push(
            `${rel}: domain layer imports infrastructure/framework "${m[1]}" — keep the domain framework-independent (move it to the infrastructure layer behind an interface)`
          );
          break; // one finding per file is enough
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'PYTHON_LAW',
      [
        'Keep the domain layer pure: no web framework, ORM, HTTP client or cloud SDK imports',
        'Depend on abstractions (Protocol/ABC ports); implement them in the infrastructure layer',
      ],
      context
    );
  }
}
