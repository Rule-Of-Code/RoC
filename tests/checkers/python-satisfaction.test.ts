/**
 * QA-6: universal laws with JS/TS-only detectors failed a Python project that
 * satisfies the very same concern the Python way — and some failed merely for
 * the ABSENCE of their substrate ("No TypeScript files found" on a Python
 * backend). A law that goes permanently red for a concern the project cannot
 * even have teaches consumers that waivers are normal. They are not.
 *
 * Two fixtures, mirroring QA's harness:
 *   satisfied  — a real Flask app where every concern IS met, the Python way
 *   bare       — a Python project with none of it (the laws must still fire)
 *
 * QA's own lesson applies: the fixture must satisfy the concern CLEANLY, or it
 * proves the wrong thing (their first Flask fixture was not a git repo, so the
 * hook law failed for the wrong reason).
 */
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PythonSatisfaction } from '../../src/utils/python-satisfaction';

const dirs: string[] = [];

function gitInit(dir: string): void {
  const run = (cmd: string): void => {
    execSync(cmd, { cwd: dir, stdio: 'pipe' });
  };
  run('git init -q');
  run('git config user.email roc@test.local');
  run('git config user.name roc-test');
}

function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-pysat-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  gitInit(dir);
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

/** A Flask backend where every concern is genuinely satisfied — in Python. */
const satisfied = (): string =>
  fixture({
    'pyproject.toml':
      "[project]\nname='svc'\nversion='0.1.0'\ndependencies=['flask','sqlalchemy']\n" +
      '[tool.pytest.ini_options]\naddopts = "--cov=svc --cov-branch --cov-fail-under=100"\n' +
      '[tool.coverage.report]\nfail_under = 100\n',
    '.pre-commit-config.yaml':
      'repos:\n  - repo: local\n    hooks:\n      - id: ruff\n        name: ruff\n',
    'src/app.py':
      'from flask import Flask, abort\n' +
      'from functools import wraps\n' +
      'app = Flask(__name__)\n\n' +
      'def login_required(fn):\n' +
      '    @wraps(fn)\n' +
      '    def wrapper(*a, **kw):\n' +
      '        if not current_user:\n' +
      '            abort(401)\n' +
      '        if role != "admin":\n' +
      '            abort(403)\n' +
      '        return fn(*a, **kw)\n' +
      '    return wrapper\n\n' +
      '@app.route("/health")\n' +
      'def health():\n' +
      '    return {"status": "ok"}\n\n' +
      '@app.errorhandler(Exception)\n' +
      'def handle_error(exc):\n' +
      '    return {"error": str(exc)}, 500\n',
    'tests/api/test_routes.py':
      'def test_health(app):\n' +
      '    client = app.test_client()\n' +
      '    assert client.get("/health").status_code == 200\n',
  });

/** A Python project with none of the concerns satisfied. */
const bare = (): string =>
  fixture({
    'pyproject.toml': "[project]\nname='bare'\nversion='0.1.0'\n",
    'src/thing.py': 'x = 1\n',
  });

describe('a concern satisfied the Python way IS satisfied (QA-6)', () => {
  jest.setTimeout(60000);

  it.each([
    ['health endpoint', (r: string) => PythonSatisfaction.hasHealthEndpoint(r)],
    ['global error handler', (r: string) => PythonSatisfaction.hasGlobalErrorHandler(r)],
    ['auth guards', (r: string) => PythonSatisfaction.hasAuthGuards(r)],
    ['coverage enforcement', (r: string) => PythonSatisfaction.hasCoverageConfigured(r)],
    ['API tests', (r: string) => PythonSatisfaction.hasApiTests(r)],
    ['hook framework', (r: string) => PythonSatisfaction.hasHookFramework(r)],
    ['database layer', (r: string) => PythonSatisfaction.hasDatabaseLayer(r)],
    ['test framework', (r: string) => PythonSatisfaction.hasTestFramework(r)],
  ])('detects %s in a real Flask project', (_label, probe) => {
    expect(probe(satisfied())).toBe(true);
  });

  it.each([
    ['health endpoint', (r: string) => PythonSatisfaction.hasHealthEndpoint(r)],
    ['global error handler', (r: string) => PythonSatisfaction.hasGlobalErrorHandler(r)],
    ['auth guards', (r: string) => PythonSatisfaction.hasAuthGuards(r)],
    ['coverage enforcement', (r: string) => PythonSatisfaction.hasCoverageConfigured(r)],
    ['API tests', (r: string) => PythonSatisfaction.hasApiTests(r)],
    ['hook framework', (r: string) => PythonSatisfaction.hasHookFramework(r)],
    ['database layer', (r: string) => PythonSatisfaction.hasDatabaseLayer(r)],
    ['test framework', (r: string) => PythonSatisfaction.hasTestFramework(r)],
  ])('does NOT hallucinate %s in a bare Python project', (_label, probe) => {
    expect(probe(bare())).toBe(false);
  });

  it('sees no JS/TS substrate in a Python project, and sees it in a TS one', () => {
    expect(PythonSatisfaction.hasJsTsSources(bare())).toBe(false);
    expect(
      PythonSatisfaction.hasJsTsSources(fixture({ 'src/a.ts': 'export const a = 1;' }))
    ).toBe(true);
  });

  it('recognises the project as Python', () => {
    expect(PythonSatisfaction.isPython(satisfied())).toBe(true);
  });
});

