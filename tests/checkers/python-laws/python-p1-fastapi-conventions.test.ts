/**
 * P1 — FastAPI conventions: no-blocking-in-async, DI via Depends, typed request
 * bodies. Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DependencyInjectionViaDependsLaw } from '../../../src/checkers/python-laws/dependency-injection-via-depends';
import { FastApiTypedRequestBodiesLaw } from '../../../src/checkers/python-laws/fastapi-typed-request-bodies';
import { NoBlockingInAsyncLaw } from '../../../src/checkers/python-laws/no-blocking-in-async';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const FASTAPI = "[project]\nname='x'\ndependencies = ['fastapi']\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p1-'));
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

describe('NoBlockingInAsyncLaw', () => {
  it('flags time.sleep / requests inside async def', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/svc.py': 'import time, requests\n\nasync def fetch():\n    time.sleep(1)\n    requests.get("http://x")\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes async code using awaitable equivalents', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/svc.py': 'import asyncio\n\nasync def fetch():\n    await asyncio.sleep(1)\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a blocking call in a sibling SYNC function', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/svc.py': 'import time\n\nasync def a():\n    return 1\n\ndef sync_helper():\n    time.sleep(1)\n',
    });
    expect(NoBlockingInAsyncLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('DependencyInjectionViaDependsLaw', () => {
  it('flags constructing a service inside a route handler', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/api/routes.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/x")\nasync def x():\n    svc = OrderService()\n    return svc.all()\n',
    });
    expect(DependencyInjectionViaDependsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes handlers that inject via Depends', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/api/routes.py': 'from fastapi import APIRouter, Depends\nrouter = APIRouter()\n\n@router.get("/x")\nasync def x(svc: OrderService = Depends(get_svc)):\n    return svc.all()\n',
    });
    expect(DependencyInjectionViaDependsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('FastApiTypedRequestBodiesLaw', () => {
  it('flags request.json() and untyped dict bodies in write routes', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/api/routes.py': 'from fastapi import APIRouter, Request\nrouter = APIRouter()\n\n@router.post("/a")\nasync def a(request: Request):\n    data = await request.json()\n    return data\n\n@router.put("/b")\nasync def b(payload: dict):\n    return payload\n',
    });
    expect(FastApiTypedRequestBodiesLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes write routes accepting a Pydantic model', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/api/routes.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.post("/a", response_model=Out)\nasync def a(item: ItemIn):\n    return item\n',
    });
    expect(FastApiTypedRequestBodiesLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('is gated off on a non-FastAPI Python project', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/app/api/routes.py': '@router.post("/a")\nasync def a(payload: dict):\n    return payload\n',
    });
    expect(FastApiTypedRequestBodiesLaw.check(ctx(dir)).passed).toBe(true);
  });
});
