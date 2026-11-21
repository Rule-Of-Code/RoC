/**
 * No Double Cast Law
 * Forbids `as unknown as T` double casts — they launder the type and silently
 * defeat type checking (a drifted shape passes unnoticed). Model the real type or
 * validate at the boundary instead.
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

export class NoDoubleCastLaw extends CodeQualityLawBase {
  private static readonly DOUBLE_CAST = /\bas\s+unknown\s+as\b/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = this.findTypeScriptFiles(projectRoot, context);
    // Read from the parse (#424): `as unknown as` in a comment or a string
    // (a law's own prose) is not a cast. Without the parser the files are
    // not read — said so.
    const ts = loadTypeScript(projectRoot);
    if (!ts && files.length > 0) {
      return markJudgedNothing(
        this.createResult(
          [
            `${parserUnavailable(projectRoot, `the ${files.length} .ts file(s)`)} — No Double Cast judged nothing`,
          ],
          'No Double Cast',
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
