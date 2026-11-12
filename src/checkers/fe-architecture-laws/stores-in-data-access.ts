/**
 * ROC-FE-03 — State stores live in `data-access`, not in `feature`
 * State leaking up into the feature/container layer was the root of several
 * architecture-audit findings. A store DEFINED under the feature layer belongs
 * in the sibling data-access layer instead.
 *
 * A store is recognised by what defines it, not by the file name: an NgRx
 * `signalStore()` / `createFeature()` / `createReducer()` call in code
 * (comments and strings stripped), or a call to Redux Toolkit's `createSlice`
 * or zustand's `create`, resolved through the file's imports — `create(` alone
 * is far too common a name to mean a store.
 */

import { CodeText } from '../../utils/code-text';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject } from '../../utils/react/react-project';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FeArchLawBase } from './fe-arch-law-base';

/** Library store factories, resolved through the file's imports. */
const LIBRARY_STORES: Array<{ module: string; imported: string; label: string }> = [
  { module: '@reduxjs/toolkit', imported: 'createSlice', label: 'createSlice (Redux Toolkit)' },
  { module: 'zustand', imported: 'create', label: 'create (zustand)' },
];

export class StoresInDataAccessLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'Stores In Data Access';
  private static readonly STATE_CALL = /\b(signalStore|createFeature|createReducer)\s*\(/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const featureFiles = this.sourceFiles(context).filter(file =>
      this.inLayer(context, file, 'feature')
    );
    const violations: string[] =
      featureFiles.length === 0 ? [this.emptyLayer(context, ['feature'])] : [];
    const libraryCandidates: string[] = [];

    for (const file of featureFiles) {
      const raw = FileUtils.readFile(file) ?? '';
      if (this.STATE_CALL.test(CodeText.stripCommentsAndStrings(raw))) {
        violations.push(this.misplaced(projectRoot, file, null, 'state store'));
      } else if (LIBRARY_STORES.some(store => raw.includes(store.module))) {
        libraryCandidates.push(file);
      }
    }

    const { sources, unread } = ReactProject.parse(context, libraryCandidates);
    violations.push(...unread);
    for (const source of sources) {
      for (const store of LIBRARY_STORES) {
        const [line] = this.importedCallLines(source, store.module, store.imported);
        if (line !== undefined) {
          violations.push(this.misplaced(projectRoot, source.fileName, line, store.label));
          break;
        }
      }
    }

    return this.layerResult(
      this.createResult(
        violations,
        this.LAW_NAME,
        'FE_ARCHITECTURE',
        [
          'Move the store definition into the data-access layer (thresholds.frontend.dataAccessLayers)',
          'Feature/container components should consume state, not own it',
        ],
        context
      ),
      featureFiles.length === 0
    );
  }

  private static misplaced(
    projectRoot: string,
    file: string,
    line: number | null,
    what: string
  ): string {
    const where = PathOperations.getRelative(projectRoot, file) + (line ? `:${line}` : '');
    return `${where}: ${what} defined in the feature layer — move it to the data-access layer`;
  }
}
