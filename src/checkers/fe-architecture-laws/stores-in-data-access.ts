/**
 * ROC-FE-03 — State stores live in `data-access`, not in `feature`
 * State leaking up into the feature/container layer was the root of several
 * architecture-audit findings. A `*.store.ts` (or a `signalStore()` /
 * `createFeature()` / `createReducer()`) under a `feature*` directory belongs in
 * the sibling `data-access` layer instead. Pure path/content detection.
 */

import { CheckerUtils } from '../../utils/checker-utils';
import { CodeText } from '../../utils/code-text';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

export class StoresInDataAccessLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Stores In Data Access';
  private static readonly FEATURE_SEG = /\/feature[^/]*\//;
  private static readonly STATE_CALL = /\b(signalStore|createFeature|createReducer)\s*\(/;

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
      const norm = file.replace(/\\/g, '/');
      if (!this.FEATURE_SEG.test(norm)) continue; // only the feature layer
      // Flag a file that actually DEFINES a store — a real signalStore/
      // createFeature/createReducer call in CODE (comments and strings stripped).
      // The old check flagged any `*.store.ts` by NAME regardless of contents (a
      // re-export barrel or an empty stub is not a store), and matched the call
      // in a comment/string. Detection is now by content, so the filename no
      // longer matters.
      const code = CodeText.stripCommentsAndStrings(
        FileUtils.readFile(file) ?? ''
      );
      if (this.STATE_CALL.test(code)) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: state store in the feature layer — move it to the sibling data-access layer`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'ANGULAR_LAW',
      [
        'Move *.store.ts (signalStore/createFeature) into libs/**/data-access',
        'Feature/container components should consume state, not own it',
      ],
      context
    );
  }
}
