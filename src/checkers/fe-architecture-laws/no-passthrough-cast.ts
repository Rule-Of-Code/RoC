/**
 * ROC-FE-07 — No passthrough DTO→model cast in data-access
 * A validating boundary is mandatory: `http.get<DomainModel>()` skips the runtime
 * conversion and hides shape drift. The HttpClient generic should be a `Raw*`
 * envelope (or `unknown`), with the conversion done in a `.pipe(map(...))`. A
 * generic that is a domain model is flagged.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { FeArchLawBase } from './fe-arch-law-base';

export class NoPassthroughCastLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'No Passthrough Cast';
  private static readonly HTTP_GENERIC =
    /\.(get|post|put|patch|delete)\s*<\s*([A-Za-z_]\w*)\s*(?:\[\])?\s*>\s*\(/g;
  // Generics that are legitimately not a Raw envelope.
  private static readonly SAFE = new Set([
    'unknown',
    'any',
    'void',
    'object',
    'Blob',
    'ArrayBuffer',
    'string',
    'number',
    'boolean',
    'HttpEvent',
    'HttpResponse',
    'Response',
  ]);

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const early = this.createAngularRequiredResult(
      this.LAW_NAME,
      projectRoot,
      root => this.hasAngularProject(root),
      context
    );
    if (early) return early;

    const violations: string[] = [];

    for (const file of CheckerUtils.findTypeScriptFiles(projectRoot, config)) {
      if (!/\/data-access\//.test(file.replace(/\\/g, '/'))) continue;
      const content = FileUtils.readFile(file);
      if (!content || !content.includes('.get<')) {
        if (!content || !/\.(post|put|patch|delete)\s*</.test(content)) continue;
      }
      const rel = PathOperations.getRelative(projectRoot, file);

      this.HTTP_GENERIC.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = this.HTTP_GENERIC.exec(content)) !== null) {
        const generic = m[2] ?? '';
        if (this.SAFE.has(generic) || /Raw/.test(generic)) continue;
        const line = content.slice(0, m.index).split('\n').length;
        violations.push(
          `${rel}:${line}: http.${m[1]}<${generic}> casts the response straight to a domain model — use a Raw*/unknown generic and convert in .pipe(map(...))`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Type the HTTP call as Raw*/unknown; map to the domain model in a mapper',
        'Do not cast (as DomainModel) an HTTP result — validate at the boundary',
      ],
      context
    );
  }
}
