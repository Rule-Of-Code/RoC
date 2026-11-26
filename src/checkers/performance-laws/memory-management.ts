/**
 * Memory Management Law
 * Enforces native browser-resource hygiene: every acquired native resource must
 * be released with its matching teardown call. Concretely, in component and
 * directive files it flags:
 *   - setInterval() with no clearInterval() in the same file;
 *   - addEventListener() with no removeEventListener() in the same file.
 * The same two checks read the <script> of every Vue single-file component
 * (.vue), and tell it to tear down in onBeforeUnmount() / onUnmounted() (#12).
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
import { AngularComponentFiles } from '../../utils/angular-component-files';
import { scriptText } from '../../utils/vue/vue-sfc';

const LAW_NAME = 'Memory Management Law';
/** Where a Vue component releases what it acquired (#12). */
const VUE_TEARDOWN = 'onBeforeUnmount() / onUnmounted()';

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
  private static createNotApplicableResult(
    context: LawCheckContext
  ): LawResult {
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
      // Native DOM resources are a component/directive concern — by suffix or,
      // for Angular 20's `hero.ts`, by decorator (#336).
      if (!AngularComponentFiles.isKind(file, ['component', 'directive']))
        continue;
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      violations.push(
        ...this.leaks(
          PathOperations.getRelative(projectRoot, file),
          raw,
          'ngOnDestroy()'
        )
      );
    }

    return violations;
  }

  /**
   * The same checks on Vue single-file components (#12): a .vue file is read
   * by its <script> and <script setup>, so markup and styles that mention a
   * timer are not code.
   */
  private static collectVueViolations(
    vueFiles: string[],
    projectRoot: string
  ): string[] {
    const violations: string[] = [];
    for (const file of vueFiles) {
      const raw = FileUtils.readFileContentSync(file);
      if (!raw) continue;
      violations.push(
        ...this.leaks(
          PathOperations.getRelative(projectRoot, file),
          scriptText(file, raw),
          VUE_TEARDOWN
        )
      );
    }
    return violations;
  }

  /** A timer or a listener the code acquires and never releases, as findings. */
  private static leaks(
    relativePath: string,
    raw: string,
    teardown: string
  ): string[] {
    const content = raw
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const found: string[] = [];
    if (this.SET_INTERVAL.test(content) && !this.CLEAR_INTERVAL.test(content)) {
      found.push(
        `${relativePath}: setInterval() without a matching clearInterval() — clear the interval in ${teardown}.`
      );
    }
    if (
      this.ADD_LISTENER.test(content) &&
      !this.REMOVE_LISTENER.test(content)
    ) {
      found.push(
        `${relativePath}: addEventListener() without a matching removeEventListener() — remove the listener in ${teardown}.`
      );
    }
    return found;
  }

  static check(context: LawCheckContext): LawResult {
    if (!PythonSatisfaction.hasJsTsSources(context.projectRoot)) {
      return this.createNotApplicableResult(context);
    }

    const suggestions: string[] = [];

    // Test files are already left out by the scanner (includeTests: false
    // ignores every TEST_FILE_GLOBS pattern, whatever the config). The filter
    // that stood here tested a name with its extension stripped, so it never
    // removed anything (#369).
    const componentFiles = CheckerUtils.findAngularFiles(
      context.projectRoot,
      context.config
    );
    // Vue single-file components, read by their script (#12).
    const vueFiles = FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.vue'],
      context.lawId,
      false
    );

    if (componentFiles.length === 0 && vueFiles.length === 0) {
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

    const violations = [
      ...this.collectViolations(componentFiles, context.projectRoot),
      ...this.collectVueViolations(vueFiles, context.projectRoot),
    ];

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
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
      metrics: {
        totalFiles: componentFiles.length + vueFiles.length,
        issuesFound: violations.length,
      },
    };
  }
}
