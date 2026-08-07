/**
 * No Double Cast Law
 * Forbids `as unknown as T` double casts — they launder the type and silently
 * defeat type checking (a drifted shape passes unnoticed). Model the real type or
 * validate at the boundary instead.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class NoDoubleCastLaw extends CodeQualityLawBase {
  private static readonly DOUBLE_CAST = /\bas\s+unknown\s+as\b/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = this.findTypeScriptFiles(projectRoot, context);
    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;

      // Strip comments so a double-cast mentioned in a comment is not flagged.
      const code = this.stripComments(content);
      const matches = code.match(this.DOUBLE_CAST);
      if (matches && matches.length > 0) {
        const relativePath = PathOperations.getRelative(projectRoot, file);
        violations.push(
          `Double cast (as unknown as) in ${relativePath}: ${matches.length} occurrence(s) — launders the type and defeats checking. Model the real type or validate at the boundary.`
        );
      }
    }

    return this.createResult(
      violations,
      'No Double Cast',
      'CODE_QUALITY_LAW',
      [
        'Replace `as unknown as T` with a correctly modelled type',
        'Validate untrusted data at the boundary instead of casting',
      ],
      context
    );
  }
}
