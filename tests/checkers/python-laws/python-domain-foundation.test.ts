/**
 * P0 foundation tests for the Python domain (FastAPI + Clean Architecture/CQRS).
 * Real temp Python project fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DomainLayerFrameworkIndependenceLaw } from '../../../src/checkers/python-laws/domain-layer-framework-independence';
import { FastApiTypedResponsesLaw } from '../../../src/checkers/python-laws/fastapi-typed-responses';
import { ProjectTypeDetector } from '../../../src/utils/config/project-type-detector';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-py-'));
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

describe('Python domain — project detection', () => {
  it('detects a Python project by pyproject.toml', () => {
    const dir = fixture({ 'pyproject.toml': "[project]\nname = 'x'\n" });
    expect(ProjectTypeDetector.isPythonProject(dir)).toBe(true);
    expect(ProjectTypeDetector.detectProjectType(dir)).toBe('python');
  });
  it('does not treat a non-Python dir as Python', () => {
    const dir = fixture({ 'README.md': '# x' });
    expect(ProjectTypeDetector.isPythonProject(dir)).toBe(false);
  });
});

describe('DomainLayerFrameworkIndependenceLaw (Clean Architecture)', () => {
  it('flags a domain file importing infrastructure/framework', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/app/domain/order.py': 'import sqlalchemy\nclass Order:\n    pass\n',
    });
    expect(DomainLayerFrameworkIndependenceLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a pure domain file', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/app/domain/order.py': 'from dataclasses import dataclass\n\n@dataclass\nclass Order:\n    id: str\n',
    });
    expect(DomainLayerFrameworkIndependenceLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores a forbidden import that appears only in a comment/string', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/app/domain/note.py': '# we used to: import sqlalchemy\nMSG = "import requests here"\n',
    });
    expect(DomainLayerFrameworkIndependenceLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('FastApiTypedResponsesLaw (FastAPI conventions)', () => {
  const FASTAPI_PYPROJECT = "[project]\nname='x'\ndependencies = ['fastapi>=0.110']\n";

  it('flags a data route with no response_model', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI_PYPROJECT,
      'src/app/api/routes.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n\n@router.get("/items")\nasync def items():\n    return []\n',
    });
    expect(FastApiTypedResponsesLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a route declaring response_model (handles nested parens)', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI_PYPROJECT,
      'src/app/api/routes.py': 'from fastapi import APIRouter, Depends\nrouter = APIRouter()\n\n@router.get("/items", response_model=list[Item], dependencies=[Depends(auth)])\nasync def items():\n    return []\n',
    });
    expect(FastApiTypedResponsesLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('exempts routes with a custom response_class or 204', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI_PYPROJECT,
      'src/app/api/routes.py': 'from fastapi import APIRouter\nfrom fastapi.responses import StreamingResponse\nrouter = APIRouter()\n\n@router.get("/stream", response_class=StreamingResponse)\nasync def stream():\n    ...\n\n@router.put("/x", status_code=204)\nasync def upd():\n    ...\n',
    });
    expect(FastApiTypedResponsesLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does NOT fire on a non-FastAPI Python project (gated)', () => {
    const dir = fixture({
      'pyproject.toml': "[project]\nname='x'\n",
      'src/app/api/routes.py': '@router.get("/x")\ndef x():\n    return 1\n',
    });
    expect(FastApiTypedResponsesLaw.check(ctx(dir)).passed).toBe(true);
  });
});