/**
 * "No test framework detected" fired on a uv + hatchling backend that runs
 * pytest — because the detector only knew jest/mocha/jasmine/cypress/playwright.
 */
describe('test framework, the Python way', () => {
  jest.setTimeout(60000);

  it.each([
    [
      'pytest section in pyproject.toml',
      { 'pyproject.toml': "[project]\nname='svc'\n[tool.pytest.ini_options]\ntestpaths = ['tests']\n" },
    ],
    [
      'a package.json test script that runs pytest',
      {
        'pyproject.toml': "[project]\nname='svc'\n",
        'package.json': JSON.stringify({ scripts: { test: 'uv run pytest' } }),
      },
    ],
    [
      'a pytest.ini',
      { 'pyproject.toml': "[project]\nname='svc'\n", 'pytest.ini': '[pytest]\n' },
    ],
    [
      'a tox.ini',
      { 'pyproject.toml': "[project]\nname='svc'\n", 'tox.ini': '[testenv]\ncommands = pytest\n' },
    ],
    [
      'setup.cfg [tool:pytest]',
      { 'setup.cfg': '[tool:pytest]\naddopts = -q\n' },
    ],
    [
      'a unittest suite under tests/',
      {
        'pyproject.toml': "[project]\nname='svc'\n",
        'tests/test_app.py': 'import unittest\n\nclass T(unittest.TestCase):\n    def test_ok(self):\n        assert True\n',
      },
    ],
  ])('detects %s', (_label, files) => {
    expect(PythonSatisfaction.hasTestFramework(fixture(files))).toBe(true);
  });

  it('does NOT claim a test framework on a Python project without one', () => {
    expect(PythonSatisfaction.hasTestFramework(bare())).toBe(false);
  });

  it('does NOT claim a test framework from a JS-only test script', () => {
    const root = fixture({
      'pyproject.toml': "[project]\nname='svc'\n",
      'package.json': JSON.stringify({ scripts: { test: 'echo no tests' } }),
      'src/thing.py': 'x = 1\n',
    });
    expect(PythonSatisfaction.hasTestFramework(root)).toBe(false);
  });
});

/**
 * "HTTP requests missing proper error handling" fired on a backend whose only
 * outbound call — `urllib.request.urlopen` — is wrapped in try/except OSError
 * with a log and a re-raise, because the detector only knew axios/fetch/XHR.
 */
describe('guarded outbound HTTP, the Python way', () => {
  jest.setTimeout(60000);

  const withSource = (source: string): string =>
    fixture({ 'pyproject.toml': "[project]\nname='svc'\n", 'src/client.py': source });

  it('accepts urlopen wrapped in try/except with a log and a re-raise', () => {
    const root = withSource(
      'import logging\n' +
        'from urllib.request import urlopen\n\n' +
        'log = logging.getLogger(__name__)\n\n' +
        'def fetch(url):\n' +
        '    try:\n' +
        '        with urlopen(url, timeout=5) as response:\n' +
        '            return response.read()\n' +
        '    except OSError:\n' +
        '        log.exception("upstream call failed")\n' +
        '        raise\n'
    );
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(true);
  });

  it.each([
    ['requests', 'import requests\n\ndef get(url):\n    try:\n        return requests.get(url, timeout=5).json()\n    except requests.RequestException:\n        raise\n'],
    ['httpx', 'import httpx\n\nasync def get(url):\n    try:\n        return await httpx.get(url)\n    except httpx.HTTPError:\n        raise\n'],
  ])('accepts a guarded %s call', (_label, source) => {
    expect(PythonSatisfaction.hasGuardedHttpCalls(withSource(source))).toBe(true);
  });

  it('rejects an unguarded urlopen', () => {
    const root = withSource(
      'from urllib.request import urlopen\n\n' +
        'def fetch(url):\n' +
        '    with urlopen(url, timeout=5) as response:\n' +
        '        return response.read()\n'
    );
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(false);
  });

  it('rejects a try WITHOUT an except clause around the call', () => {
    const root = withSource(
      'from urllib.request import urlopen\n\n' +
        'def fetch(url):\n' +
        '    try:\n' +
        '        return urlopen(url).read()\n' +
        '    finally:\n' +
        '        cleanup()\n'
    );
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(false);
  });

  it('rejects a file where one call is guarded and another is not', () => {
    const root = withSource(
      'import requests\n\n' +
        'def ok(url):\n' +
        '    try:\n' +
        '        return requests.get(url).json()\n' +
        '    except requests.RequestException:\n' +
        '        raise\n\n' +
        'def sloppy(url):\n' +
        '    return requests.post(url).json()\n'
    );
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(false);
  });

  it('ignores an urlopen mentioned only in a comment or a docstring', () => {
    const root = withSource(
      'def fetch(url):\n' +
        '    """Would call urlopen(url) — but does not."""\n' +
        '    # urlopen(url) is intentionally not used here\n' +
        '    return None\n'
    );
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(true);
  });

  it('treats a project with no outbound HTTP at all as N/A, not a violation', () => {
    expect(PythonSatisfaction.hasGuardedHttpCalls(bare())).toBe(true);
  });

  it('does not judge test code that calls the network directly', () => {
    const root = fixture({
      'pyproject.toml': "[project]\nname='svc'\n",
      'tests/test_live.py': 'import requests\n\ndef test_upstream():\n    assert requests.get("http://x").status_code == 200\n',
    });
    expect(PythonSatisfaction.hasGuardedHttpCalls(root)).toBe(true);
  });
});
