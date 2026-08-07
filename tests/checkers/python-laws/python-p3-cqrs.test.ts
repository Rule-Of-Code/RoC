/**
 * P3 — CQRS: queries are read-only, commands/queries are data messages.
 * Real temp Python fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CommandsQueriesAreMessagesLaw } from '../../../src/checkers/python-laws/commands-queries-are-messages';
import { QueriesAreReadOnlyLaw } from '../../../src/checkers/python-laws/queries-are-read-only';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const PY = "[project]\nname='x'\n";
const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-p3-'));
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

describe('QueriesAreReadOnlyLaw', () => {
  it('flags a persistence write in a query handler', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/application/order_queries.py': 'class GetOrdersQueryHandler:\n    def handle(self, q):\n        self.repo.save(x)\n        return self.repo.all()\n',
    });
    expect(QueriesAreReadOnlyLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a read-only query handler', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/application/order_queries.py': 'class GetOrdersQueryHandler:\n    def handle(self, q):\n        return self.repo.all()\n',
    });
    expect(QueriesAreReadOnlyLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a write in a command handler', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/application/order_commands.py': 'class CreateOrderHandler:\n    def handle(self, c):\n        self.repo.save(c)\n',
    });
    expect(QueriesAreReadOnlyLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('CommandsQueriesAreMessagesLaw', () => {
  it('flags a plain Command class', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/application/commands.py': 'class CreateOrderCommand:\n    def __init__(self, id):\n        self.id = id\n',
    });
    expect(CommandsQueriesAreMessagesLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes dataclass/Pydantic messages and ignores handlers', () => {
    const dir = fixture({
      'pyproject.toml': PY,
      'src/app/application/commands.py': 'from dataclasses import dataclass\nfrom pydantic import BaseModel\n\n@dataclass(frozen=True)\nclass CreateOrderCommand:\n    id: str\n\nclass GetOrderQuery(BaseModel):\n    id: str\n\nclass CreateOrderCommandHandler:\n    def handle(self, c):\n        ...\n',
    });
    expect(CommandsQueriesAreMessagesLaw.check(ctx(dir)).passed).toBe(true);
  });
});
