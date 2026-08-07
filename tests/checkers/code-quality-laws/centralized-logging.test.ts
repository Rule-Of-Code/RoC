/**
 * Tests for CentralizedLoggingLaw (v7.2.0 hygiene batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CentralizedLoggingLaw } from '../../../src/checkers/code-quality-laws/centralized-logging';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-log-'));
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
const V = (r: { violations?: string[] }): string =>
  (r.violations ?? []).join(' || ');

describe('CentralizedLoggingLaw', () => {
  it('flags direct console.* calls in app code', () => {
    const dir = fixture({
      'a.component.ts':
        "export class A { f() { console.log('x'); console.error('y'); } }\n",
    });
    expect(CentralizedLoggingLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('allows console.* in logger.service.ts and main.ts', () => {
    const dir = fixture({
      'logger.service.ts': "export class L { log() { console.log('ok'); } }\n",
      'main.ts': "console.log('boot');\n",
    });
    expect(CentralizedLoggingLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores console in comments', () => {
    const dir = fixture({
      'c.ts': '// remember to remove console.log here\nexport const x = 1;\n',
    });
    expect(CentralizedLoggingLaw.check(ctx(dir)).passed).toBe(true);
  });
});
