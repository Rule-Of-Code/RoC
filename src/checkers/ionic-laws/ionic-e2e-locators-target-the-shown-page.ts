/**
 * Ionic E2E Locators Target The Shown Page
 *
 * "When you navigate to a new page, Ionic will keep the old page in the
 * existing DOM, but hide it" — and the old page comes FIRST in document order.
 * A first-match locator on an ion-* element (`locator('ion-content')`,
 * `querySelector('ion-button')`, `.first()`) returns the hidden page's element.
 * The result is not flaky; it is deterministically wrong, and it reads as
 * "navigation did not happen" or "element is not visible".
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { TsClasses } from '../../utils/ts-classes';
import { LawBase } from '../law-base';

/** Browser-driven spec files: Playwright, WebdriverIO, Cypress. */
const E2E_FILE = /(?:^|\/)(?:e2e|cypress)\/.*\.[jt]s$|\.e2e(?:\.spec)?\.[jt]s$|\.cy\.[jt]s$/;
/** A selector string handed to a locator-style call. */
const LOCATOR_CALL =
  /\b(?:locator|querySelector|querySelectorAll|\$\$?|get|find)\s*\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g;
const IONIC_ELEMENT = /(?:^|[\s>+~,(])ion-[a-z]/;
const SCOPED_TO_SHOWN = /:visible\b|ion-page-hidden/;

export class IonicE2eLocatorsTargetTheShownPageLaw extends LawBase {
  static readonly LAW_NAME = 'Ionic E2E Locators Target The Shown Page';

  static check(context: LawCheckContext): LawResult {
    const files = FileUtils.scanForFiles(
      context.projectRoot,
      context.config,
      ['.ts', '.js'],
      context.lawId,
      true
    ).filter(file =>
      E2E_FILE.test(PathOperations.getRelative(context.projectRoot, file).replace(/\\/g, '/'))
    );
    const violations: string[] = [];
    for (const file of files) {
      const where = PathOperations.getRelative(context.projectRoot, file);
      violations.push(...this.checkFile(where, FileUtils.readFileContentSync(file) ?? ''));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'TESTING',
      [
        'Filter page-level locators by visibility: `ion-content:visible`',
        'Or scope to the shown page: `.ion-page:not(.ion-page-hidden) …`, or use role/text queries, which skip hidden elements',
      ],
      context
    );
  }

  static checkFile(where: string, content: string): string[] {
    const code = TsClasses.mask(content); // comments only — selectors are strings
    const violations: string[] = [];
    for (const match of code.matchAll(LOCATOR_CALL)) {
      const selector = match[2] ?? '';
      if (!IONIC_ELEMENT.test(selector) || SCOPED_TO_SHOWN.test(selector)) continue;
      // A visibility filter chained on the same expression also scopes it.
      const rest = code.slice((match.index ?? 0) + match[0].length).split('\n')[0] ?? '';
      if (/visible\s*:\s*true|\.filter\(\s*\{\s*visible/.test(rest)) continue;
      violations.push(
        `${where}:${TsClasses.lineAt(content, match.index ?? 0)}: '${selector}' matches the hidden page first — Ionic keeps the left page in the DOM ahead of the shown one. Use '${selector}:visible' or scope to .ion-page:not(.ion-page-hidden)`
      );
    }
    return violations;
  }
}
