/**
 * P5 — Testing discipline: async tests marked, no live network, no sleep.
 * Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AsyncTestsAreMarkedLaw } from '../../../src/checkers/python-laws/async-tests-are-marked';
import { NoLiveNetworkInTestsLaw } from '../../../src/checkers/python-laws/no-live-network-in-tests';
import { NoSleepInTestsLaw } from '../../../src/checkers/python-laws/no-sleep-in-tests';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const PY = "[project]\nname='x'\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p5-'));
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

describe('AsyncTestsAreMarkedLaw', () => {
  it('flags an unmarked async test', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'tests/test_x.py': 'async def test_foo():\n    assert 1\n',
    });
    expect(AsyncTestsAreMarkedLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a marked async test', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'tests/test_x.py': 'import pytest\n\n@pytest.mark.asyncio\nasync def test_foo():\n    assert 1\n',
    });
    expect(AsyncTestsAreMarkedLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('is satisfied by asyncio_mode = auto', () => {
    const dir = fixture({
      'pyproject.toml': PY + '[tool.pytest.ini_options]\nasyncio_mode = "auto"\n',
      'tests/test_x.py': 'async def test_foo():\n    assert 1\n',
    });
    expect(AsyncTestsAreMarkedLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('NoLiveNetworkInTestsLaw', () => {
  it('flags a real requests/httpx call in a unit test', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'tests/test_n.py': 'import requests\n\ndef test_api():\n    r = requests.get("http://x")\n    assert r\n',
    });
    expect(NoLiveNetworkInTestsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes mocked tests and exempts integration suites', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'tests/test_n.py': 'import responses\n\n@responses.activate\ndef test_api():\n    assert True\n',
      'tests/integration/test_live.py': 'import requests\n\ndef test_live():\n    requests.get("http://x")\n',
    });
    expect(NoLiveNetworkInTestsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('NoSleepInTestsLaw', () => {
  it('flags time.sleep in a test', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'tests/test_s.py': 'import time\n\ndef test_wait():\n    time.sleep(2)\n',
    });
    expect(NoSleepInTestsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('does not flag sleep in application code', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/worker.py': 'import time\n\ndef run():\n    time.sleep(2)\n',
    });
    expect(NoSleepInTestsLaw.check(ctx(dir)).passed).toBe(true);
  });
});
