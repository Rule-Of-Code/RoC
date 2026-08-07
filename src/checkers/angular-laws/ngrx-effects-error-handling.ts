/**
 * NgRx Effects Error Handling Law
 * Ensures all effects have proper error handling
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
export class NgrxEffectsErrorHandlingLaw extends AngularLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    // Only check if NgRx is used
    const earlyReturn = this.createAngularRequiredResult(
      'NgRx Effects Error Handling',
      projectRoot,
      root => this.hasNgrxStore(root),
      context
    );
    if (earlyReturn) return earlyReturn;

    // Find effects files
    const config = ConfigHelper.getConfigFromContext(context);
    const effectsFiles = this.findEffectsFiles(projectRoot, config);

    for (const file of effectsFiles) {
      const content = FileUtils.readFile(file);
      const fileName = PathOperations.getBasename(file);

      // Check for effects declarations - improved pattern
      const effectMatches = content.match(
        /\w+\$\s*=\s*createEffect\(\s*\(\s*\)\s*=>/g
      );
      if (effectMatches) {
        for (const match of effectMatches) {
          this.analyzeEffect(match, content, fileName, violations);
        }
      }

      // Check for Injectable decorator
      if (!content.includes('@Injectable()')) {
        violations.push(
          `Effects class in ${fileName} missing @Injectable() decorator`
        );
      }

      // Check for proper Actions injection (both constructor and inject function patterns)
      // Note: actions$ should NOT be private for better testability (NgRx best practice)
      if (
        content.includes('createEffect') &&
        !content.includes('actions$: Actions') &&
        !content.includes('actions$ = inject(Actions)')
      ) {
        violations.push(
          `Effects class in ${fileName} should inject Actions service`
        );
      }
    }

    return this.createResult(
      violations,
      'NgRx Effects Error Handling',
      'ANGULAR_LAW',
      [
        'Add catchError to all effects',
        'Return error actions using of()',
        'Use @Injectable() decorator',
        'Inject Actions service properly',
      ],
      context
    );
  }

  public static findEffectsFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    // Use CheckerUtils to find effects files with proper ignore handling
    const allTsFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      config
    );
    return allTsFiles.filter((file: string) => file.includes('.effects.ts'));
  }

  public static findEffectEnd(content: string, start: number): number {
    let depth = 0;
    let inEffect = false;

    for (let i = start; i < content.length; i++) {
      const char = content[i];

      if (char === '(' || char === '{' || char === '[') {
        depth++;
        inEffect = true;
      } else if (char === ')' || char === '}' || char === ']') {
        depth--;
        if (depth === 0 && inEffect) {
          // Look for closing parenthesis of createEffect and include options like { dispatch: false }
          const remaining = content.substring(i);
          // Match: ) OR ), { dispatch: false } OR ), {...}
          const closeMatch = remaining.match(/^\s*\)(?:\s*,\s*\{[^}]*\})?\s*;/);
          if (closeMatch) {
            return i + closeMatch[0].length;
          }
        }
      }
    }

    return content.length;
  }

  /**
   * Analyze a single effect for error handling violations
   */
  private static analyzeEffect(
    match: string,
    content: string,
    fileName: string,
    violations: string[]
  ): void {
    const effectName = match.replace(
      /\$\s*=\s*createEffect\(\s*\(\s*\)\s*=>/,
      ''
    );

    // Check if effect has error handling
    const effectStart = content.indexOf(match);
    const effectEnd = this.findEffectEnd(content, effectStart);
    const effectCode = content.substring(effectStart, effectEnd);

    if (!effectCode.includes('catchError')) {
      violations.push(
        `Effect ${effectName} in ${fileName} missing error handling (catchError)`
      );
    }

    // Check for proper error action dispatch (only for dispatching effects)
    // Non-dispatching effects ({ dispatch: false }) should return of(null) or of(void 0) in catchError
    // Dispatching effects should return proper error actions
    // Note: dispatch: false might be outside the effect code in createEffect options
    const isNonDispatching =
      effectCode.includes('{ dispatch: false }') ||
      effectCode.includes('{dispatch:false}') ||
      effectCode.includes('dispatch: false') ||
      // Also check in a window around the effect declaration
      content
        .substring(effectStart, effectStart + 1000)
        .includes('dispatch: false');

    if (effectCode.includes('catchError')) {
      const hasOf = effectCode.includes('of(');
      const hasOfNull =
        effectCode.includes('of(null)') || effectCode.includes('of(void 0)');
      const hasCatchErrorWithFunction = /catchError\([^)]*\)/.test(effectCode);

      // For non-dispatching effects, having catchError is enough (can use helper functions)
      if (isNonDispatching) {
        // Non-dispatching effects with catchError are OK
        // They can return of(null) directly or via helper function
      } else {
        // Dispatching effects validation
        if (!hasOf && !hasCatchErrorWithFunction) {
          violations.push(
            `Effect ${effectName} in ${fileName} should return error action using of()`
          );
        } else if (hasOfNull) {
          // Dispatching effects should NOT return of(null), they should return error actions
          violations.push(
            `Effect ${effectName} in ${fileName} is dispatching effect but returns of(null) instead of error action`
          );
        }
      }
    }

    // Check for switchMap/mergeMap error handling
    if (effectCode.includes('switchMap') || effectCode.includes('mergeMap')) {
      if (!effectCode.includes('catchError')) {
        violations.push(
          `Effect ${effectName} in ${fileName} using switchMap/mergeMap without catchError`
        );
      }
    }
  }
}
