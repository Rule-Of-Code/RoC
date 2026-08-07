/**
 * Gating regression (RoC_QA F5): pin the checker-internal gating that the P9
 * engine-level stack filter complements (defense-in-depth).
 *   - a Python law no-ops on a non-Python project (FE protection),
 *   - a FastAPI-gated law no-ops on a non-FastAPI Python project,
 *   - and (F4) "No Blocking In Async" now fires on ANY async Python project, not
 *     just FastAPI.
 * Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DependencyInjectionViaDependsLaw } from '../../../src/checkers/python-laws/dependency-injection-via-depends';
import { NoBlockingInAsyncLaw } from '../../../src/checkers/python-laws/no-blocking-in-async';
import { NoEvalExecLaw } from '../../../src/checkers/python-laws/no-eval-exec';
import { NoWebFrameworkOutsideInterfaceLaw } from '../../../src/checkers/python-laws/no-web-framework-outside-interface';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-gate-'));
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

const JS_PROJECT = {
  'package.json': '{"name":"x","dependencies":{"@angular/core":"^17.0.0"}}',
  'src/app/x.component.ts': 'export const x = () => eval("1+1");\n',
};
const PY_NO_FASTAPI = "[project]\nname = 'x'\ndependencies = ['aiohttp']\n";

describe('Python laws no-op on a non-Python project (checker-internal gate)', () => {
  it('NoEvalExec does not run on a JS/Angular project', () => {
    const dir = fixture(JS_PROJECT);
    expect(NoEvalExecLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('No Blocking In Async does not run on a non-Python project', () => {
    const dir = fixture({
      ...JS_PROJECT,
      'src/x.ts': 'async function f() { await sleep(1); }\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('FastAPI-gated laws no-op on a non-FastAPI Python project', () => {
  it('Dependency Injection Via Depends (203) does not run without FastAPI', () => {
    const dir = fixture({
      'pyproject.toml': PY_NO_FASTAPI,
      'src/app/api/routes.py': '@router.get("/x")\nasync def x():\n    svc = OrderService()\n    return svc\n',
    });
    expect(DependencyInjectionViaDependsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('No Web Framework Outside Interface (206) does not run without FastAPI', () => {
    const dir = fixture({
      'pyproject.toml': PY_NO_FASTAPI,
      'src/app/application/uc.py': 'import flask\n',
    });
    expect(NoWebFrameworkOutsideInterfaceLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('No Blocking In Async (202) is general async-Python (F4 widening)', () => {
  it('flags a blocking call on a non-FastAPI async project (aiohttp)', () => {
    const dir = fixture({
      'pyproject.toml': PY_NO_FASTAPI,
      'src/app/worker.py': 'import time\n\nasync def fetch():\n    time.sleep(1)\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('still flags on a FastAPI project (no regression)', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\ndependencies = ['fastapi']\n",
      'src/app/svc.py': 'import requests\n\nasync def fetch():\n    requests.get("http://x")\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(false);
  });
});
