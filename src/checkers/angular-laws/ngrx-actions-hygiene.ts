/**
 * NgRx Actions Hygiene Law
 * Ensures actions follow proper naming and structure patterns
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';
export class NgrxActionsHygieneLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Only check if NgRx is used
    if (!AngularLawBase.hasNgrxStore(projectRoot)) {
      return AngularLawBase.createResult(
        [],
        'NgRx Actions Hygiene',
        'ANGULAR_LAW',
        [],
        context
      );
    }

    // Find action files
    const actionFiles = NgrxActionsHygieneLaw.findActionFiles(
      projectRoot,
      context.config
    );

    for (const file of actionFiles) {
      const content = FileUtils.readFile(file);
      const fileName = PathOperations.getBasename(file);

      NgrxActionsHygieneLaw.checkActionNaming(content, fileName, violations);
      NgrxActionsHygieneLaw.checkActionTypes(content, fileName, violations);
      NgrxActionsHygieneLaw.checkPropsUsage(content, fileName, violations);
      NgrxActionsHygieneLaw.checkConstantsExport(content, fileName, violations);
    }

    return AngularLawBase.createResult(
      violations,
      'NgRx Actions Hygiene',
      'ANGULAR_LAW',
      [
        'Use camelCase for action names',
        'Include feature name in action type brackets',
        'Use props<T>() for actions with payload',
        'Export actions as constants',
      ],
      context
    );
  }

  private static checkActionNaming(
    content: string,
    fileName: string,
    violations: string[]
  ): void {
    // Check action naming convention
    const actionMatches = content.match(/export const (\w+) = createAction/g);
    if (actionMatches) {
      for (const match of actionMatches) {
        const actionName = match
          .replace('export const ', '')
          .replace(' = createAction', '');

        // Actions should use camelCase
        if (!/^[a-z][a-zA-Z0-9]*$/.test(actionName)) {
          violations.push(
            `Action ${actionName} in ${fileName} should use camelCase`
          );
        }
      }
    }
  }

  private static checkActionTypes(
    content: string,
    fileName: string,
    violations: string[]
  ): void {
    // Check for proper action types (should include feature name)
    const actionTypeMatches = content.match(/'(\[.*?\]).*?'/g);
    if (actionTypeMatches) {
      for (const match of actionTypeMatches) {
        const actionType = match.replace(/'/g, '');

        if (!actionType.includes('[') || !actionType.includes(']')) {
          violations.push(
            `Action type "${actionType}" in ${fileName} should include feature name in brackets`
          );
        }
      }
    }
  }

  private static checkPropsUsage(
    content: string,
    fileName: string,
    violations: string[]
  ): void {
    // Check for props usage in actions with data
    if (content.includes('createAction') && content.includes('payload')) {
      if (!content.includes('props<')) {
        violations.push(
          `Actions with payload in ${fileName} should use props<T>() pattern`
        );
      }
    }
  }

  private static checkConstantsExport(
    content: string,
    fileName: string,
    violations: string[]
  ): void {
    // Check for action constants export
    if (
      !content.includes('export const') &&
      content.includes('createAction')
    ) {
      violations.push(`Actions in ${fileName} should be exported as constants`);
    }
  }

  public static findActionFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find action files with proper ignore handling
    const allTsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    return allTsFiles.filter((file: string) => file.includes('.actions.ts'));
  }
}
