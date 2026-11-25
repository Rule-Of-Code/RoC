/**
 * #43, package 4 — the code-quality laws said how many ("2 occurrence(s)",
 * "Magic numbers in x: 42, 3.14", "worst function 14") and never where. Each
 * law already held what it counted; `violationDetails` now carries it, one
 * detail per occurrence at its line where the law has the position. The
 * violation lines, verdicts and scores stay as they were.
 */
import fs from 'fs';
import path from 'path';

import { CentralizedLoggingLaw } from '../../../src/checkers/code-quality-laws/centralized-logging';
import { CodeComplexityControlLaw } from '../../../src/checkers/code-quality-laws/code-complexity-control';
import { ErrorHandlingCompletenessLaw } from '../../../src/checkers/code-quality-laws/error-handling-completeness';
import { MagicNumberPreventionLaw } from '../../../src/checkers/code-quality-laws/magic-number-prevention';
import { NoDoubleCastLaw } from '../../../src/checkers/code-quality-laws/no-double-cast';
import { NoExplicitAnyNonNullLaw } from '../../../src/checkers/code-quality-laws/no-explicit-any-non-null';
import { WebStorageEncapsulationLaw } from '../../../src/checkers/code-quality-laws/web-storage-encapsulation';
import { ZeroToleranceStrictLaw } from '../../../src/checkers/code-quality-laws/zero-tolerance-strict';
import type { LawCheckContext, LawResult } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils';
import { makeTempDir } from '../../helpers/temp-dirs';

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

function project(files: Record<string, string>): LawCheckContext {
  const root = makeTempDir('roc-vd43-cq-');
  for (const [rel, content] of Object.entries(files)) {
    const at = path.join(root, rel);
    fs.mkdirSync(path.dirname(at), { recursive: true });
    fs.writeFileSync(at, content);
  }
  return { projectRoot: root, config: FileUtils.getMinimalDefaultConfig() };
}

const PACKAGE = JSON.stringify({ name: 'app', version: '1.0.0' });

