/**
 * #390 — Error Handling Standards has no verified detection path.
 *
 * Its five checks (critical areas missing try/catch, error logging,
 * user-friendly messages, HTTP error handling, Observable error handling) were
 * measured on real projects once #369 let them see source files: a random
 * sample of each (seed recorded) was 17%, 0%, 0% (3 findings in all), 0% and
 * 33% true, against the ≥ 80% on ≥ 10 findings a check needs to stay. They
 * are removed. The law stays in the registry (its key keeps working in
 * configs) and stays opt-in; turned on, it does not pass a project it did not
 * judge: it reports that it judged nothing, which fails with score 0.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ErrorHandlingStandardsLaw } from '../../../src/laws/documentation/error-handling-standards';
import type { LawCheckContext } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import {
  normalizeJudgedNothing,
  saysJudgedNothing,
} from '../../../src/utils/judged-nothing';

const MESSAGE =
  'Error Handling Standards has no verified detection path in this version — this law judged nothing. Its five checks were measured on real projects at 0–33% precision and removed (#390); waive it or leave it off until a check is verified.';

const dirs: string[] = [];
function project(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-390-law-'));
  dirs.push(dir);
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const check = (projectRoot: string) =>
  ErrorHandlingStandardsLaw.check({
    projectRoot,
    config: FileUtils.getMinimalDefaultConfig(),
  } as LawCheckContext);

describe('#390 Error Handling Standards judges nothing, and says so', () => {
  it.each([
    [
      'a TypeScript project with an unguarded JSON.parse (the old try/catch path)',
      {
        'package.json': '{ "name": "a", "version": "1.0.0" }',
        'src/store.ts':
          'export const load = (raw: string): unknown => JSON.parse(raw);\n',
      },
    ],
    [
      'a TypeScript project with try/catch and logging everywhere',
      {
        'package.json': '{ "name": "b", "version": "1.0.0" }',
        'src/store.ts':
          'export const load = (raw: string): unknown => {\n  try {\n    return JSON.parse(raw);\n  } catch (error) {\n    console.error(error);\n    return null;\n  }\n};\n',
      },
    ],
    [
      'a Python project',
      {
        'pyproject.toml': '[project]\nname = "svc"\n',
        'app/main.py':
          'import json\n\ndef load(raw):\n    return json.loads(raw)\n',
      },
    ],
    ['an empty project', {}],
  ])(
    '%s: failed, score 0, judged nothing, with the reason',
    async (_label, files) => {
      const result = await check(project(files));

      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([MESSAGE]);
      expect(saysJudgedNothing(result)).toBe(true);
      const normalized = normalizeJudgedNothing(result);
      expect(normalized.passed).toBe(false);
      expect(normalized.score).toBe(0);
    }
  );

  it('it never passes: the same verdict whatever the project holds', async () => {
    const a = await check(project({ 'src/a.ts': 'export const a = 1;\n' }));
    const b = await check(project({ 'src/b.ts': 'fetch("/x");\n' }));
    expect(a.violations).toEqual(b.violations);
    expect(a.passed).toBe(false);
  });
});
