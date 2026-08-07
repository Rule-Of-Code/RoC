/**
 * Revival regression: NgRx Reducers Immutability was silently dead because
 * reducer-file discovery used the compound extension ".reducer.ts", which the
 * extension matcher did not support. This proves it now detects a mutating
 * reducer end-to-end.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NgRxReducersImmutabilityProtectionLaw } from '../../../src/checkers/angular-laws/ngrx-reducers-immutability-protection';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-ngrx-imm-'));
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
const ctx = (root: string): LawCheckContext =>
  ({
    projectRoot: root,
    config: {
      project: { name: 't', root, componentPrefix: 'app', type: 'angular' },
      ignores: { global: ['**/node_modules/**'], tests: [], build: [], design: [] },
      laws: { paretoMode: false, severity: {} },
      hooks: { preCommit: false, prePush: false, commitMsg: false },
      includes: { global: ['**/*.ts'] },
      excludes: {},
      reporting: { format: 'console', verbose: false, onlyFailures: false, scoring: false },
      performance: { parallel: false, maxConcurrent: 3, cache: false },
      thresholds: {},
    },
  }) as LawCheckContext;

describe('NgRxReducersImmutabilityProtectionLaw (revival)', () => {
  it('detects direct state mutation in a *.reducer.ts file', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'src/app/store/app.reducer.ts': `import { createReducer, on } from '@ngrx/store';
export const reducer = createReducer({ items: [] as any[] },
  on({} as any, (state: any, a: any) => { state.items.push(a.x); state.count = 5; return state; }));
`,
    });
    expect(NgRxReducersImmutabilityProtectionLaw.check(ctx(dir)).passed).toBe(
      false
    );
  });

  it('passes an immutable (spread-based) reducer', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'src/app/store/clean.reducer.ts': `import { createReducer, on } from '@ngrx/store';
export const reducer = createReducer({ items: [] as any[] },
  on({} as any, (state: any, a: any) => ({ ...state, items: [...state.items, a.x] })));
`,
    });
    expect(NgRxReducersImmutabilityProtectionLaw.check(ctx(dir)).passed).toBe(
      true
    );
  });
});
