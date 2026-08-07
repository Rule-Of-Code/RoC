/**
 * P2 — Clean Architecture: dependency direction + web-framework confinement.
 * Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CleanArchitectureDependencyDirectionLaw } from '../../../src/checkers/python-laws/clean-architecture-dependency-direction';
import { NoWebFrameworkOutsideInterfaceLaw } from '../../../src/checkers/python-laws/no-web-framework-outside-interface';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const FASTAPI = "[project]\nname='x'\ndependencies = ['fastapi']\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p2-'));
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

describe('CleanArchitectureDependencyDirectionLaw', () => {
  it('flags an outward import (domain → infrastructure)', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/domain/order.py': 'from app.infrastructure.db import Session\n\nclass Order:\n    pass\n',
    });
    expect(
      CleanArchitectureDependencyDirectionLaw.check(ctx(dir)).passed
    ).toBe(false);
  });
  it('flags application → interface', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/application/uc.py': 'from app.interface.schemas import Dto\n\nclass UC:\n    pass\n',
    });
    expect(
      CleanArchitectureDependencyDirectionLaw.check(ctx(dir)).passed
    ).toBe(false);
  });
  it('passes inward imports (application → domain)', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/domain/order.py': 'class Order:\n    pass\n',
      'src/app/application/uc.py': 'from app.domain.order import Order\n\nclass CreateOrder:\n    pass\n',
    });
    expect(
      CleanArchitectureDependencyDirectionLaw.check(ctx(dir)).passed
    ).toBe(true);
  });
});

describe('NoWebFrameworkOutsideInterfaceLaw', () => {
  it('flags the web framework imported in the application layer', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/application/handlers.py': 'from fastapi import HTTPException\n\nclass H:\n    pass\n',
    });
    expect(NoWebFrameworkOutsideInterfaceLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('flags the web framework in the infrastructure layer', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/infrastructure/gw.py': 'import starlette\n\nclass G:\n    pass\n',
    });
    expect(NoWebFrameworkOutsideInterfaceLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('allows the web framework in the interface layer and ORMs in infrastructure', () => {
    const dir = fixture({
      'pyproject.toml': FASTAPI,
      'src/app/api/routes.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n',
      'src/app/infrastructure/db.py': 'import sqlalchemy\n\nclass Repo:\n    pass\n',
    });
    expect(NoWebFrameworkOutsideInterfaceLaw.check(ctx(dir)).passed).toBe(true);
  });
});
