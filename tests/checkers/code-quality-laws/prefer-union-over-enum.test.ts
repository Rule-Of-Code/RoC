/**
 * Tests for PreferUnionOverEnumLaw (v7.2.0 TypeScript-safety batch).
 * Real temp-dir fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PreferUnionOverEnumLaw } from '../../../src/checkers/code-quality-laws/prefer-union-over-enum';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-enum-'));
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

const ctx = (
  root: string,
  thresholds: RuleOfCodeConfig['thresholds'] = {}
): LawCheckContext =>
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
      thresholds,
    },
  }) as LawCheckContext;

const joined = (r: { violations?: string[] }): string =>
  (r.violations ?? []).join(' || ');

describe('PreferUnionOverEnumLaw', () => {
  it('flags a plain enum declaration', () => {
    const dir = fixture({ 'a.ts': 'export enum Color { Red, Green }\n' });
    const result = PreferUnionOverEnumLaw.check(ctx(dir));
    expect(result.passed).toBe(false);
    expect(joined(result)).toContain('a.ts');
    expect(joined(result)).toContain('Color');
  });

  it('does NOT flag a string-union literal type', () => {
    const dir = fixture({ 'u.ts': "export type Side = 'long' | 'short';\n" });
    expect(PreferUnionOverEnumLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('allows an enum with a // roc-allow-enum justification (same or prev line)', () => {
    const dir = fixture({
      'inline.ts': 'export enum A { X } // roc-allow-enum\n',
      'above.ts': '// roc-allow-enum runtime iteration\nexport enum B { Y }\n',
    });
    expect(PreferUnionOverEnumLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('ignores the justification when allowEnumWithJustification is false', () => {
    const dir = fixture({ 'a.ts': '// roc-allow-enum\nexport enum E { A }\n' });
    const result = PreferUnionOverEnumLaw.check(
      ctx(dir, { typescript: { allowEnumWithJustification: false } })
    );
    expect(result.passed).toBe(false);
    expect(joined(result)).toContain('a.ts');
  });

  it('does NOT flag the word enum inside a comment', () => {
    const dir = fixture({
      'c.ts': '// we deliberately avoid enum here\nexport const x = 1;\n',
    });
    expect(PreferUnionOverEnumLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('returns a well-formed LawResult', () => {
    const dir = fixture({ 'ok.ts': 'export const x = 1;\n' });
    const result = PreferUnionOverEnumLaw.check(ctx(dir));
    expect(typeof result.passed).toBe('boolean');
    expect(Array.isArray(result.violations)).toBe(true);
    expect(result.score).toBe(100);
  });
});
