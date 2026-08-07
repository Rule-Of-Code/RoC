/**
 * Tests for FunctionalIoQueryApiLaw (v7.2.0 modern-Angular batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FunctionalIoQueryApiLaw } from '../../../src/checkers/angular-laws/functional-io-query-api';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-fio-'));
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
      project: { name: 't', root, componentPrefix: 'app', type: 'angular' },
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
const V = (r: { violations?: string[] }): string =>
  (r.violations ?? []).join(' || ');

describe('FunctionalIoQueryApiLaw', () => {
  it('flags legacy @Input/@Output/@ViewChild/@ContentChild decorators', () => {
    const dir = fixture({
      'a.component.ts':
        "export class A { @Input() x!: string; @ViewChild('y') y: unknown; }\n",
    });
    expect(FunctionalIoQueryApiLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes the functional API (input/viewChild)', () => {
    const dir = fixture({
      'ok.component.ts':
        "export class B { x = input<string>(); y = viewChild('z'); }\n",
    });
    expect(FunctionalIoQueryApiLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores decorators in comments', () => {
    const dir = fixture({
      'c.component.ts': '// migrated away from @Input()\nexport class C {}\n',
    });
    expect(FunctionalIoQueryApiLaw.check(ctx(dir)).passed).toBe(true);
  });
});
