/**
 * PlaywrightLocatorsUserFacing (#245): the share of getByRole/Label/Text/
 * Placeholder/AltText/Title among all locator calls in the Playwright files,
 * held to a configurable floor. Testing Library queries in unit tests use the
 * same names and are not counted.
 */
import { PlaywrightLocatorsUserFacingLaw } from '../../../src/checkers/testing-laws/playwright-locators-user-facing';
import { TEST_INTEGRITY_LAWS } from '../../../src/data/test-integrity-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const spec = (...lines: string[]) =>
  ["import { test } from '@playwright/test';", "test('t', async ({ page }) => {", ...lines, '});'].join('\n');
const USER = "await page.getByRole('button', { name: 'Save' }).click();";
const TEST_ID = "await page.getByTestId('save').click();";
const CSS = "await page.locator('.btn-primary').click();";

const check = (files: Record<string, string>, thresholds: Record<string, unknown> = {}) =>
  PlaywrightLocatorsUserFacingLaw.check(
    ctx(
      project({
        'package.json': manifest({ '@playwright/test': '1.62.1' }),
        'playwright.config.ts': "export default { testDir: 'e2e' };",
        ...files,
      }),
      { thresholds: { testing: thresholds } }
    )
  );

describe('PlaywrightLocatorsUserFacingLaw (#245)', () => {
  it('red: below the default floor of 50%, naming the files with the most implementation locators', () => {
    const result = check({
      'e2e/a.spec.ts': spec(USER, TEST_ID, CSS),
      'e2e/b.spec.ts': spec(TEST_ID),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      '1 of 4 locators (25%) find an element the way a user does (getByRole/Label/Text/Placeholder/AltText/Title); the floor is 50%. Most getByTestId/locator(): e2e/a.spec.ts (2), e2e/b.spec.ts (1)',
    ]);
  });

  it('green: at the floor', () => {
    expect(check({ 'e2e/a.spec.ts': spec(USER, TEST_ID) }).violations).toEqual([]);
  });

  it.each(['getByLabel', 'getByText', 'getByPlaceholder', 'getByAltText', 'getByTitle'])(
    'counts %s as user-facing',
    name => {
      const result = check({ 'e2e/a.spec.ts': spec(`await page.${name}('x').click();`, TEST_ID) });
      expect(result.violations).toEqual([]);
    }
  );

  it('the configured floor is read: 80% turns a 50% share red', () => {
    const result = check({ 'e2e/a.spec.ts': spec(USER, TEST_ID) }, { playwrightUserFacingLocatorPercent: 80 });
    expect(result.violations).toEqual([expect.stringMatching(/1 of 2 locators \(50%\) .* the floor is 80%/)]);
  });

  it.each([[-1], [101], ['50'], [Number.NaN]])('a floor of %p is reported, never guessed', floor => {
    const result = check({ 'e2e/a.spec.ts': spec(USER, USER) }, { playwrightUserFacingLocatorPercent: floor });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/thresholds\.testing\.playwrightUserFacingLocatorPercent is .* not a percentage from 0 to 100/),
    ]);
  });

  it('does not count Testing Library queries in a unit test outside testDir', () => {
    const result = check({
      'src/Button.test.tsx': "it('b', () => { screen.getByTestId('a'); screen.getByTestId('b'); screen.getByTestId('c'); });",
      'e2e/a.spec.ts': spec(USER),
    });
    expect(result.violations).toEqual([]);
  });

  it('a locator in a comment or a string is not counted', () => {
    const result = check({ 'e2e/a.spec.ts': spec(USER, "// page.getByTestId('x'); page.locator('.y')", "const s = \"page.locator('.z')\";") });
    expect(result.violations).toEqual([]);
  });

  it('green with nothing to share out: no locator in the Playwright files', () => {
    const result = check({ 'e2e/api.spec.ts': spec("const r = await page.request.get('/health');") });
    expect(result.passed).toBe(true);
  });

  it('fails, never passes, when Playwright is declared and the scan saw none of it', () => {
    const root = project({ 'package.json': manifest({ '@playwright/test': '1.62.1' }) });
    const result = PlaywrightLocatorsUserFacingLaw.check(ctx(root));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/nothing was inspected/)]);
  });

  it('fails, never passes, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check({ 'e2e/a.spec.ts': spec(TEST_ID) });
      expect(result.passed).toBe(false);
      expect((result.violations ?? []).join('\n')).toMatch(/could not load the 'typescript' package/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Playwright Locators User Facing selection (requires)', () => {
  const card = TEST_INTEGRITY_LAWS.find(law => law.title === 'Playwright Locators User Facing');

  it('is selected where @playwright/test is declared, and not without it', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@playwright/test': '1' }) }))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ vitest: '1' }) }))).toBe(false);
  });
});
