/**
 * Tests for NoDoubleCastLaw (v7.2.0 TypeScript-safety batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NoDoubleCastLaw } from '../../../src/checkers/code-quality-laws/no-double-cast';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-dcast-'));
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
const joined = (r: { violations?: string[] }): string =>
  (r.violations ?? []).join(' || ');

describe('NoDoubleCastLaw', () => {
  it('flags `as unknown as T` double casts', () => {
    const dir = fixture({ 'a.ts': 'const x = val as unknown as Foo;\n' });
    const result = NoDoubleCastLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(joined(result)).toContain('a.ts');
  });

  it('does NOT flag a single legitimate cast', () => {
    const dir = fixture({ 'ok.ts': 'const y = val as Foo;\n' });
    expect(NoDoubleCastLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('does NOT flag a double cast that appears in a comment', () => {
    const dir = fixture({
      'c.ts': '// avoid val as unknown as Foo\nexport const z = 1;\n',
    });
    expect(NoDoubleCastLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('counts multiple occurrences in one file', () => {
    const dir = fixture({
      'm.ts': 'const a = x as unknown as A;\nconst b = y as unknown as B;\n',
    });
    const result = NoDoubleCastLaw.check(ctx(dir));
    expect(joined(result)).toContain('2 occurrence');
  });
});
