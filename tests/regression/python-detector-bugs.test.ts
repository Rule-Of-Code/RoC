import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AsyncTestsAreMarkedLaw } from '../../src/checkers/python-laws/async-tests-are-marked';
import { BanditConfiguredLaw } from '../../src/checkers/python-laws/bandit-configured';
import { MypyConfiguredLaw } from '../../src/checkers/python-laws/mypy-configured';
import { PyprojectMetadataLaw } from '../../src/checkers/python-laws/pyproject-metadata';
import { RequestsHaveTimeoutLaw } from '../../src/checkers/python-laws/requests-have-timeout';
import { RuffConfiguredLaw } from '../../src/checkers/python-laws/ruff-configured';
import { StrictExpectedFailuresLaw } from '../../src/checkers/python-laws/strict-expected-failures';
import { FileUtils } from '../../src/utils';

/**
 * Priority bugs in the PYTHON detectors, surfaced while authoring their Law-Card
 * metadata. These are the ones that false-fail (or false-pass) LEGITIMATE Python
 * code — exactly what a real consumer would report. None is a disarmed gate.
 */
describe('PYTHON detector bugs (priority)', () => {
  let root: string;
  const config = (): ReturnType<typeof FileUtils.getMinimalDefaultConfig> => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.project.type = 'python';
    return c;
  };
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const ctx = () => ({ projectRoot: root, config: config() });
  const violations = (r: { violations?: string[] }): string[] => r.violations ?? [];

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-pybug-'));
    write('pyproject.toml', '[project]\nname = "svc"\nrequires-python = ">=3.12"\n');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('linter/type-checker/SAST configured only in a pre-commit hook', () => {
    beforeEach(() => {
      write(
        '.pre-commit-config.yaml',
        'repos:\n  - repo: local\n    hooks:\n      - id: ruff\n      - id: mypy\n      - id: bandit\n'
      );
    });
    it('Ruff Configured accepts ruff in pre-commit', () => {
      expect(violations(RuffConfiguredLaw.check(ctx()))).toEqual([]);
    });
    it('Type Checker Configured accepts mypy in pre-commit', () => {
      expect(violations(MypyConfiguredLaw.check(ctx()))).toEqual([]);
    });
    it('Security Scanner Configured accepts bandit in pre-commit', () => {
      expect(violations(BanditConfiguredLaw.check(ctx()))).toEqual([]);
    });
    it('Security Scanner Configured also accepts ruff select S (flake8-bandit)', () => {
      fs.rmSync(path.join(root, '.pre-commit-config.yaml'));
      write(
        'pyproject.toml',
        '[project]\nname = "svc"\nrequires-python = ">=3.12"\n\n[tool.ruff.lint]\nselect = ["E", "F", "S"]\n'
      );
      expect(violations(BanditConfiguredLaw.check(ctx()))).toEqual([]);
    });
    it('still fails a project with no linter/checker/SAST at all', () => {
      fs.rmSync(path.join(root, '.pre-commit-config.yaml'));
      expect(violations(RuffConfiguredLaw.check(ctx())).length).toBeGreaterThan(0);
      expect(violations(BanditConfiguredLaw.check(ctx())).length).toBeGreaterThan(0);
    });
  });

  describe('Pyproject Metadata scopes checks to the right table', () => {
    it('does not accept a name= that lives under [tool.ruff] when [project] lacks it', () => {
      write(
        'pyproject.toml',
        '[project]\n\n[tool.ruff]\nname = "linter-thing"\ntarget-version = "py312"\n'
      );
      expect(
        violations(PyprojectMetadataLaw.check(ctx())).some(v => /no project name/.test(v))
      ).toBe(true);
    });
    it('accepts a correct [project] table', () => {
      expect(violations(PyprojectMetadataLaw.check(ctx()))).toEqual([]);
    });
  });

  describe('Async Tests Are Marked recognises project-wide markers', () => {
    it('accepts a module-level pytestmark = pytest.mark.asyncio', () => {
      write(
        'tests/test_a.py',
        'import pytest\npytestmark = pytest.mark.asyncio\n\nasync def test_x():\n    assert True\n'
      );
      expect(violations(AsyncTestsAreMarkedLaw.check(ctx()))).toEqual([]);
    });
    it('accepts a class-level @pytest.mark.asyncio', () => {
      write(
        'tests/test_a.py',
        'import pytest\n\n@pytest.mark.asyncio\nclass TestThings:\n    async def test_x(self):\n        assert True\n'
      );
      expect(violations(AsyncTestsAreMarkedLaw.check(ctx()))).toEqual([]);
    });
    it('still flags an unmarked async test with no project-wide marker', () => {
      write('tests/test_a.py', 'async def test_y():\n    assert True\n');
      expect(violations(AsyncTestsAreMarkedLaw.check(ctx())).length).toBeGreaterThan(0);
    });
  });

  describe('Strict Expected Failures honours a global xfail_strict', () => {
    it('does not require per-marker strict= when xfail_strict = true is set', () => {
      write(
        'pyproject.toml',
        '[project]\nname="s"\nrequires-python=">=3.12"\n\n[tool.pytest.ini_options]\nxfail_strict = true\n'
      );
      write(
        'tests/test_a.py',
        'import pytest\n\n@pytest.mark.xfail(reason="known bug")\ndef test_z():\n    assert False\n'
      );
      expect(violations(StrictExpectedFailuresLaw.check(ctx()))).toEqual([]);
    });
    it('still flags a non-strict xfail with no global setting', () => {
      write(
        'tests/test_a.py',
        'import pytest\n\n@pytest.mark.xfail(reason="bug")\ndef test_z():\n    assert False\n'
      );
      expect(
        violations(StrictExpectedFailuresLaw.check(ctx())).some(v => /strict=True/.test(v))
      ).toBe(true);
    });
  });

  describe('Requests Have Timeout treats timeout=None as no timeout', () => {
    it('flags timeout=None (it never times out)', () => {
      write('src/client.py', 'import requests\ndef f(): return requests.get("http://x", timeout=None)\n');
      expect(
        violations(RequestsHaveTimeoutLaw.check(ctx())).some(v => /timeout=None|never times out/.test(v))
      ).toBe(true);
    });
    it('accepts a real timeout', () => {
      write('src/client.py', 'import requests\ndef f(): return requests.get("http://x", timeout=5)\n');
      expect(violations(RequestsHaveTimeoutLaw.check(ctx()))).toEqual([]);
    });
  });
});
