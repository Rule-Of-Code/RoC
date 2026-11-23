/**
 * #453 — a law that read part of its input reports the part it could not read
 * as a note, and the note is pushed into `violations`.
 *
 * So the law is listed as a finding ("1 violations found", a warning at its
 * severity) although it found nothing wrong: it says what it did not read. A
 * consumer counting violations counts the note. The result tells a finding
 * from "I did not read this" only by wording (PARTLY_READ_TEXT, "NOT read").
 *
 * The direction in the issue: a field of its own on the law result
 * (`notRead: string[]`), filled where the law knows it did not read
 * something; `violations` keeps findings only. The first law migrated is
 * TypeScript Strict Mode (an `extends` link it cannot follow); the laws
 * whose notes come from the shared readers follow, law by law.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { TypeScriptStrictLaw } from '../../src/checkers/sacred-laws/typescript-strict';
import { IndependentAwaitsRunConcurrentlyLaw } from '../../src/checkers/request-path-laws/independent-awaits-run-concurrently';
import { ConfigLoader } from '../../src/config/loader';
import { normalizeJudgedNothing } from '../../src/utils/judged-nothing';
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-453-'));
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
  violations?: string[];
  notRead?: string[];
};
/** The result as the audit records it (normalizeJudgedNothing runs on every law). */
const audited = async (
  check: (c: never) => unknown,
  dir: string
): Promise<Result> =>
  normalizeJudgedNothing(
    await check({ projectRoot: dir, config: ConfigLoader.load(dir) } as never)
  ) as Result;

const MANIFEST = JSON.stringify({ name: 'app', version: '1.0.0' });

describe('#453 what a law did not read is not one of its findings', () => {
  it('TypeScript Strict Mode, an extends link it cannot read, strict on: no finding, one notRead', async () => {
    const dir = project({
      'package.json': MANIFEST,
      'tsconfig.json': JSON.stringify({
        extends: './not-here.json',
        compilerOptions: { strict: true, target: 'ES2022' },
      }),
    });
    const result = await audited(c => TypeScriptStrictLaw.check(c), dir);
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead ?? []).toEqual([
      expect.stringContaining(
        'tsconfig.json extends "./not-here.json", which could not be read'
      ),
    ]);
    expect(result.judgedNothing).toBeUndefined();
  });

  it('Independent Awaits, Python read and TypeScript not: no finding, one notRead', async () => {
    const dir = project({
      'package.json': MANIFEST,
      'app/service.py':
        'async def load(a, b):\n    x = await a()\n    return x\n',
      'src/load.ts':
        'export async function load(a: () => Promise<number>) {\n  return await a();\n}\n',
    });
    const result = await audited(
      c => IndependentAwaitsRunConcurrentlyLaw.check(c),
      dir
    );
    expect(result.violations ?? []).toEqual([]);
    expect(result.notRead ?? []).toEqual([
      expect.stringContaining("could not load the 'typescript' package"),
    ]);
    expect(result.judgedNothing).toBeUndefined();
  });
});
