/**
 * P7 — Tooling/config & docs: ruff, mypy, pyproject metadata, locked deps,
 * public docstrings. Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LockedDependenciesLaw } from '../../../src/checkers/python-laws/locked-dependencies';
import { MypyConfiguredLaw } from '../../../src/checkers/python-laws/mypy-configured';
import { PublicDocstringsLaw } from '../../../src/checkers/python-laws/public-docstrings';
import { PyprojectMetadataLaw } from '../../../src/checkers/python-laws/pyproject-metadata';
import { RuffConfiguredLaw } from '../../../src/checkers/python-laws/ruff-configured';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p7-'));
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
const ctx = (root: string): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'python';
  return { projectRoot: root, config } as never;
};

describe('RuffConfiguredLaw', () => {
  it('flags a project with no linter config', () => {
    expect(RuffConfiguredLaw.check(ctx(fixture({ 'requirements.txt': 'flask\n' }))).passed).toBe(false);
  });
  it('passes with [tool.ruff] or a ruff.toml', () => {
    expect(RuffConfiguredLaw.check(ctx(fixture({ 'pyproject.toml': '[tool.ruff]\nline-length = 100\n' }))).passed).toBe(true);
    expect(RuffConfiguredLaw.check(ctx(fixture({ 'requirements.txt': 'x', 'ruff.toml': 'line-length = 100\n' }))).passed).toBe(true);
  });
});

describe('MypyConfiguredLaw', () => {
  it('flags a project with no type checker config', () => {
    expect(MypyConfiguredLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\nname = "x"\n' }))).passed).toBe(false);
  });
  it('passes with [tool.mypy]', () => {
    expect(MypyConfiguredLaw.check(ctx(fixture({ 'pyproject.toml': '[tool.mypy]\nstrict = true\n' }))).passed).toBe(true);
  });
});

describe('PyprojectMetadataLaw', () => {
  it('flags a missing pyproject and a missing requires-python', () => {
    expect(PyprojectMetadataLaw.check(ctx(fixture({ 'requirements.txt': 'x' }))).passed).toBe(false);
    expect(PyprojectMetadataLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\nname = "x"\n' }))).passed).toBe(false);
  });
  it('passes a complete [project] table', () => {
    expect(PyprojectMetadataLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\nname = "x"\nrequires-python = ">=3.12"\n' }))).passed).toBe(true);
  });
});

describe('LockedDependenciesLaw', () => {
  it('flags declared dependencies with no lockfile', () => {
    expect(LockedDependenciesLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\ndependencies = ["fastapi"]\n' }))).passed).toBe(false);
  });
  it('passes with a lockfile, fully pinned requirements, or no declared deps', () => {
    expect(LockedDependenciesLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\ndependencies = ["fastapi"]\n', 'uv.lock': 'x' }))).passed).toBe(true);
    expect(LockedDependenciesLaw.check(ctx(fixture({ 'requirements.txt': 'fastapi==0.110\n' }))).passed).toBe(true);
    expect(LockedDependenciesLaw.check(ctx(fixture({ 'pyproject.toml': '[project]\nname = "x"\n' }))).passed).toBe(true);
  });
});

describe('PublicDocstringsLaw', () => {
  it('flags a public function without a docstring', () => {
    expect(PublicDocstringsLaw.check(ctx(fixture({ 'pyproject.toml': 'x', 'src/a.py': 'def compute(x):\n    return x * 2\n' }))).passed).toBe(false);
  });
  it('passes documented symbols and exempts private names and one-liners', () => {
    const code = 'def compute(x):\n    """Double x."""\n    return x * 2\n\ndef _private():\n    return 1\n\ndef stub(): ...\n';
    expect(PublicDocstringsLaw.check(ctx(fixture({ 'pyproject.toml': 'x', 'src/a.py': code }))).passed).toBe(true);
  });
});
