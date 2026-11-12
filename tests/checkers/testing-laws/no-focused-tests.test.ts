/**
 * NoFocusedTests (#231): a committed focus narrows the run and the run still
 * exits green. Read as syntax, in every test-file spelling, never from
 * comments or strings; a project with a runner and no test file fails.
 */
import { NoFocusedTestsLaw } from '../../../src/checkers/testing-laws/no-focused-tests';
import { TEST_INTEGRITY_LAWS } from '../../../src/data/test-integrity-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const check = (files: Record<string, string>, overrides = {}) =>
  NoFocusedTestsLaw.check(ctx(project({ 'package.json': manifest({ jest: '30.3.0' }), ...files }), overrides));

const GREEN_SPEC = "describe('s', () => { it('a', () => { expect(1).toBe(1); }); });";

describe('NoFocusedTestsLaw (#231)', () => {
  it.each([
    ['it.only', "it.only('a', () => {});"],
    ['test.only', "test.only('a', () => {});"],
    ['describe.only', "describe.only('s', () => {});"],
    ['context.only (Mocha)', "context.only('s', () => {});"],
    ['test.describe.only (Playwright)', "test.describe.only('s', () => {});"],
    ['test.describe.only with no title (Playwright)', 'test.describe.only(() => {});'],
    ['it.only.each(table)', "it.only.each([[1]])('a %i', (n) => {});"],
    ['test.only.each`table`', 'test.only.each`\n  a\n  ${1}\n`(\'a\', () => {});'],
    ['test.concurrent.only', "test.concurrent.only('a', async () => {});"],
    ['fit (Jasmine/Jest)', "fit('a', () => {});"],
    ['fdescribe (Jasmine/Jest)', "fdescribe('s', () => {});"],
    ['fit imported from @jest/globals', "import { fit } from '@jest/globals';\nfit('a', () => {});"],
    ['a fixture-extended test', "const authTest = base.extend({});\nauthTest.only('a', async ({ page }) => {});"],
  ])('red: %s', (_name, code) => {
    const result = check({ 'src/a.spec.ts': code });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/^src\/a\.spec\.ts:\d+: .+ focuses the run/)]);
  });

  it.each([
    ['a .test.tsx component test', 'src/Button.test.tsx', "test.only('b', () => { render(<Button />); });"],
    ['a Playwright .spec.mts', 'e2e/home.spec.mts', "test.only('home', async ({ page }) => {});"],
    ['a Cypress .cy.ts', 'cypress/e2e/home.cy.ts', "it.only('home', () => {});"],
    ['a Jest __tests__ file without a suffix', 'src/__tests__/sum.js', "test.only('sum', () => {});"],
  ])('red in %s', (_name, file, code) => {
    const result = check({ [file]: code });
    expect(result.violations).toEqual([expect.stringContaining(`${file}:1: ${code.split('(')[0]}(…)`)]);
  });

  it('names the line of each focus', () => {
    const result = check({ 'src/a.spec.ts': `${GREEN_SPEC}\n\nit.only('b', () => {});\nfdescribe('c', () => {});` });
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/a\.spec\.ts:3: it\.only\(…\)/),
      expect.stringMatching(/^src\/a\.spec\.ts:4: fdescribe\(…\)/),
    ]);
  });

  it.each([
    ['plain tests', GREEN_SPEC],
    ['.skip (a separate decision)', "it.skip('a', () => {}); describe.skip('s', () => {});"],
    ['a focus in a comment', "// it.only('a', () => {});\n/* fdescribe('x') */\n" + GREEN_SPEC],
    ['a focus in a string', "it('says it.only(…) is banned', () => { expect('test.only(').toBeTruthy(); });"],
    ['a local function named fit', 'function fit(points) { return points; }\nit(\'fits\', () => { fit([1]); });'],
    ['an .only property that is not a test', "it('a', () => { const r = options.only; expect(filter.only(1)).toBe(1); });"],
  ])('green: %s', (_name, code) => {
    const result = check({ 'src/a.spec.ts': code });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('does not read a focus in a source file (only test files are the subject)', () => {
    // The control: the same text in a test file IS found (red cases above).
    const result = check({ 'src/util.ts': "export const x = () => test.only('a', () => {});", 'src/a.spec.ts': GREEN_SPEC });
    expect(result.passed).toBe(true);
  });

  it('honours a root-relative ignore — and still reads what is not ignored (control)', () => {
    const result = check(
      { 'src/vendor/v.spec.ts': "it.only('v', () => {});", 'src/a.spec.ts': "it.only('a', () => {});" },
      { ignores: { global: ['src/vendor/**'], tests: [], build: [], design: [] } }
    );
    expect(result.violations).toEqual([expect.stringMatching(/^src\/a\.spec\.ts:1:/)]);
  });

  it('fails, never passes, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check({ 'src/a.spec.ts': "it.only('a', () => {});" });
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([expect.stringMatching(/1 file\(s\): could not load the 'typescript' package .* NOT read/)]);
    } finally {
      spy.mockRestore();
    }
  });

  it('fails, never passes, when a runner is declared and no test file is in the scan', () => {
    const result = check({ 'src/index.ts': 'export const a = 1;' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/No test file was found in the scan .* nothing was inspected/)]);
  });
});

describe('No Focused Tests selection (requires)', () => {
  const card = TEST_INTEGRITY_LAWS.find(law => law.title === 'No Focused Tests');

  it.each(['jest', 'vitest', 'mocha', '@playwright/test', 'jasmine-core', 'cypress'])(
    'is selected where %s is declared',
    runner => {
      expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ [runner]: '1.0.0' }) }))).toBe(true);
    }
  );

  it('is not selected without a JS test runner', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19.0.0' }) }))).toBe(false);
  });
});
