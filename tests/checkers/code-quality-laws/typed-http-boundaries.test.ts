/**
 * Tests for TypedHttpBoundariesLaw (v7.2.0 TypeScript-safety batch).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { TypedHttpBoundariesLaw } from '../../../src/checkers/code-quality-laws/typed-http-boundaries';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-http-'));
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

describe('TypedHttpBoundariesLaw', () => {
  it('flags an untyped HttpClient call', () => {
    const dir = fixture({
      'svc.ts':
        "class S { constructor(private http: HttpClient) {} load() { return this.http.get('/x'); } }\n",
    });
    const result = TypedHttpBoundariesLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(joined(result)).toContain('svc.ts');
  });

  it('does NOT flag a typed HttpClient call (generic present)', () => {
    const dir = fixture({
      'ok.ts':
        "class T { constructor(private http: HttpClient) {} load() { return this.http.get<Foo>('/x'); } }\n",
    });
    expect(TypedHttpBoundariesLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('does NOT flag a non-http .get() (e.g. Map.get)', () => {
    const dir = fixture({
      'map.ts': "const m = new Map(); const v = m.get('k');\n",
    });
    expect(TypedHttpBoundariesLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('covers post/put/patch/delete verbs', () => {
    const dir = fixture({
      'verbs.ts':
        "class V { constructor(private http: HttpClient) {} a(){return this.http.post('/x',{});} b(){return this.http.delete('/y');} }\n",
    });
    const result = TypedHttpBoundariesLaw.check(ctx(dir));
    expect(joined(result)).toContain('2');
  });
});
