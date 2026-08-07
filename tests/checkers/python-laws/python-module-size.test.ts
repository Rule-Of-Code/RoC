/**
 * Module Size (Python) — the file-size guard the TS "File too long" check never
 * gave Python (it only scanned .ts/.js, so a 1100-line .py slipped through).
 * Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PythonModuleSizeLaw } from '../../../src/checkers/python-laws/python-module-size';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-size-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});
const ctx = (root: string, extra?: Partial<RuleOfCodeConfig>): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'python';
  if (extra) Object.assign(config, extra);
  return { projectRoot: root, config } as never;
};
const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `x = ${i}`).join('\n') + '\n';

describe('PythonModuleSizeLaw', () => {
  it('flags a .py file over the default 300-line limit', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'src/big.py': lines(400) });
    const r = PythonModuleSizeLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect((r.violations ?? []).some(v => /big\.py/.test(v))).toBe(true);
  });

  it('passes a .py file under the limit', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'src/ok.py': lines(120) });
    expect(PythonModuleSizeLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('passes at exactly 300 lines and fails at 301', () => {
    const at = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'src/at.py': lines(300) });
    expect(PythonModuleSizeLaw.check(ctx(at)).passed).toBe(true);
    const over = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'src/over.py': lines(301) });
    expect(PythonModuleSizeLaw.check(ctx(over)).passed).toBe(false);
  });

  it('applies the limit to test files too (default)', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'tests/test_big.py': lines(600) });
    expect(PythonModuleSizeLaw.check(ctx(dir)).passed).toBe(false);
  });

  it('honours a higher maxTestFileLines for test files', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'tests/test_big.py': lines(600) });
    const c = ctx(dir, { thresholds: { python: { maxTestFileLines: 1000 } } } as never);
    expect(PythonModuleSizeLaw.check(c).passed).toBe(true);
  });

  it('honours a custom maxFileLines', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'src/m.py': lines(200) });
    const c = ctx(dir, { thresholds: { python: { maxFileLines: 100 } } } as never);
    expect(PythonModuleSizeLaw.check(c).passed).toBe(false);
  });

  it('respects config.ignores.global (e.g. legacy/)', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname='x'\n", 'legacy/old.py': lines(900) });
    const c = ctx(dir, { ignores: { global: ['**/legacy/**'] } } as never);
    expect(PythonModuleSizeLaw.check(c).passed).toBe(true);
  });

  it('does not run on a non-Python project', () => {
    const dir = fixture({ 'package.json': '{"name":"x"}', 'src/big.js': lines(900) });
    expect(PythonModuleSizeLaw.check(ctx(dir)).passed).toBe(true);
  });
});
