/**
 * NgRx Store Pattern Law
 * Enforces proper NgRx store architecture patterns
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from './shared-imports';
import {
  AngularLawBase,
  CheckerUtils,
  ConfigHelper,
  FileUtils,
  PathOperations,
} from './shared-imports';

export class NgrxStorePatternLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Only check if NgRx is used
    const earlyReturn = this.createAngularRequiredResult(
      'NgRx Store Pattern',
      projectRoot,
      root => this.hasNgrxStore(root),
      context
    );
    if (earlyReturn) return earlyReturn;

    // Find store-related files
    const config = ConfigHelper.getConfigFromContext(context);
    const storeFiles = this.findStoreFiles(projectRoot, config);

    // Check for proper state interface
    for (const file of storeFiles) {
      const content = FileUtils.readFile(file);

      this.checkStateFile(file, content, violations);
      this.checkActionsFile(file, content, violations);
      this.checkReducerFile(file, content, violations);
      this.checkSelectorsFile(file, content, violations);
    }

    return this.createResult(
      violations,
      'NgRx Store Pattern',
      'ANGULAR_LAW',
      [
        'Use createAction for all actions',
        'Use createReducer with on() pattern',
        'Use createSelector for all selectors',
        'Define proper state interfaces',
      ],
      context
    );
  }

  private static checkStateFile(
    file: string,
    content: string,
    violations: string[]
  ): void {
    if (file.includes('.state.ts')) {
      if (!content.includes('interface') && !content.includes('type ')) {
        violations.push(
          `State file ${PathOperations.getBasename(
            file
          )} missing proper interface definition`
        );
      }
    }
  }

  private static checkActionsFile(
    file: string,
    content: string,
    violations: string[]
  ): void {
    // Check for proper action creators
    if (file.includes('.actions.ts')) {
      if (!content.includes('createAction') && !content.includes('props')) {
        violations.push(
          `Action file ${PathOperations.getBasename(file)} not using createAction pattern`
        );
      }
    }
  }

  private static checkReducerFile(
    file: string,
    content: string,
    violations: string[]
  ): void {
    // Check for proper reducer pattern
    if (file.includes('.reducer.ts')) {
      if (!content.includes('createReducer') && !content.includes('on(')) {
        violations.push(
          `Reducer file ${PathOperations.getBasename(
            file
          )} not using createReducer pattern`
        );
      }
    }
  }

  private static checkSelectorsFile(
    file: string,
    content: string,
    violations: string[]
  ): void {
    // Check for proper selector usage
    if (file.includes('.selectors.ts')) {
      if (
        !content.includes('createSelector') &&
        !content.includes('createFeatureSelector')
      ) {
        violations.push(
          `Selector file ${PathOperations.getBasename(
            file
          )} not using createSelector pattern`
        );
      }
    }
  }

  private static findStoreFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find store-related files with proper ignore handling
    const allTsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      _config
    );
    return allTsFiles.filter(
      (file: string) =>
        file.includes('.state.') ||
        file.includes('.actions.') ||
        file.includes('.reducer.') ||
        file.includes('.selectors.') ||
        file.includes('.effects.')
    );
  }
}
