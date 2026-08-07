/**
 * Memory Management Law
 * Enforces native browser-resource hygiene: every acquired native resource must
 * be released with its matching teardown call. Concretely, in component and
 * directive files it flags:
 *   - setInterval() with no clearInterval() in the same file;
 *   - addEventListener() with no removeEventListener() in the same file.
 *
 * Reconciliation (RoC has many related laws — no duplicate flagging):
 *  - RxJS subscription cleanup is owned by ObservableCleanupLaw and
 *    AngularLifecycleManagementLaw.
 *  - RxJS long-lived streams in components (interval/timer/fromEvent) are owned
 *    by SideEffectsInNgrxEffectsLaw.
 *  - AngularLifecycleManagementLaw flags timers when OnDestroy is *absent*; this
 *    law uses a stronger, complementary criterion — the matching teardown CALL
 *    must exist — so it catches an empty ngOnDestroy that never clears the timer.
 *
 * (Previously this law delegated to placeholder analyzers that always returned
 *  "no problems", so it never detected anything — this restores real detection.)
 */

import type { LawCheckContext, LawResult } from '../../types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { PythonSatisfaction } from '../../utils/python-satisfaction';

const LAW_NAME = 'Memory Management Law';

/** The concern this law owns does not exist without its substrate. */
const NOT_APPLICABLE_MESSAGE =
  '📋 Not applicable — no TypeScript/JavaScript sources in this project';

export class MemoryManagementLaw {
  /** Generic guidance surfaced for any analyzed project (the leak vectors). */
  private static readonly RECOMMENDATIONS = [
    'Unsubscribe from observables in the component destroy lifecycle',
    'Remove event listeners in the component destroy lifecycle',
    'Clear timers and intervals in the component destroy lifecycle',
    'Clear DOM references in the component destroy lifecycle',
    'Implement proper cleanup in destroy lifecycle methods',
  ];

  private static readonly SET_INTERVAL = /\bsetInterval\s*\(/;
  private static readonly CLEAR_INTERVAL = /\bclearInterval\s*\(/;
  private static readonly ADD_LISTENER = /\baddEventListener\s*\(/;
  private static readonly REMOVE_LISTENER = /\bremoveEventListener\s*\(/;

  /**
   * A project with no TS/JS sources cannot leak a JS timer or a DOM listener:
   * the absence of the substrate is not a violation, it is N/A (score 100, zero
   * violations) — never a permanent red mark that only a waiver can silence.
   */
  private static createNotApplicableResult(context: LawCheckContext): LawResult {
    return {
      lawName: LAW_NAME,
      passed: true,
      message: NOT_APPLICABLE_MESSAGE,
      violations: [],
      suggestions: [],
      score: 100,
      config: context.config,
      metrics: { totalFiles: 0, issuesFound: 0 },
    };
  }

  /** Flag every acquired native resource left without its teardown call. */
  private static collectViolations(
    componentFiles: string[],
    projectRoot: string
  ): string[] {
    const violations: string[] = [];

    for (const file of componentFiles) {
      if (!file.endsWith('.component.ts') && !file.endsWith('.directive.ts')) {
        continue; // native DOM resources are a component/directive concern
      }
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      const content = raw
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
      const relativePath = PathOperations.getRelative(projectRoot, file);

      if (this.SET_INTERVAL.test(content) && !this.CLEAR_INTERVAL.test(content)) {
        violations.push(
          `${relativePath}: setInterval() without a matching clearInterval() — clear the interval in ngOnDestroy().`
        );
      }
      if (this.ADD_LISTENER.test(content) && !this.REMOVE_LISTENER.test(content)) {
        violations.push(
          `${relativePath}: addEventListener() without a matching removeEventListener() — remove the listener in ngOnDestroy().`
        );
      }
    }

    return violations;
  }

  static check(context: LawCheckContext): LawResult {
    if (!PythonSatisfaction.hasJsTsSources(context.projectRoot)) {
      return this.createNotApplicableResult(context);
    }

    const suggestions: string[] = [];

    const componentFiles = CheckerUtils.findAngularFiles(
      context.projectRoot,
      context.config
    ).filter(file => {
      const fileName = PathOperations.getBasename(file);
      return !fileName.endsWith('.spec.ts') && !fileName.endsWith('.test.ts');
    });

    if (componentFiles.length === 0) {
      return {
        lawName: LAW_NAME,
        passed: false,
        message: '1 Memory Management Law violations found',
        violations: ['No TypeScript files found'],
        suggestions: ['Ensure TypeScript files exist in src directory'],
        score: 90,
        config: context.config,
        metrics: { totalFiles: 0, issuesFound: 1 },
      };
    }

    const violations = this.collectViolations(
      componentFiles,
      context.projectRoot
    );

    suggestions.push(...this.RECOMMENDATIONS);

    return {
      lawName: LAW_NAME,
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'Memory Management Law compliance verified'
          : `${violations.length} Memory Management Law violations found`,
      violations,
      suggestions: Array.from(new Set(suggestions)),
      score:
        violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10),
      config: context.config,
      metrics: {
        totalFiles: componentFiles.length,
        issuesFound: violations.length,
      },
    };
  }
}
