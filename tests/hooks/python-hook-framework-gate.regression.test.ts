/**
 * v7.9.0 taught the "Git Hook Compliance" law that `.pre-commit-config.yaml` is
 * the Python-native husky. Two places kept demanding husky anyway, and a Python
 * consumer (Flask, uv/hatchling, 7 pre-commit hooks) hit both:
 *
 *   1. the SISTER law "Git Hooks Standards" — "Git hooks directory missing"
 *   2. the engine warning — "⚠️ Missing git hooks: All hooks - .husky directory
 *      not found" (GitHooksInstaller.validateHooks, called by the audit engine)
 *
 * A concern satisfied the Python way IS satisfied. But the gate must stay
 * SELECTIVE: it keys on "a hook framework is configured", not on "is Python",
 * and it must not weaken husky detection for JS/TS at all — hence the JS rows
 * and the bare-Python row below, which must all still fire.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { GitHooksStandardsLaw } from '../../src/checkers/version-control-laws/git-hooks-standards';
import { GitHooksInstaller } from '../../src/hooks/installer';

const dirs: string[] = [];

/** The consumer's 7-hook pre-commit framework (ruff, mypy, pytest, bandit, secrets, RoC). */
const SEVEN_HOOKS = `repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.0
    hooks:
      - id: ruff
      - id: ruff-format
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.11.0
    hooks:
      - id: mypy
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: uv run pytest
        language: system
        pass_filenames: false
      - id: bandit
        name: bandit
        entry: uv run bandit
        language: system
      - id: detect-secrets
        name: detect-secrets
        entry: uv run detect-secrets-hook
        language: system
      - id: ruleofcode
        name: ruleofcode pre-push
        entry: npx ruleofcode audit --mode=pre-push
        language: system
        stages: [pre-push]
        pass_filenames: false
`;

/** The consumer's config: every hook requested, no husky anywhere. */
const config = {
  project: { type: 'python' },
  hooks: { preCommit: true, prePush: true, commitMsg: true },
} as unknown as RuleOfCodeConfig;

/**
 * A real git repo. `dropHooksDir` reproduces the consumer's shape (no
 * `.git/hooks` at all); otherwise `.git/hooks` keeps ONLY its `*.sample` files,
 * the pristine state of a fresh clone.
 */
function fixture(
  files: Record<string, string>,
  opts: { dropHooksDir?: boolean } = {}
): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-hookgate-'));
  dirs.push(dir);

  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }

  execSync('git init -q', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email roc@test.local', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name roc-test', { cwd: dir, stdio: 'pipe' });

  const hooksDir = path.join(dir, '.git', 'hooks');
  if (opts.dropHooksDir) {
    fs.rmSync(hooksDir, { recursive: true, force: true });
  } else {
    for (const f of fs.readdirSync(hooksDir)) {
      if (!f.endsWith('.sample')) {
        fs.rmSync(path.join(hooksDir, f), { force: true });
      }
    }
  }

  return dir;
}

const PYPROJECT = "[project]\nname='svc'\nversion='0.1.0'\ndependencies=['flask']\n";
const FLASK_APP = 'from flask import Flask\napp = Flask(__name__)\n';

/** Python + pre-commit framework — the concern is satisfied, the Python way. */
const pythonWithFramework = (opts?: { dropHooksDir?: boolean }): string =>
  fixture(
    {
      'pyproject.toml': PYPROJECT,
      '.pre-commit-config.yaml': SEVEN_HOOKS,
      'src/app.py': FLASK_APP,
    },
    opts
  );

const law = (projectRoot: string): { passed: boolean; violations: string[] } =>
  GitHooksStandardsLaw.check({ projectRoot, config }) as unknown as {
    passed: boolean;
    violations: string[];
  };

const validate = (
  projectRoot: string
): { valid: boolean; missing: string[]; outdated: string[] } =>
  GitHooksInstaller.validateHooks({ projectRoot, config });

afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

describe('a hook framework satisfies the hook concern (Python-native husky)', () => {
  jest.setTimeout(60000);

  it('Git Hooks Standards passes when pre-commit owns the hooks', () => {
    const result = law(pythonWithFramework());
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('Git Hooks Standards no longer cries "Git hooks directory missing"', () => {
    // The consumer's exact red: pre-commit configured, but no `.git/hooks` dir.
    const result = law(pythonWithFramework({ dropHooksDir: true }));
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('the engine does not warn about a missing .husky directory', () => {
    const result = validate(pythonWithFramework());
    expect(result.missing).toEqual([]);
    expect(result.outdated).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('the gate is selective — husky is still demanded where it is the answer', () => {
  jest.setTimeout(60000);

  /** JS/TS project, no hooks of any kind. */
  const jsNoHooks = (opts?: { dropHooksDir?: boolean }): string =>
    fixture(
      {
        'package.json': JSON.stringify({
          name: 'web',
          version: '1.0.0',
          devDependencies: { typescript: '^5.0.0' },
          scripts: {},
        }),
        'src/a.ts': 'export const a = 1;\n',
      },
      opts
    );

  it('still flags a JS project with no .git/hooks directory', () => {
    const result = law(jsNoHooks({ dropHooksDir: true }));
    expect(result.violations).toContain('Git hooks directory missing');
    expect(result.passed).toBe(false);
  });

  it('still flags husky installed but not configured (JS)', () => {
    const root = fixture({
      'package.json': JSON.stringify({
        name: 'web',
        version: '1.0.0',
        devDependencies: { husky: '^9.0.0' },
        scripts: {},
      }),
      'src/a.ts': 'export const a = 1;\n',
    });

    const result = law(root);
    expect(result.violations).toContain('Husky installed but not configured');
    expect(result.passed).toBe(false);
  });

  it('still warns a JS project that .husky is missing', () => {
    const result = validate(jsNoHooks());
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['All hooks - .husky directory not found']);
  });

  it('still warns a Python project that configured NO hook framework', () => {
    // The gate keys on "framework configured", not on "is Python" — a bare
    // Python project has satisfied nothing and must still be told so.
    const bare = fixture({
      'pyproject.toml': "[project]\nname='bare'\nversion='0.1.0'\n",
      'src/thing.py': 'x = 1\n',
    });

    const result = validate(bare);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['All hooks - .husky directory not found']);
  });
});
