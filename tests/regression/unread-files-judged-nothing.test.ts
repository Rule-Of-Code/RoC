/**
 * #427 (QA, issuecomment-7055913248) — without `typescript`, No Focused Tests,
 * Guard Function Has Production Caller, Tsconfig Exclude Leaves Code Untyped
 * and Independent Awaits said their files were NOT read, but the note counted
 * as an ordinary finding: no `judgedNothing`, so a run with them alone was
 * "compliance with warnings" where Test Isolation in the same state made it
 * partial. One rule now, in one place (saysJudgedNothing): a law whose every
 * finding is a parser-unavailable note read none of its files and judged
 * nothing. A law that also read input without the parser says so in the note
 * (PARTLY_READ_TEXT) and is not judged nothing; neither is a note beside a
 * real finding.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { GuardFunctionHasProductionCallerLaw } from '../../src/checkers/integrity-laws/guard-function-has-production-caller';
import { TsconfigExcludeLeavesCodeUntypedLaw } from '../../src/checkers/integrity-laws/tsconfig-exclude-leaves-code-untyped';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { NoFocusedTestsLaw } from '../../src/checkers/testing-laws/no-focused-tests';
import { ConfigLoader } from '../../src/config/loader';
import {
  normalizeJudgedNothing,
  PARTLY_READ_TEXT,
  saysJudgedNothing,
} from '../../src/utils/judged-nothing';
import * as tsxSource from '../../src/utils/react/tsx-source';

jest.mock('../../src/utils/react/tsx-source', () => {
  const actual = jest.requireActual('../../src/utils/react/tsx-source');
  return { ...actual, loadTypeScript: jest.fn(actual.loadTypeScript) };
});
const loadTypeScript = tsxSource.loadTypeScript as jest.MockedFunction<
  typeof tsxSource.loadTypeScript
>;
// jest.config resets mocks before every test: no parser in each test here.
beforeEach(() => loadTypeScript.mockReturnValue(null));

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);
const project = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-unread-'));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
};

type Result = {
  passed: boolean;
  judgedNothing?: boolean;
  score?: number;
  violations?: string[];
};
/** The result as the audit records it (normalizeJudgedNothing runs on every law). */
const audited = (check: (c: never) => unknown, dir: string): Result =>
  normalizeJudgedNothing(
    check({ projectRoot: dir, config: ConfigLoader.load(dir) } as never)
  ) as Result;

const NOT_READ = "could not load the 'typescript' package";
const MANIFEST = JSON.stringify({ name: 'app', version: '1.0.0' });

describe('a law that read none of its files judged nothing', () => {
  it.each<[string, (c: never) => unknown, Record<string, string>]>([
    [
      'No Focused Tests',
      c => NoFocusedTestsLaw.check(c),
      {
        'package.json': MANIFEST,
        'src/sum.test.ts': "it('adds', () => expect(1 + 2).toBe(3));\n",
      },
    ],
    [
      'Guard Function Has Production Caller',
      c => GuardFunctionHasProductionCallerLaw.check(c),
      {
        'package.json': MANIFEST,
        'src/guards.ts':
          'export function requireUser(id: string): string { return id; }\n',
      },
    ],
    [
      'Tsconfig Exclude Leaves Code Untyped',
      c => TsconfigExcludeLeavesCodeUntypedLaw.check(c),
      {
        'package.json': MANIFEST,
        'tsconfig.json': JSON.stringify({ exclude: ['e2e'] }),
        'src/app.ts': 'export const app = 1;\n',
      },
    ],
    [
      'Independent Awaits Run Concurrently',
      c => IndependentAwaitsRunConcurrentlyLaw.check(c),
      {
        'package.json': MANIFEST,
        'src/load.ts':
          'export async function load(a: () => Promise<number>, b: () => Promise<number>) {\n  const x = await a();\n  const y = await b();\n  return x + y;\n}\n',
      },
    ],
  ])(
    '%s, without typescript: judgedNothing, failed, score 0',
    (_name, check, files) => {
      const result = audited(check, project(files));
      expect(result.violations?.join('\n')).toContain(NOT_READ);
      expect(result.judgedNothing).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    }
  );
});

describe('a law that read part of its input did not judge nothing', () => {
  it('TypeScript Strict Mode with an extends chain: the own flags were read', () => {
    const dir = project({
      'package.json': MANIFEST,
      'tsconfig.base.json': JSON.stringify({
        compilerOptions: { strict: true },
      }),
      'tsconfig.json': JSON.stringify({
        extends: './tsconfig.base.json',
        compilerOptions: { strict: true },
      }),
    });
    const result = audited(c => TypeScriptStrictLaw.check(c), dir);
    expect(result.violations?.join('\n')).toContain(PARTLY_READ_TEXT);
    expect(result.judgedNothing).toBeUndefined();
  });

  it('Independent Awaits with Python read and TS not: the note says the rest was judged', () => {
    const dir = project({
      'package.json': MANIFEST,
      'app/service.py':
        'async def load(a, b):\n    x = await a()\n    return x\n',
      'src/load.ts':
        'export async function load(a: () => Promise<number>) {\n  return await a();\n}\n',
    });
    const result = audited(
      c => IndependentAwaitsRunConcurrentlyLaw.check(c),
      dir
    );
    const text = result.violations?.join('\n') ?? '';
    expect(text).toContain(NOT_READ);
    expect(text).toContain(PARTLY_READ_TEXT);
    expect(result.judgedNothing).toBeUndefined();
  });
});

describe('saysJudgedNothing: the rule itself', () => {
  const note = `3 file(s): ${NOT_READ} from /p — the .ts file(s) were NOT read.`;
  it.each<[string, string[], boolean]>([
    ['only parser-unavailable notes', [note, note], true],
    [
      'a note beside a real finding',
      [note, 'src/a.ts: fit() leaves the suite focused'],
      false,
    ],
    [
      'a note that covers part of the input',
      [`${note}; ${PARTLY_READ_TEXT}`],
      false,
    ],
    [
      'a parse error is not "no parser"',
      ['src/a.ts: could not be parsed (x) — its code was NOT read'],
      false,
    ],
    ['no violations', [], false],
  ])('%s', (_label, violations, expected) => {
    expect(saysJudgedNothing({ passed: false, violations })).toBe(expected);
  });
});
