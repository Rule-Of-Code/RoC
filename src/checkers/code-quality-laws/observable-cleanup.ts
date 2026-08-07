/**
 * Observable Cleanup Requirements Law
 * Ensures proper RxJS observable cleanup in Angular applications
 */

import { AngularComponentFiles } from '../../utils/angular-component-files';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { CodeQualityLawBase } from './code-quality-law-base';

export class ObservableCleanupLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    try {
      // Find all TypeScript files that might contain observables
      const tsFiles = this.findTypeScriptFiles(projectRoot, context);

      for (const file of tsFiles) {
        const content = FileUtils.readFileContentSync(file);
        if (!content) continue;

        // Check if file has observable subscriptions but no cleanup
        if (
          this.hasObservableSubscriptions(content) &&
          !this.hasProperCleanupPattern(content)
        ) {
          const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
          violations.push(
            `Observable subscriptions without proper cleanup: ${relativePath}`
          );
        }

        // Check for direct subscription without proper cleanup pattern
        if (
          content.includes('.subscribe(') &&
          !this.hasProperCleanupPattern(content)
        ) {
          const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
          violations.push(
            `Direct subscription without unsubscribe pattern: ${relativePath}`
          );
        }

        // Check for component files without OnDestroy when having subscriptions
        // (unless using modern takeUntilDestroyed or other valid patterns)
        if (
          AngularComponentFiles.isComponentContent(file, content) &&
          this.hasObservableSubscriptions(content) &&
          !content.includes('OnDestroy') &&
          !this.hasProperCleanupPattern(content)
        ) {
          const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
          violations.push(
            `Component with subscriptions missing OnDestroy: ${relativePath}`
          );
        }
      }
    } catch (_error) {
      violations.push(`Error checking observable cleanup: ${_error}`);
    }

    return this.createResult(
      violations,
      'Observable Cleanup Requirements',
      'CODE_QUALITY',
      [
        'Implement OnDestroy interface',
        'Add takeUntil destroy pattern',
        'Create Observable cleanup utility',
        'Use async pipe in templates',
      ],
      context
    );
  }

  /**
   * Check if file has proper cleanup patterns
   * Supports modern Angular patterns: takeUntil, takeUntilDestroyed, unsubscribe, Subscription management
   */
  private static hasProperCleanupPattern(content: string): boolean {
    // NgRx Effects files - automatically managed by NgRx framework
    if (content.includes('createEffect') || content.includes('@ngrx/effects')) {
      return true;
    }

    // Observable creation pattern - not a subscription that needs cleanup
    if (content.includes('new Observable') && content.includes('subscriber')) {
      return true;
    }

    // Modern Angular 16+ pattern with takeUntilDestroyed
    if (content.includes('takeUntilDestroyed')) {
      return true;
    }

    // Traditional takeUntil pattern with destroy$ Subject
    if (content.includes('takeUntil') && content.includes('destroy$')) {
      return true;
    }

    // Manual subscription management
    if (content.includes('unsubscribe')) {
      return true;
    }

    // Subscription container pattern
    if (content.includes('Subscription') && content.includes('add')) {
      return true;
    }

    // Async pipe in template (no manual subscription needed)
    if (content.includes('async')) {
      return true;
    }

    // take(1) for one-time operations
    if (content.includes('take(1)')) {
      return true;
    }

    return false;
  }
}