describe('#43 code-quality laws name what they counted', () => {
  it('No Double Cast: each cast at its line', () => {
    const result = NoDoubleCastLaw.check(
      project({
        'package.json': PACKAGE,
        'src/cast.ts': lines(
          'export const a: number = 1;',
          'export const b = a as unknown as string;',
          'export const c = a as unknown as boolean;'
        ),
      })
    );
    expect(result.violations).toEqual([
      'Double cast (as unknown as) in src/cast.ts: 2 occurrence(s) — launders the type and defeats checking. Model the real type or validate at the boundary.',
    ]);
    expect(result.violationDetails).toEqual([
      { file: 'src/cast.ts', line: 2, message: 'double cast `as unknown as`' },
      { file: 'src/cast.ts', line: 3, message: 'double cast `as unknown as`' },
    ]);
  });

  it('No Explicit Any / Non-Null Assertion: each weak type and each `!` at its line', () => {
    const result = NoExplicitAnyNonNullLaw.check(
      project({
        'package.json': PACKAGE,
        'src/weak.ts': lines(
          'export function run(cb: Function): void { cb(); }',
          "export const first = ['a'].find(v => v)!.length;"
        ),
      })
    );
    expect(result.violations).toHaveLength(2);
    expect(result.violationDetails).toEqual([
      {
        file: 'src/weak.ts',
        line: 1,
        message: 'explicit any / weak type `: Function`',
      },
      { file: 'src/weak.ts', line: 2, message: 'non-null assertion `!`' },
    ]);
  });

  it('Absolute Zero Tolerance: each occurrence of each count, and the tsconfig it read', () => {
    const result = ZeroToleranceStrictLaw.check(
      project({
        'package.json': PACKAGE,
        'tsconfig.json': JSON.stringify({ compilerOptions: { strict: false } }),
        'src/zt.ts': lines(
          "console.log('start');",
          '// TODO: remove',
          'export function g(v: any): void {',
          '  // eslint-disable-next-line no-console',
          '  try { g(1); } catch (e) {}',
          '}'
        ),
      })
    );
    expect(result.violations).toEqual([
      'TypeScript strict mode not enabled',
      'Console statements found in src/zt.ts: 1 occurrences',
      'TODO/FIXME comments found in src/zt.ts: 1 occurrences',
      'Strict type violations in src/zt.ts: 1 occurrences',
      'ESLint rules disabled in src/zt.ts: 1 occurrences',
      'Empty catch blocks in src/zt.ts: 1 occurrences',
    ]);
    expect(result.violationDetails).toEqual([
      {
        file: 'tsconfig.json',
        message:
          'compilerOptions.strict is not on (its "extends" chain merged)',
      },
      { file: 'src/zt.ts', line: 1, message: 'console statement' },
      { file: 'src/zt.ts', line: 2, message: 'TODO/FIXME comment' },
      { file: 'src/zt.ts', line: 3, message: 'explicit any' },
      { file: 'src/zt.ts', line: 4, message: 'eslint-disable comment' },
      { file: 'src/zt.ts', line: 5, message: 'empty catch block' },
    ]);
  });

  it('Centralized Logging: each console call and each print() at its line', () => {
    const result = CentralizedLoggingLaw.check(
      project({
        'package.json': PACKAGE,
        'src/orders.ts': lines(
          'export const n = 1;',
          "console.log('a');",
          "console . warn('b');"
        ),
        'app/service.py': lines('import os', 'print("x")'),
      })
    );
    expect(result.violations).toEqual([
      'src/orders.ts: 2 direct console.* call(s) — route logging through the logger service.',
      'app/service.py: 1 print() call(s) — use the logging module.',
    ]);
    expect(result.violationDetails).toEqual([
      { file: 'src/orders.ts', line: 2, message: 'direct console.log(…) call' },
      {
        file: 'src/orders.ts',
        line: 3,
        message: 'direct console.warn(…) call',
      },
      { file: 'app/service.py', line: 2, message: 'print() call' },
    ]);
  });

  it('Web Storage Encapsulation: each call at its own line, after a block comment', () => {
    const result = WebStorageEncapsulationLaw.check(
      project({
        'package.json': PACKAGE,
        'src/page.ts': lines(
          '/* a comment',
          '   over two lines */',
          "localStorage.setItem('k', 'v');",
          "export const v = sessionStorage.getItem('k');"
        ),
        'src/storage.service.ts': 'localStorage.clear();\n',
      })
    );
    expect(result.violations).toEqual([
      'src/page.ts: 2 direct localStorage/sessionStorage call(s) — wrap web storage in a *.service.ts.',
    ]);
    expect(result.violationDetails).toEqual([
      {
        file: 'src/page.ts',
        line: 3,
        message: 'direct web storage call localStorage.setItem(…)',
      },
      {
        file: 'src/page.ts',
        line: 4,
        message: 'direct web storage call sessionStorage.getItem(…)',
      },
    ]);
  });

  it('Error Handling Completeness: each dropped promise at its line; an unguarded HTTP file', () => {
    const result = ErrorHandlingCompletenessLaw.check(
      project({
        'package.json': PACKAGE,
        'src/eh.ts': lines(
          'async function load(): Promise<void> {}',
          'export function start(): void {',
          '  load();',
          '}'
        ),
        'src/http.ts': lines("export const get = () => fetch('/x');"),
      })
    );
    expect(result.violationDetails).toEqual([
      {
        file: 'src/eh.ts',
        line: 3,
        message: 'promise neither awaited, returned nor caught',
      },
      {
        file: 'src/http.ts',
        message: 'HTTP requests in a file with no try {} and no .catch()',
      },
    ]);
  });

  it('Magic Number Prevention: every literal behind the five the line shows, at its line', () => {
    const result = MagicNumberPreventionLaw.check(
      project({
        'package.json': PACKAGE,
        'src/mn.ts': lines(
          'export const f = (x: number): number => x * 42;',
          'export const g = (y: number): number => y + 42 + 3.14;'
        ),
      })
    );
    expect(result.violations).toEqual(['Magic numbers in src/mn.ts: 42, 3.14']);
    expect(result.violationDetails).toEqual([
      { file: 'src/mn.ts', line: 1, message: 'magic number 42' },
      { file: 'src/mn.ts', line: 2, message: 'magic number 42' },
      { file: 'src/mn.ts', line: 2, message: 'magic number 3.14' },
    ]);
  });

  it('Code Complexity Control: each function over the limit at its line', () => {
    const branches = Array.from(
      { length: 11 },
      (_, i) => `  if (n === ${i + 20}) return ${i};`
    );
    const result = CodeComplexityControlLaw.check(
      project({
        'package.json': PACKAGE,
        'src/cc.ts': lines(
          'export const simple = (): number => 1;',
          'export function branchy(n: number): number {',
          ...branches,
          '  return -1;',
          '}'
        ),
      })
    );
    expect(result.violations).toEqual([
      'Function complexity too high in src/cc.ts (worst function 12, max 10)',
    ]);
    expect(result.violationDetails).toEqual([
      {
        file: 'src/cc.ts',
        line: 2,
        message: 'function of complexity 12 (max 10)',
      },
    ]);
  });

  it('control: a clean file gives no details', () => {
    const clean = project({
      'package.json': PACKAGE,
      'src/ok.ts': lines('export const ok = (a: number): number => a + 1;'),
    });
    const results: LawResult[] = [
      NoDoubleCastLaw.check(clean),
      NoExplicitAnyNonNullLaw.check(clean),
      WebStorageEncapsulationLaw.check(clean),
      CentralizedLoggingLaw.check(clean),
      MagicNumberPreventionLaw.check(clean),
      CodeComplexityControlLaw.check(clean),
    ];
    for (const result of results) {
      expect(result.violationDetails).toBeUndefined();
    }
  });
});
