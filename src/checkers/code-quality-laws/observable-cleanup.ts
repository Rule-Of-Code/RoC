/**
 * Observable Cleanup Requirements Law
 * Ensures proper RxJS observable cleanup in Angular applications
 */

import { AngularComponentFiles } from '../../utils/angular-component-files';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { CodeQualityLawBase } from './code-quality-law-base';

const REACT_IMPORT = /\bfrom\s+['"]react(?:\/[^'"]*)?['"]/;
const RXJS_IMPORT = /\bfrom\s+['"]rxjs(?:\/[^'"]*)?['"]/;

/**
 * Text that shows a file manages its subscriptions; a pattern matches when
 * the file contains every part of it:
 * NgRx Effects files (managed by NgRx), an Observable being created (not a
 * subscription), takeUntilDestroyed (Angular 16+), takeUntil with a destroy$
 * Subject, manual unsubscribe, a Subscription container, the async pipe in a
 * template (no manual subscription), and take(1) for one-time operations.
 */
const CLEANUP_PATTERNS: ReadonlyArray<readonly string[]> = [
  ['createEffect'],
  ['@ngrx/effects'],
  ['new Observable', 'subscriber'],
  ['takeUntilDestroyed'],
  ['takeUntil', 'destroy$'],
  ['unsubscribe'],
  ['Subscription', 'add'],
  ['async'],
  ['take(1)'],
];

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

        // A React module's `.subscribe(` is a store's own API (the shape
        // useSyncExternalStore consumes), not an RxJS Observable — unless the
        // module imports RxJS itself.
        if (this.isReactModuleWithoutRxjs(content)) continue;

        const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
        violations.push(...this.fileFindings(file, content, relativePath));
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

  /** What one file is reported for: subscriptions, or a component, without a cleanup pattern. */
  private static fileFindings(
    file: string,
    content: string,
    relativePath: string
  ): string[] {
    const found: string[] = [];
    // Check if file has observable subscriptions but no cleanup
    if (
      this.hasObservableSubscriptions(content) &&
      !this.hasProperCleanupPattern(content)
    ) {
      found.push(
        `Observable subscriptions without proper cleanup: ${relativePath}`
      );
    }

    // Check for direct subscription without proper cleanup pattern
    if (
      content.includes('.subscribe(') &&
      !this.hasProperCleanupPattern(content)
    ) {
      found.push(
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
      found.push(
        `Component with subscriptions missing OnDestroy: ${relativePath}`
      );
    }
    return found;
  }

  private static isReactModuleWithoutRxjs(content: string): boolean {
    return REACT_IMPORT.test(content) && !RXJS_IMPORT.test(content);
  }

  /**
   * Check if file has proper cleanup patterns
   * Supports modern Angular patterns: takeUntil, takeUntilDestroyed, unsubscribe, Subscription management
   */
  private static hasProperCleanupPattern(content: string): boolean {
    return CLEANUP_PATTERNS.some(parts =>
      parts.every(part => content.includes(part))
    );
  }
}
