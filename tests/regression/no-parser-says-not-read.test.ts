/**
 * #427, the rest of the class — five laws gave a weaker answer, and no note,
 * when `typescript` could not be loaded:
 *   HTML Lang Declared          no i18n → a violation that may be false
 *   Accessibility Linting       no jsx-a11y preset → "rules missing"
 *   TypeScript Strict Mode      the extends chain not followed, silently
 *   Inject Over Constructor DI  a regex count of constructors
 *   Test Documentation Reqs     test titles read by a regex
 * The rule for 8.0.0: what was not read is said to be not read, and judged
 * with no second-best method. With the parser nothing changes.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { AccessibilityLintingEnforcementLaw } from '../../src/checkers/accessibility-laws/accessibility-linting-enforcement';
import { InjectOverConstructorDiLaw } from '../../src/checkers/angular-laws/inject-over-constructor-di';
import { HtmlLangDeclaredLaw } from '../../src/checkers/next-laws/html-lang-declared';
import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { ConfigLoader } from '../../src/config/loader';
import { TestDocumentationRequirementsLaw } from '../../src/laws/testing/test-documentation-requirements';
import * as tsxSource from '../../src/utils/react/tsx-source';
import { NoFocusedTestsLaw } from '../../src/checkers/testing-laws/no-focused-tests';
import { TestIsolationEnforcementLaw } from '../../src/laws/testing/test-isolation-enforcement';
import { markJudgedNothing } from '../../src/utils/judged-nothing';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;
// jest.config resets mocks before every test: the real loader each time,
// overridden with null where a test needs no parser.
const realLoad = jest.requireActual<typeof tsxSource>(
  '../../src/utils/react/tsx-source'
).loadTypeScript;
beforeEach(() => loadTypeScript.mockImplementation(realLoad));

const project = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-np5-'));
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
};
const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);

type Result = {
  passed: boolean;
  judgedNothing?: boolean;
  violations?: string[];
  notRead?: string[];
};
const run = (
  check: (c: { projectRoot: string; config: never }) => unknown,
  dir: string
): { result: Result; text: string } => {
  const result = check({
    projectRoot: dir,
    config: ConfigLoader.load(dir) as never,
  }) as Result;
  // the note may be a violation or, since #453, in notRead
  const notes = [...(result.violations ?? []), ...(result.notRead ?? [])];
  return { result, text: notes.join('\n') };
};
const NOT_READ = "could not load the 'typescript' package";

describe('HTML Lang Declared: an unread next.config is not "no i18n"', () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'app',
      dependencies: { next: '15.0.0', react: '19.0.0' },
    }),
    'next.config.js': 'module.exports = { reactStrictMode: true };\n',
    'pages/index.tsx':
      'export default function Home() { return <main>hi</main>; }\n',
  };
  let dir: string;
  beforeAll(() => dirs.push((dir = project(files))));

  it('without typescript: the not-read note, not the violation', () => {
    loadTypeScript.mockReturnValue(null);
    const { text, result } = run(
      c => HtmlLangDeclaredLaw.check(c as never),
      dir
    );
    // #453: the notes are notRead, not findings
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead?.length).toBeGreaterThan(0);
    expect(text).toContain(`${NOT_READ}`);
    expect(text).toContain('the next.config file(s) were NOT read');
    expect(text).toContain('whether i18n sets <html lang> was not judged');
    expect(text).not.toContain('no _document and no i18n');
  });

  it('with typescript: the violation, as before', () => {
    const { text } = run(c => HtmlLangDeclaredLaw.check(c as never), dir);
    expect(text).toContain('no _document and no i18n in next.config');
    expect(text).not.toContain(NOT_READ);
  });
});

describe('Accessibility Linting: an unread config script is not "rules missing"', () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'app',
      dependencies: { react: '19.0.0' },
      devDependencies: { 'eslint-plugin-jsx-a11y': '6.10.0' },
    }),
    'eslint.config.mjs': [
      "import jsxA11y from 'eslint-plugin-jsx-a11y';",
      'export default [jsxA11y.flatConfigs.recommended];',
      '',
    ].join('\n'),
    'src/App.tsx':
      'export const App = () => <button type="button">ok</button>;\n',
  };
  let dir: string;
  beforeAll(() => dirs.push((dir = project(files))));

  it('without typescript: the not-read note, not "rules missing"', () => {
    loadTypeScript.mockReturnValue(null);
    const { text, result } = run(
      c => AccessibilityLintingEnforcementLaw.check(c as never),
      dir
    );
    // #453: the note is notRead, not a finding
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead).toEqual([
      expect.stringContaining('eslint.config.mjs'),
    ]);
    expect(text).toContain('eslint.config.mjs');
    expect(text).toContain(
      'whether they enable the jsx-a11y preset was not judged'
    );
    expect(text).not.toContain('rules missing');
  });

  it('with typescript: the preset is read, no finding', () => {
    const { text } = run(
      c => AccessibilityLintingEnforcementLaw.check(c as never),
      dir
    );
    expect(text).not.toContain('rules missing');
    expect(text).not.toContain(NOT_READ);
  });
});

describe('TypeScript Strict Mode: an extends chain it cannot follow is named', () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'lib',
      devDependencies: { typescript: '5.9.3' },
    }),
    'tsconfig.base.json': JSON.stringify({ compilerOptions: { strict: true } }),
    'tsconfig.json': JSON.stringify({
      extends: './tsconfig.base.json',
      compilerOptions: {},
    }),
  };
  let dir: string;
  beforeAll(() => dirs.push((dir = project(files))));

  // The chain is now read as JSONC without the compiler (QA
  // p478-tsstrict-extends): the inherited strict is found, nothing is noted.
  it('without typescript: the inherited strict is read from the chain, no note', () => {
    loadTypeScript.mockReturnValue(null);
    const { text } = run(c => TypeScriptStrictLaw.check(c as never), dir);
    expect(text).not.toContain('strict mode must be enabled');
    expect(text).not.toContain('NOT read');
  });

  it('with typescript: the inherited strict is read, no extends note', () => {
    const { text } = run(c => TypeScriptStrictLaw.check(c as never), dir);
    expect(text).not.toContain('read from tsconfig.json alone');
    expect(text).not.toMatch(/\bstrict\b.*not enabled|Strict mode/);
  });
});

describe('Inject Over Constructor DI: no regex second opinion', () => {
  const files = {
    'package.json': JSON.stringify({
      name: 'ng',
      dependencies: { '@angular/core': '20.0.0' },
    }),
    'src/app/data.service.ts': [
      "import { Injectable } from '@angular/core';",
      "import { HttpClient } from '@angular/common/http';",
      "@Injectable({ providedIn: 'root' })",
      'export class DataService {',
      '  constructor(private readonly http: HttpClient) {}',
      '}',
      '',
    ].join('\n'),
  };
  let dir: string;
  beforeAll(() => dirs.push((dir = project(files))));

  it('without typescript: the files were not read, no count', () => {
    loadTypeScript.mockReturnValue(null);
    const { text } = run(
      c => InjectOverConstructorDiLaw.check(c as never),
      dir
    );
    expect(text).toContain('the 1 Angular file(s) were NOT read');
    expect(text).not.toContain('parameter-property DI');
  });

  it('with typescript: the constructor is found, as before', () => {
    const { text } = run(
      c => InjectOverConstructorDiLaw.check(c as never),
      dir
    );
    expect(text).toContain('1 constructor(s) using parameter-property DI');
  });
});

describe('Test Documentation Requirements: titles are not read by a regex', () => {
  const files = {
    'package.json': JSON.stringify({ name: 'lib' }),
    'src/sum.ts':
      'export const sum = (a: number, b: number): number => a + b;\n',
    'src/sum.test.ts':
      "import { sum } from './sum';\nit('adds two numbers', () => expect(sum(1, 2)).toBe(3));\n",
  };
  let dir: string;
  beforeAll(() => dirs.push((dir = project(files))));

  it('without typescript: judged nothing, the files not read', () => {
    loadTypeScript.mockReturnValue(null);
    const { result, text } = run(
      c => TestDocumentationRequirementsLaw.check(c as never),
      dir
    );
    expect(result.judgedNothing).toBe(true);
    expect(text).toContain('the 1 test file(s) were NOT read');
  });

  it('with typescript: judged as before', () => {
    const { result, text } = run(
      c => TestDocumentationRequirementsLaw.check(c as never),
      dir
    );
    expect(result.judgedNothing).not.toBe(true);
    expect(text).not.toContain(NOT_READ);
  });
});

describe('a judged-nothing result headlines its own note, not a computed summary', () => {
  it('markJudgedNothing takes the message from the not-judged note', () => {
    const marked = markJudgedNothing({
      message: '⚠️ Test Isolation issues: poor setup/teardown isolation',
      violations: ['the 3 test file(s) were NOT read'],
    });
    expect(marked.message).toBe('the 3 test file(s) were NOT read');
  });

  it('a message that already says so is kept', () => {
    const marked = markJudgedNothing({
      message: 'X: nothing was judged',
      violations: ['the 3 test file(s) were NOT read'],
    });
    expect(marked.message).toBe('X: nothing was judged');
  });

  it('Test Isolation without typescript: no "poor isolation" headline', () => {
    const dir = project({
      'package.json': JSON.stringify({ name: 'lib' }),
      'src/sum.ts':
        'export const sum = (a: number, b: number): number => a + b;\n',
      'src/sum.test.ts':
        "import { sum } from './sum';\nit('adds', () => expect(sum(1, 2)).toBe(3));\n",
    });
    dirs.push(dir);
    loadTypeScript.mockReturnValue(null);
    const result = TestIsolationEnforcementLaw.check({
      projectRoot: dir,
      config: ConfigLoader.load(dir),
    }) as { message: string };
    expect(result.message).toContain('were NOT read');
    expect(result.message).not.toContain('poor setup/teardown isolation');
  });
});

describe('a not-read note names the files that were not read', () => {
  it('No Focused Tests on .ts tests: ".ts", not ".tsx/.jsx"', () => {
    const dir = project({
      'package.json': JSON.stringify({ name: 'lib' }),
      'src/sum.ts':
        'export const sum = (a: number, b: number): number => a + b;\n',
      'src/sum.test.ts': "it('adds', () => expect(1 + 2).toBe(3));\n",
    });
    dirs.push(dir);
    loadTypeScript.mockReturnValue(null);
    const { text } = run(c => NoFocusedTestsLaw.check(c as never), dir);
    expect(text).toContain('the .ts file(s) were NOT read');
    expect(text).not.toContain('.tsx/.jsx');
  });
});
