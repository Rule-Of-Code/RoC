/**
 * RtlQueryByRole (#246): the share of Testing Library queries by role, label
 * and text against getByTestId and querySelector, in the React test files,
 * held to a fixed 50% floor. Playwright's same-named locators are not counted.
 */
import { RtlQueryByRoleLaw } from '../../../src/checkers/testing-laws/rtl-query-by-role';
import { TEST_INTEGRITY_LAWS } from '../../../src/data/test-integrity-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const IMPORT = "import { render, screen } from '@testing-library/react';";
const test = (...lines: string[]) =>
  [IMPORT, "it('renders', () => {", '  render(<Form />);', ...lines.map(line => `  ${line}`), '});'].join('\n');
const ROLE = "screen.getByRole('button', { name: 'Save' });";
const TEST_ID = "screen.getByTestId('save');";
const SELECTOR = "container.querySelector('.save');";

const check = (files: Record<string, string>) =>
  RtlQueryByRoleLaw.check(
    ctx(project({ 'package.json': manifest({ react: '19.3.0', '@testing-library/react': '16.0.0' }), ...files }))
  );

describe('RtlQueryByRoleLaw (#246)', () => {
  it('red: below 50%, naming the files with the most test-id/selector queries', () => {
    const result = check({
      'src/Form.test.tsx': test(ROLE, TEST_ID, SELECTOR),
      'src/List.test.tsx': test(TEST_ID),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      '1 of 4 Testing Library queries (25%) find an element the way a user does (ByRole/LabelText/PlaceholderText/Text/DisplayValue/AltText/Title); the floor is 50%. Most ByTestId/querySelector: src/Form.test.tsx (2), src/List.test.tsx (1)',
    ]);
  });

  it('green: at the floor', () => {
    expect(check({ 'src/Form.test.tsx': test(ROLE, TEST_ID) }).violations).toEqual([]);
  });

  it.each([
    'getByLabelText',
    'queryByPlaceholderText',
    'findByText',
    'getAllByDisplayValue',
    'queryAllByAltText',
    'findAllByTitle',
  ])('counts %s as user-facing', name => {
    expect(check({ 'src/Form.test.tsx': test(`screen.${name}('x');`, TEST_ID) }).violations).toEqual([]);
  });

  it('counts a query destructured from render() and getAllByTestId', () => {
    const code = [IMPORT, "it('r', () => {", '  const { getAllByTestId, getByTestId } = render(<Form />);', "  getAllByTestId('a'); getByTestId('b');", '});'].join('\n');
    expect(check({ 'src/Form.test.tsx': code }).violations).toEqual([expect.stringMatching(/^0 of 2 Testing Library queries/)]);
  });

  it('counts querySelector only in files that use Testing Library', () => {
    const result = check({
      'src/Form.test.tsx': test(ROLE),
      'src/dom-util.test.ts': "it('d', () => { document.querySelector('a'); document.querySelectorAll('b'); });",
    });
    expect(result.violations).toEqual([]);
  });

  it('does not count Playwright locators of the same name', () => {
    const result = check({
      'src/Form.test.tsx': test(ROLE),
      'e2e/a.spec.ts': "import { test } from '@playwright/test';\ntest('t', async ({ page }) => { page.getByTestId('a'); page.getByTestId('b'); });",
    });
    expect(result.violations).toEqual([]);
  });

  it('a query in a comment or a string is not counted', () => {
    expect(check({ 'src/Form.test.tsx': test(ROLE, "// screen.getByTestId('x')", "const s = 'getByTestId(1)';") }).violations).toEqual([]);
  });

  it('reads tests that import a custom render wrapper (the wrapper imports RTL)', () => {
    const result = check({
      'src/test-utils.tsx': "export * from '@testing-library/react';",
      'src/Form.test.tsx': "import { screen } from './test-utils';\nit('r', () => { screen.getByTestId('a'); });",
    });
    expect(result.violations).toEqual([expect.stringMatching(/^0 of 1 Testing Library queries/)]);
  });

  it('fails, never passes, when RTL is declared but no scanned file imports it', () => {
    const result = check({ 'src/a.test.ts': "it('a', () => { expect(1).toBe(1); });" });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/@testing-library\/react is declared, but no file in the scan imports it — nothing was inspected/)]);
  });

  it('fails, never passes, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check({ 'src/Form.test.tsx': test(ROLE) });
      expect(result.passed).toBe(false);
      expect((result.violations ?? []).join('\n')).toMatch(/could not load the 'typescript' package/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('RTL Query By Role selection (requires)', () => {
  const card = TEST_INTEGRITY_LAWS.find(law => law.title === 'RTL Query By Role');

  it('is selected where @testing-library/react is declared, and not on a React project without it', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@testing-library/react': '16' }) }))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19' }) }))).toBe(false);
  });
});
