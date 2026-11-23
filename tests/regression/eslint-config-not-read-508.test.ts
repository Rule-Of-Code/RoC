/**
 * #508 — an ESLint config the code-quality laws do not read was "no config".
 *
 * `readESLintConfig` runs only `eslint.config.js` / `.mjs`; for an
 * `eslint.config.cjs` / `.ts` / `.mts` / `.cts`, `.eslintrc.js` or
 * `.eslintrc.cjs` it returned null, which also means "no config". Dead Code
 * Elimination then reported `ESLint dead code detection rules not configured`
 * about a config it never read; Code Complexity Control and Magic Number
 * Prevention said nothing. Now the reader returns the file and a note, in the
 * shared "— … NOT read" wording, and all three laws report it the same way:
 * in `notRead`, not among the findings (#453). A law with no finding is read
 * in part — not passed, not judged nothing. A law reports "rules not
 * configured" only after reading a config that has none.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import type { LawResult } from '../../src/types/law.types';
import { FileUtils } from '../../src/utils';
import { readsPartly, saysJudgedNothing } from '../../src/utils/judged-nothing';

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);

const project = (config: string, text: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-508-'));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'p',
      version: '1.0.0',
      devDependencies: { eslint: '9.0.0', typescript: '5.9.3' },
    })
  );
  fs.mkdirSync(path.join(dir, 'src'));
  fs.writeFileSync(path.join(dir, 'src', 'a.ts'), 'export const a = 1;\n');
  fs.writeFileSync(path.join(dir, config), text);
  return dir;
};

const LAWS = [
  ['Dead Code Elimination', DeadCodeEliminationLaw],
  ['Code Complexity Control', CodeComplexityControlLaw],
  ['Magic Number Prevention', MagicNumberPreventionLaw],
] as const;

const run = async (
  law: { check: (c: never) => unknown },
  dir: string
): Promise<LawResult> =>
  (await law.check({
    projectRoot: dir,
    config: FileUtils.getMinimalDefaultConfig(),
  } as never)) as LawResult;

describe('#508 an ESLint config the laws do not read is said to be NOT read', () => {
  describe.each(['.eslintrc.js', 'eslint.config.cjs', 'eslint.config.ts'])(
    '%s',
    config => {
      it.each(LAWS)(
        '%s names it in notRead, not as a finding',
        async (_name, law) => {
          const dir = project(
            config,
            "module.exports = { rules: { 'no-unused-vars': 'error' } };\n"
          );
          const result = await run(law, dir);
          const isNote = (v: string): boolean =>
            v.startsWith(`${config} `) &&
            v.includes(' — ') &&
            v.endsWith('NOT read');
          expect((result.notRead ?? []).filter(isNote)).toHaveLength(1);
          expect((result.violations ?? []).some(isNote)).toBe(false);
          expect(result.violations ?? []).not.toContain(
            'ESLint dead code detection rules not configured'
          );
          // No finding in what was read: read in part, not passed, and not
          // "judged nothing" (#453).
          expect(result.violations ?? []).toEqual([]);
          expect(result.passed).toBe(false);
          expect(readsPartly(result)).toBe(true);
          expect(saysJudgedNothing(result)).toBe(false);
        }
      );
    }
  );
});
