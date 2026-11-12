/**
 * No Focused Tests
 *
 * `.only` (Jest, Vitest, Mocha, Playwright, Cypress) and `fit`/`fdescribe`
 * (Jasmine, Jest) narrow a run to the focused tests and skip the rest — and a
 * run that skipped everything else still exits green. A focus committed by
 * accident turns the suite into a gate that checks one test: the disarmed gate
 * this tool exists to refuse.
 *
 * Read as syntax: a call whose callee chain starts at a test function (`it`,
 * `test`, `describe`, `context`, `specify`, `suite`) and goes through `.only`
 * — `test.only`, `test.describe.only`, `it.only.each(table)`, the tagged
 * `test.only.each\`…\``. A `.only` on another base counts when the call has a
 * test's shape (a title and a function), which is how a fixture-extended
 * `authTest.only('…', async () => …)` is found. `fit`/`fdescribe` count unless
 * the file declares a name of its own with that spelling. Comments and strings
 * are not code, so a `// TODO: remove test.only` is never a finding.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { TestSources } from '../../utils/testing/test-sources';
import { LawBase } from '../law-base';

/** The globals every runner calls a test or a suite. */
const TEST_FUNCTIONS = new Set(['it', 'test', 'describe', 'context', 'specify', 'suite']);

/** Jasmine's (and Jest's) focused aliases. */
const FOCUS_FUNCTIONS = new Set(['fit', 'fdescribe']);

const ONLY = 'only';

interface Focus {
  line: number;
  callee: string;
}

export class NoFocusedTestsLaw extends LawBase {
  static readonly LAW_NAME = 'No Focused Tests';

  static check(context: LawCheckContext): LawResult {
    const files = TestSources.testFiles(context);
    const violations: string[] = [];
    if (files.length === 0) {
      violations.push(
        'No test file was found in the scan (.spec/.test/.cy/.e2e-spec, or a __tests__ directory) although a test runner is declared — nothing was inspected. If the tests are excluded by ignores or includes, they were not read'
      );
    }
    const { sources, unread } = TestSources.parse(context, files);
    violations.push(...unread);
    for (const source of sources) {
      for (const focus of this.focusedCalls(source)) {
        violations.push(
          `${ReactProject.relative(context, source.fileName)}:${focus.line}: ${focus.callee}(…) focuses the run — every unfocused test is skipped and the run still exits green`
        );
      }
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Remove the .only / fit / fdescribe before committing',
        'Make CI refuse a focus too: forbidOnly in playwright.config, --forbid-only for Mocha',
      ],
      context
    );
  }

  /** Every focused test or suite in the file, in source order. */
  static focusedCalls(source: TsxSource): Focus[] {
    const ts = source.ts;
    const declared = this.declaredNames(source);
    const found: Focus[] = [];
    source.walk(node => {
      const callee = ts.isCallExpression(node)
        ? node.expression
        : ts.isTaggedTemplateExpression(node)
          ? node.tag
          : null;
      if (!callee) return;
      if (this.isFocus(source, node, callee, declared)) {
        found.push({ line: source.lineOf(node), callee: callee.getText(source.sourceFile) });
      }
    });
    return found;
  }

  private static isFocus(
    source: TsxSource,
    node: TS.Node,
    callee: TS.Expression,
    declared: Set<string>
  ): boolean {
    const ts = source.ts;
    if (ts.isIdentifier(callee)) {
      return FOCUS_FUNCTIONS.has(callee.text) && !declared.has(callee.text);
    }
    // Walk the member chain down to its base. A call in the chain
    // (`test.only.each(table)(…)`) is its own node and is reported there.
    const members: string[] = [];
    let current: TS.Expression = callee;
    while (ts.isPropertyAccessExpression(current)) {
      members.push(current.name.text);
      current = current.expression;
    }
    if (!members.includes(ONLY) || !ts.isIdentifier(current)) return false;
    return TEST_FUNCTIONS.has(current.text) || this.hasTestShape(source, node);
  }

  /** A title first and a function among the arguments: `x.only('title', () => …)`. */
  private static hasTestShape(source: TsxSource, node: TS.Node): boolean {
    const ts = source.ts;
    if (!ts.isCallExpression(node)) return false;
    const [title] = node.arguments;
    return (
      title !== undefined &&
      ts.isStringLiteralLike(title) &&
      node.arguments.some(
        argument => ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)
      )
    );
  }

  /**
   * Names the file binds itself — a local `fit` (a curve fit) is not
   * Jasmine's. An import is not counted: `import { fit } from '@jest/globals'`
   * IS the focus.
   */
  private static declaredNames(source: TsxSource): Set<string> {
    const ts = source.ts;
    const names = new Set<string>();
    source.walk(node => {
      if (
        (ts.isVariableDeclaration(node) ||
          ts.isFunctionDeclaration(node) ||
          ts.isParameter(node)) &&
        node.name &&
        ts.isIdentifier(node.name)
      ) {
        names.add(node.name.text);
      }
    });
    return names;
  }
}
