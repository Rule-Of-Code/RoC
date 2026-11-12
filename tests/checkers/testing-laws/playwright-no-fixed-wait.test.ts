/**
 * PlaywrightNoFixedWait (#230): `waitForTimeout` waits for time, not for a
 * state. A reason in a comment on the line or directly above exempts it.
 * Playwright files are found the way Playwright finds them (a config's
 * testDir) or by importing the runner; a declared Playwright the scan never
 * saw fails.
 */
import { PlaywrightNoFixedWaitLaw } from '../../../src/checkers/testing-laws/playwright-no-fixed-wait';
import { TEST_INTEGRITY_LAWS } from '../../../src/data/test-integrity-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IMPORT = "import { test, expect } from '@playwright/test';";
const CONFIG = "import { defineConfig } from '@playwright/test';\nexport default defineConfig({ testDir: './e2e' });";
const spec = (...lines: string[]) =>
  [IMPORT, "test('t', async ({ page }) => {", ...lines.map(line => `  ${line}`), '});'].join('\n');

const check = (files: Record<string, string>) =>
  PlaywrightNoFixedWaitLaw.check(
    ctx(project({ 'package.json': manifest({ '@playwright/test': '1.62.1' }), 'playwright.config.ts': CONFIG, ...files }))
  );

describe('PlaywrightNoFixedWaitLaw (#230)', () => {
  it('red: a bare page.waitForTimeout', () => {
    const result = check({ 'e2e/home.spec.ts': spec('await page.waitForTimeout(500);') });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^e2e\/home\.spec\.ts:3: page\.waitForTimeout\(500\) waits for time, not for a state/),
    ]);
  });

  it('red: in a helper under testDir that imports the runner (a page object)', () => {
    const helper = "import type { Page } from '@playwright/test';\nexport const tap = async (page: Page) => {\n  await page.click('x');\n  await page.waitForTimeout(700);\n};";
    const result = check({ 'e2e/support/tap.ts': helper, 'e2e/home.spec.ts': spec('await expect(page).toHaveTitle(/x/);') });
    expect(result.violations).toEqual([expect.stringMatching(/^e2e\/support\/tap\.ts:4: page\.waitForTimeout\(700\)/)]);
  });

  it('red: a frame or a locator-held page counts the same', () => {
    const result = check({ 'e2e/a.spec.ts': spec('await page.mainFrame().waitForTimeout(100);') });
    expect(result.violations).toHaveLength(1);
  });

  it('red: a comment two lines above, separated by a blank line, is not a reason for this call', () => {
    const result = check({ 'e2e/a.spec.ts': spec('// settle', '', 'await page.waitForTimeout(300);') });
    expect(result.violations).toHaveLength(1);
  });

  it('red: an eslint directive without a reason after -- is not a reason', () => {
    const result = check({
      'e2e/a.spec.ts': spec('// eslint-disable-next-line playwright/no-wait-for-timeout', 'await page.waitForTimeout(300);'),
    });
    expect(result.violations).toHaveLength(1);
  });

  it.each([
    ['a comment directly above', ['// Nothing may happen within 3 s: a second request would be a double charge.', 'await page.waitForTimeout(3000);']],
    ['a comment block ending directly above', ['/*', ' * The screen settles its own layout; there is no single signal to await.', ' */', 'await page.waitForTimeout(1500);']],
    ['a comment on the line', ['await page.waitForTimeout(300); // let the toast animation finish before measuring']],
    ['an eslint directive with a reason', ['// eslint-disable-next-line playwright/no-wait-for-timeout -- asserting nothing fires', 'await page.waitForTimeout(300);']],
    ['a reason in another script', ['// Изчакваме анимацията, няма събитие за нея', 'await page.waitForTimeout(300);']],
  ])('green: %s', (_name, lines) => {
    const result = check({ 'e2e/a.spec.ts': spec(...(lines as string[])) });
    expect(result.violations).toEqual([]);
  });

  it('green: waiting for a state', () => {
    const result = check({
      'e2e/a.spec.ts': spec("await expect(page.getByRole('status')).toHaveText('Saved');", "await page.waitForURL('**/done');"),
    });
    expect(result.passed).toBe(true);
  });

  it('green: the word in a comment or a string is not a call', () => {
    const result = check({ 'e2e/a.spec.ts': spec('// never page.waitForTimeout(500)', "const doc = 'page.waitForTimeout(500)';") });
    expect(result.passed).toBe(true);
  });

  it('reads a test that imports the runner outside any testDir (no config)', () => {
    const root = project({
      'package.json': manifest({ '@playwright/test': '1.62.1' }),
      'tests/a.spec.ts': spec('await page.waitForTimeout(200);'),
    });
    expect(PlaywrightNoFixedWaitLaw.check(ctx(root)).violations).toEqual([expect.stringMatching(/^tests\/a\.spec\.ts:3:/)]);
  });

  it('does not read a Jest unit test outside testDir that does not import the runner', () => {
    const result = check({
      'src/timer.spec.ts': "it('t', async () => { await fake.waitForTimeout(1); });",
      'e2e/a.spec.ts': spec('await page.waitForTimeout(200);'),
    });
    expect(result.violations).toEqual([expect.stringMatching(/^e2e\/a\.spec\.ts:/)]);
  });

  it('honours a non-default testDir from the config (control: the default dir is not used)', () => {
    const root = project({
      'package.json': manifest({ '@playwright/test': '1.62.1' }),
      'apps/web-e2e/playwright.config.ts': "export default { testDir: './src' };",
      'apps/web-e2e/src/flow.e2e.spec.ts': "test('t', async ({ page }) => { await page.waitForTimeout(9); });",
      // Next to the config but outside its testDir, not importing the runner.
      'apps/web-e2e/tools/other.spec.ts': "it('t', async () => { await fake.waitForTimeout(9); });",
    });
    expect(PlaywrightNoFixedWaitLaw.check(ctx(root)).violations).toEqual([
      expect.stringMatching(/^apps\/web-e2e\/src\/flow\.e2e\.spec\.ts:1:/),
    ]);
  });

  it('fails, never passes, when Playwright is declared and the scan saw none of it', () => {
    const root = project({ 'package.json': manifest({ '@playwright/test': '1.62.1' }), 'src/a.ts': 'export {};' });
    const result = PlaywrightNoFixedWaitLaw.check(ctx(root));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/no playwright\.config\.\* and no file importing @playwright\/test — nothing was inspected/)]);
  });

  it('fails, never passes, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check({ 'e2e/a.spec.ts': spec('await page.waitForTimeout(1);') });
      expect(result.passed).toBe(false);
      expect((result.violations ?? []).join('\n')).toMatch(/could not load the 'typescript' package/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Playwright No Fixed Wait selection (requires)', () => {
  const card = TEST_INTEGRITY_LAWS.find(law => law.title === 'Playwright No Fixed Wait');

  it('is selected where @playwright/test is declared', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@playwright/test': '1.62.1' }) }))).toBe(true);
  });

  it('is not selected without Playwright', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ jest: '30.0.0' }) }))).toBe(false);
  });
});
