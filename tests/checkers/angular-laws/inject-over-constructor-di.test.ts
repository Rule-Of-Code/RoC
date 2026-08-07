/**
 * Tests for InjectOverConstructorDiLaw (v7.2.0 modern-Angular batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { InjectOverConstructorDiLaw } from '../../../src/checkers/angular-laws/inject-over-constructor-di';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-inj-'));
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

describe('InjectOverConstructorDiLaw', () => {
  it('flags constructor parameter-property DI', () => {
    const dir = fixture({
      'a.component.ts':
        'export class A { constructor(private http: X, public y: Y) {} }\n',
    });
    expect(InjectOverConstructorDiLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes inject()-based DI and a plain empty constructor', () => {
    const dir = fixture({
      'ok.component.ts':
        'export class B { private http = inject(X); constructor() {} }\n',
    });
    expect(InjectOverConstructorDiLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does NOT flag a constructor with plain (non-modifier) params', () => {
    const dir = fixture({
      'p.component.ts': 'export class C { constructor(value: number) {} }\n',
    });
    expect(InjectOverConstructorDiLaw.check(ctx(dir)).passed).toBe(true);
  });
});
