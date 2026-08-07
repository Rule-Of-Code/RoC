/**
 * OnPush Change Detection Law
 * Ensures proper usage of OnPush change detection strategy
 */

import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { AngularComponentFiles } from '../../utils/angular-component-files';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';
export class OnPushChangeDetectionLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const componentFiles = this.getComponentFiles(
      context.projectRoot,
      context.config
    );

    if (componentFiles.length === 0) {
      violations.push('No Angular components found');
      suggestions.push('Ensure Angular components (@Component) exist in the app');
      return AngularLawBase.createResult(
        violations,
        'OnPush Change Detection',
        'ANGULAR',
        suggestions,
        context
      );
    }

    let totalComponents = 0;
    let onPushComponents = 0;
    const componentsNeedingOnPush: string[] = [];

    for (const componentFile of componentFiles) {
      try {
        const content = FileUtils.readFile(componentFile);
        const componentName = PathOperations.getBasename(componentFile);

        totalComponents++;

        // Check for OnPush strategy
        if (content.includes('ChangeDetectionStrategy.OnPush')) {
          onPushComponents++;
        } else {
          // Check if component should use OnPush
          if (this.shouldUseOnPush(content)) {
            componentsNeedingOnPush.push(componentName);
          }
        }
      } catch (_error) {
        continue;
      }
    }

    // Report all components that should use OnPush
    if (componentsNeedingOnPush.length > 0) {
      const onPushPercentage =
        totalComponents > 0 ? (onPushComponents / totalComponents) * 100 : 0;
      violations.push(
        `OnPush usage: ${onPushPercentage.toFixed(1)}% (${onPushComponents}/${totalComponents} components)`
      );
      suggestions.push('Increase OnPush usage to improve performance');
    }

    if (componentsNeedingOnPush.length > 0) {
      violations.push(
        `Components that should use OnPush: ${componentsNeedingOnPush
          .slice(0, 5)
          .join(', ')}`
      );
      suggestions.push(
        'Add ChangeDetectionStrategy.OnPush to presentational components'
      );
    }

    return AngularLawBase.createResult(
      violations,
      'OnPush Change Detection',
      'ANGULAR',
      suggestions,
      context
    );
  }

  private static getComponentFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    // By @Component decorator, not the *.component.ts filename (Angular 20 short
    // names). Shared so every component-discovery law agrees.
    return AngularComponentFiles.find(projectRoot, _config);
  }

  private static shouldUseOnPush(componentContent: string): boolean {
    // Components with @Input should use OnPush
    const hasInputs = componentContent.includes('@Input()');

    // Presentational components (no complex logic)
    const isPresentational =
      !componentContent.includes('ngOnInit') &&
      !componentContent.includes('constructor(private') &&
      !componentContent.includes('subscribe(');

    // Components using async pipe should use OnPush
    const usesAsyncPipe = componentContent.includes('async');

    return hasInputs || isPresentational || usesAsyncPipe;
  }
}
