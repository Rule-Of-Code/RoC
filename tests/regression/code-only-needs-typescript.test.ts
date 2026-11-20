/**
 * #427 — without `typescript`, CodeText.codeOnly fell back to a regex and said
 * nothing. The regex reads a string in a detector test as code, so Test
 * Isolation Enforcement (an error law) failed a project that passes with the
 * parser: the result depended on the machine. Now, with no parser, the laws
 * that need it report their test files as not read (judged nothing) and judge
 * nothing with a regex; with the parser, nothing changes.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ConfigLoader } from '../../src/config/loader';
import { TestDataManagementLaw } from '../../src/laws/testing/test-data-management';
import { TestIsolationEnforcementLaw } from '../../src/laws/testing/test-isolation-enforcement';
import { CodeText } from '../../src/utils/code-text';
import * as tsxSource from '../../src/utils/react/tsx-source';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;

describe('#427 no parser → not read, never a regex verdict', () => {
  let dir: string;
  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-427-'));
    const write = (rel: string, text: string): void => {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    };
    write(
      'package.json',
      JSON.stringify({ name: 'no-parser', version: '1.0.0' })
    );
    write(
      'src/sum.ts',
      'export const sum = (a: number, b: number): number => a + b;\n'
    );
    write(
      'src/sum.test.ts',
      [
        "import { sum } from './sum';",
        "describe('sum', () => {",
        "  it('adds', () => {",
        '    expect(sum(1, 2)).toBe(3);',
        '  });',
        '});',
        '',
      ].join('\n')
    );
  });
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  // jest.config resets mocks before every test (resetMocks): give the mock the
  // real loader each time; the no-parser tests override it with null.
  const realLoad = jest.requireActual<typeof tsxSource>(
    '../../src/utils/react/tsx-source'
  ).loadTypeScript;
  beforeEach(() => loadTypeScript.mockImplementation(realLoad));

  const context = () => ({ projectRoot: dir, config: ConfigLoader.load(dir) });

  it.each([
    [
      'Test Isolation Enforcement',
      () => TestIsolationEnforcementLaw.check(context()),
    ],
    ['Test Data Management', () => TestDataManagementLaw.check(context())],
  ])(
    '%s: without typescript, its test files are reported as not read',
    (name, run) => {
      loadTypeScript.mockReturnValue(null);
      const result = run() as {
        judgedNothing?: boolean;
        passed: boolean;
        violations?: string[];
      };
      expect(result.passed).toBe(false);
      expect(result.judgedNothing).toBe(true);
      expect(result.violations).toHaveLength(1);
      expect(result.violations?.[0]).toContain(
        "could not load the 'typescript' package"
      );
      expect(result.violations?.[0]).toContain(
        'the 1 test file(s) were NOT read'
      );
      expect(result.violations?.[0]).toContain(`${name} judged nothing`);
    }
  );

  it.each([
    [
      'Test Isolation Enforcement',
      () => TestIsolationEnforcementLaw.check(context()),
    ],
    ['Test Data Management', () => TestDataManagementLaw.check(context())],
  ])('%s: with typescript, no not-read note', (_name, run) => {
    const result = run() as { judgedNothing?: boolean; violations?: string[] };
    expect(result.judgedNothing).not.toBe(true);
    expect((result.violations ?? []).join('\n')).not.toContain('were NOT read');
  });

  it('CodeText.codeOnly without typescript throws, it does not guess', () => {
    loadTypeScript.mockReturnValue(null);
    expect(() => CodeText.codeOnly("const s = 'it.only(x)';")).toThrow(
      'were NOT read'
    );
  });

  it('CodeText.codeOnly with typescript blanks strings, as before', () => {
    expect(CodeText.codeOnly("const s = 'it.only(x)';")).not.toContain('only');
  });
});
