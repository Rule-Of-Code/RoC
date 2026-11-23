/**
 * #493 — Code Documentation Standards read `.ts` / `.tsx` only: an exported
 * function or class without JSDoc in a `.js` / `.jsx` / `.mjs` / `.cjs` file
 * was never looked at, with no note, so a JavaScript project got a clean
 * result from a law that did not read its code.
 *
 * The law now reads JavaScript through the same parser (TypeScript parses
 * JavaScript; JSDoc is the same), with the same rule.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { CodeDocumentationLaw } from '../../src/checkers/code-quality-laws/code-documentation';
import { FileUtils } from '../../src/utils';

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);

const project = (files: Record<string, string>): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-493-'));
  dirs.push(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'p', version: '1.0.0' })
  );
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  }
  return dir;
};

const violations = (dir: string): string[] =>
  (CodeDocumentationLaw.check({
    projectRoot: dir,
    config: FileUtils.getMinimalDefaultConfig(),
  }).violations ?? []) as string[];

const TWO =
  'export function a() { return 1; }\nexport function b() { return 2; }\n';

describe('#493 Code Documentation reads JavaScript exports', () => {
  it.each(['src/x.js', 'src/x.jsx', 'src/x.mjs', 'src/x.cjs'])(
    '%s: an exported function without JSDoc is a finding',
    file => {
      const found = violations(project({ [file]: TWO }));
      expect(found).toEqual([
        expect.stringContaining(`${file}:1: exported function a has no JSDoc`),
        expect.stringContaining(`${file}:2: exported function b has no JSDoc`),
      ]);
    }
  );

  it('a documented JavaScript export is not', () => {
    const src =
      '/** One. */\nexport function a() { return 1; }\n/** Two. */\nexport function b() { return 2; }\n';
    expect(violations(project({ 'src/x.js': src }))).toEqual([]);
  });
});
