/**
 * Tests for NoExplicitAnyNonNullLaw (v7.2.0 TypeScript-safety batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NoExplicitAnyNonNullLaw } from '../../../src/checkers/code-quality-laws/no-explicit-any-non-null';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-any-'));
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

describe('NoExplicitAnyNonNullLaw', () => {
  it('flags explicit any forms (annotation, as any, any[])', () => {
    const dir = fixture({
      'a.ts': 'const x = res as any;\nlet y: any = 1;\nconst arr: any[] = [];\n',
    });
    const result = NoExplicitAnyNonNullLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(joined(result).toLowerCase()).toContain('any');
  });

  it('flags non-null assertions but NOT `!=` / logical `!`', () => {
    const dir = fixture({
      'nn.ts': "const v = form.get('k')!.value;\nconst arr = list[0]!.id;\n",
      'ok.ts': 'const a = x !== y;\nconst b = !flag;\nif (a != b) {}\n',
    });
    const result = NoExplicitAnyNonNullLaw.check(ctx(dir));
    expect(joined(result)).toContain('nn.ts');
    expect(joined(result).toLowerCase()).toContain('non-null');
    expect(joined(result)).not.toContain('ok.ts');
  });

  it('does NOT flag `as const` or precise types', () => {
    const dir = fixture({
      'ok.ts': "const x = { a: 1 } as const;\nconst y = res as Foo;\n",
    });
    expect(NoExplicitAnyNonNullLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('does NOT flag any/`!` that appear only in comments', () => {
    const dir = fixture({
      'c.ts': '// do not use as any here, and avoid x!.y\nexport const z = 1;\n',
    });
    expect(NoExplicitAnyNonNullLaw.check(ctx(dir)).passed).toBe(true);
  });
});
