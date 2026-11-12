/**
 * Playwright Locators User Facing
 *
 * A locator that finds an element by its role, label or visible text fails
 * when a user could no longer find it either: the button lost its name, the
 * field lost its label. A test id or a CSS selector keeps passing through
 * both, and breaks on a class rename no user sees. Playwright recommends the
 * user-facing locators first and a test id where none fits.
 *
 * One locator cannot be judged on its own — a test id is the right choice
 * where no role or text is stable — so the law reads the SHARE of user-facing
 * locators across the Playwright files and holds it to a floor
 * (`thresholds.testing.playwrightUserFacingLocatorPercent`, default 50).
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { TestSources } from '../../utils/testing/test-sources';
import { LawBase } from '../law-base';
import { PLAYWRIGHT_NOT_FOUND } from './playwright-no-fixed-wait';
import { percentFloor, shareSummary, type FileCount } from './query-share';

/** The locators that find an element the way a user does. */
export const USER_FACING_LOCATORS = new Set([
  'getByRole',
  'getByLabel',
  'getByText',
  'getByPlaceholder',
  'getByAltText',
  'getByTitle',
]);

/** The locators that find an element by an implementation detail. */
export const IMPLEMENTATION_LOCATORS = new Set(['getByTestId', 'locator']);

export const LOCATOR_FLOOR_KEY = 'thresholds.testing.playwrightUserFacingLocatorPercent';
const DEFAULT_FLOOR = 50;

export interface LocatorCounts {
  userFacing: number;
  implementation: number;
}

export class PlaywrightLocatorsUserFacingLaw extends LawBase {
  static readonly LAW_NAME = 'Playwright Locators User Facing';

  static check(context: LawCheckContext): LawResult {
    const floor = percentFloor(
      context.config.thresholds?.testing?.playwrightUserFacingLocatorPercent,
      LOCATOR_FLOOR_KEY,
      DEFAULT_FLOOR
    );
    const suite = TestSources.playwrightFiles(context);
    const violations = [...suite.unread];
    if (!floor.ok) violations.push(floor.reason);
    if (!suite.found) violations.push(PLAYWRIGHT_NOT_FOUND);

    let userFacing = 0;
    const byFile: FileCount[] = [];
    for (const source of suite.sources) {
      const counts = this.count(source);
      userFacing += counts.userFacing;
      byFile.push({ file: ReactProject.relative(context, source.fileName), count: counts.implementation });
    }
    const verdict = shareSummary({
      userFacing,
      byFile,
      floor: floor.ok ? floor.value : DEFAULT_FLOOR,
      what: 'locators',
      userFacingNames: 'getByRole/Label/Text/Placeholder/AltText/Title',
      implementationNames: 'getByTestId/locator()',
    });
    if (floor.ok && verdict) violations.push(verdict);

    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        "Find elements as a user does: page.getByRole('button', { name: 'Save' }), getByLabel('Email')",
        'Keep getByTestId for elements with no stable role or text, and CSS locators for what a user cannot name',
      ],
      context
    );
  }

  /** User-facing and implementation locator calls in one file. */
  static count(source: TsxSource): LocatorCounts {
    const ts = source.ts;
    const counts: LocatorCounts = { userFacing: 0, implementation: 0 };
    source.walk(node => {
      const name = this.calledMember(ts, node);
      if (!name) return;
      if (USER_FACING_LOCATORS.has(name)) counts.userFacing++;
      else if (IMPLEMENTATION_LOCATORS.has(name)) counts.implementation++;
    });
    return counts;
  }

  private static calledMember(ts: TsxSource['ts'], node: TS.Node): string | null {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      return null;
    }
    return node.expression.name.text;
  }
}
