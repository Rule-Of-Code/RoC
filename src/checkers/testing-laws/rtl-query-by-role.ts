/**
 * RTL Query By Role
 *
 * Testing Library's queries by role, label and text find an element the way a
 * user (and assistive technology) does, so a test that uses them fails when
 * the user could not find the element either. `getByTestId` and
 * `container.querySelector` find it by an implementation detail and keep
 * passing through a broken label. Testing Library's own guidance ranks the
 * test id last.
 *
 * One query cannot be judged on its own, so the law reads the SHARE of
 * user-facing queries across the React test files and holds it to a fixed
 * floor of 50%. Playwright files are left out: `page.getByRole` is Playwright's
 * API with the same name, judged by Playwright Locators User Facing.
 */

import * as fs from 'fs';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { TestSources } from '../../utils/testing/test-sources';
import { LawBase } from '../law-base';
import { shareSummary, type FileCount } from './query-share';

const RTL = '@testing-library/react';

/** `getByRole`, `queryAllByText`, `findByTestId` … — every Testing Library query. */
const QUERY = /^(?:get|query|find)(?:All)?By(TestId|Role|LabelText|PlaceholderText|Text|DisplayValue|AltText|Title)$/;

const TEST_ID = 'TestId';
const SELECTOR_QUERIES = new Set(['querySelector', 'querySelectorAll']);

/** The fixed floor: at least half of the queries find an element as a user does. */
export const RTL_USER_FACING_FLOOR = 50;

export interface QueryCounts {
  userFacing: number;
  testId: number;
  selector: number;
}

export class RtlQueryByRoleLaw extends LawBase {
  static readonly LAW_NAME = 'RTL Query By Role';

  static check(context: LawCheckContext): LawResult {
    const playwright = new Set(
      TestSources.playwrightFiles(context).sources.map(source => source.fileName)
    );
    const files = TestSources.testFiles(context).filter(file => !playwright.has(file));
    const { sources, unread } = TestSources.parse(context, files);
    const violations = [...unread];
    if (!this.libraryInScan(context, sources)) {
      violations.push(
        `${RTL} is declared, but no file in the scan imports it — nothing was inspected. If the component tests are excluded by ignores or includes, they were not read`
      );
    }

    let userFacing = 0;
    const byFile: FileCount[] = [];
    for (const source of sources) {
      const counts = this.count(source);
      userFacing += counts.userFacing;
      byFile.push({
        file: ReactProject.relative(context, source.fileName),
        count: counts.testId + counts.selector,
      });
    }
    const verdict = shareSummary({
      userFacing,
      byFile,
      floor: RTL_USER_FACING_FLOOR,
      what: 'Testing Library queries',
      userFacingNames: 'ByRole/LabelText/PlaceholderText/Text/DisplayValue/AltText/Title',
      implementationNames: 'ByTestId/querySelector',
    });
    if (verdict) violations.push(verdict);

    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        "Query as a user does: screen.getByRole('button', { name: 'Save' }), getByLabelText('Email')",
        'Keep getByTestId for elements with no accessible role, label or text',
      ],
      context
    );
  }

  /**
   * Queries in one file. `querySelector` is counted only in a file that uses
   * Testing Library: elsewhere it is plain DOM code, not an escape hatch from
   * a query.
   */
  static count(source: TsxSource): QueryCounts {
    const ts = source.ts;
    const counts: QueryCounts = { userFacing: 0, testId: 0, selector: 0 };
    let selectors = 0;
    source.walk(node => {
      const name = this.calledName(ts, node);
      if (!name) return;
      const query = QUERY.exec(name);
      if (query) {
        if (query[1] === TEST_ID) counts.testId++;
        else counts.userFacing++;
      } else if (SELECTOR_QUERIES.has(name)) {
        selectors++;
      }
    });
    const usesLibrary =
      counts.userFacing + counts.testId > 0 || TestSources.importsAny(source, [RTL]);
    counts.selector = usesLibrary ? selectors : 0;
    return counts;
  }

  /** The test files import RTL, or a non-test wrapper (a custom render) does. */
  private static libraryInScan(context: LawCheckContext, tests: TsxSource[]): boolean {
    if (tests.some(source => TestSources.importsAny(source, [RTL]))) return true;
    const wrappers = TestSources.codeFiles(context).filter(
      file => !TestSources.isTestFile(file) && mentions(file, RTL)
    );
    return TestSources.parse(context, wrappers).sources.some(source =>
      TestSources.importsAny(source, [RTL])
    );
  }

  private static calledName(ts: TsxSource['ts'], node: TS.Node): string | null {
    if (!ts.isCallExpression(node)) return null;
    if (ts.isIdentifier(node.expression)) return node.expression.text;
    if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
    return null;
  }
}

/** A cheap pre-filter before a parse: does the file's text name the module at all? */
function mentions(file: string, module: string): boolean {
  try {
    return fs.readFileSync(file, 'utf8').includes(module);
  } catch {
    return false;
  }
}
