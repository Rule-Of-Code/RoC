/**
 * Tests for WebStorageEncapsulationLaw (v7.2.0 hygiene batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WebStorageEncapsulationLaw } from '../../../src/checkers/code-quality-laws/web-storage-encapsulation';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-store-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
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
const ctx = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'generic' },
      ignores: { global: [], tests: ['**/*.spec.ts'], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: [] },
      excludes: {},
      reporting: {
        format: 'console',
        verbose: false,
        onlyFailures: false,
        scoring: false,
      },
      performance: { parallel: false, maxConcurrent: 3, cache: false },
      thresholds: {},
    },
  }) as LawCheckContext;

describe('WebStorageEncapsulationLaw', () => {
  it('flags localStorage/sessionStorage access outside a service', () => {
    const dir = fixture({
      'a.component.ts':
        "export class A { f() { localStorage.setItem('k','v'); } }\n",
    });
    expect(WebStorageEncapsulationLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('allows web storage inside a *.service.ts', () => {
    const dir = fixture({
      'store.service.ts':
        "export class S { get() { return localStorage.getItem('k'); } }\n",
    });
    expect(WebStorageEncapsulationLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores web storage mentioned in comments', () => {
    const dir = fixture({
      'c.ts': '// do not call localStorage.setItem here\nexport const x = 1;\n',
    });
    expect(WebStorageEncapsulationLaw.check(ctx(dir)).passed).toBe(true);
  });
});
