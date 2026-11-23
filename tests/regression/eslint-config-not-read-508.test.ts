/**
 * #508 — an ESLint config the code-quality laws do not read was "no config".
 *
 * `readESLintConfig` runs only `eslint.config.js` / `.mjs`; for an
 * `eslint.config.cjs` / `.ts` / `.mts` / `.cts`, `.eslintrc.js` or
 * `.eslintrc.cjs` it returned null, which also means "no config". Dead Code
 * Elimination then reported `ESLint dead code detection rules not configured`
 * about a config it never read; Code Complexity Control and Magic Number
 * Prevention said nothing. Now the reader returns the file and a note, in the
 * shared "— … NOT read" wording, and all three laws report it the same way.
 * A law reports "rules not configured" only after reading a config that has
 * none.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import { FileUtils } from '../../src/utils';

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

const violations = async (
  law: { check: (c: never) => unknown },
  dir: string
): Promise<string[]> =>
  ((
    (await law.check({
      projectRoot: dir,
      config: FileUtils.getMinimalDefaultConfig(),
    } as never)) as { violations?: string[] }
  ).violations ?? []) as string[];

describe('#508 an ESLint config the laws do not read is said to be NOT read', () => {
  describe.each(['.eslintrc.js', 'eslint.config.cjs', 'eslint.config.ts'])(
    '%s',
    config => {
      it.each(LAWS)('%s names it as not read', async (_name, law) => {
        const dir = project(
          config,
          "module.exports = { rules: { 'no-unused-vars': 'error' } };\n"
        );
        const found = await violations(law, dir);
        expect(
          found.some(
            v =>
              v.startsWith(`${config} `) &&
              v.includes(' — ') &&
              v.endsWith('NOT read')
          )
        ).toBe(true);
        expect(found).not.toContain(
          'ESLint dead code detection rules not configured'
        );
      });
    }
  );
});
