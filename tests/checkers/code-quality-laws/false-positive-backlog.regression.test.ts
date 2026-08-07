/**
 * Regression tests for the v7.1.0 code-quality false-positive backlog.
 *
 * Real temp-dir fixtures (no mocks) covering:
 *   #4 magic-number — comments + Tailwind/CSS utility numbers ignored, real literals flagged
 *   #5 code-complexity — identifiers/optional-chaining not counted; line limit configurable
 *   #6 code-documentation — denominator counts declarations, not call-expressions
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { CodeComplexityControlLaw } from '../../../src/checkers/code-quality-laws/code-complexity-control';
import { CodeDocumentationLaw } from '../../../src/checkers/code-quality-laws/code-documentation';
import { MagicNumberPreventionLaw } from '../../../src/checkers/code-quality-laws/magic-number-prevention';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const dirs: string[] = [];
function fixture(filename: string, content: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cq-'));
  dirs.push(dir);
  fs.writeFileSync(path.join(dir, filename), content);
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

const config = (
  root: string,
  thresholds: RuleOfCodeConfig['thresholds'] = {}
): RuleOfCodeConfig =>
  ({
    project: { name: 't', root, componentPrefix: 'app', type: 'generic' },
    ignores: { global: [], tests: [], build: [], design: [] },
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
  }) as RuleOfCodeConfig;
const ctx = (
  root: string,
  thresholds?: RuleOfCodeConfig['thresholds']
): LawCheckContext => ({ projectRoot: root, config: config(root, thresholds) });

function reportedMagicNumbers(violations: string[] | undefined): Set<string> {
  return new Set(
    (violations ?? [])
      .filter(v => v.startsWith('Magic numbers in'))
      .flatMap(v => (v.split(':')[1] ?? '').split(',').map(s => s.trim()))
  );
}

describe('Magic Number Prevention — comments + Tailwind ignored (#4)', () => {
  it('ignores digits in comments and Tailwind/CSS classes, flags real literals', () => {
    const root = fixture(
      'a.ts',
      [
        '// retry after 400 milliseconds, see ticket 12345',
        '/* legacy timeout was 999 here */',
        "const cls = 'bg-neutral-950 text-gray-700 gap-4 grid-cols-12';",
        'function f() { return doStuff() * 86400; }',
      ].join('\n')
    );
    const reported = reportedMagicNumbers(
      MagicNumberPreventionLaw.check(ctx(root)).violations
    );
    expect(reported.has('400')).toBe(false); // comment
    expect(reported.has('12345')).toBe(false); // comment
    expect(reported.has('999')).toBe(false); // block comment
    expect(reported.has('950')).toBe(false); // tailwind shade
    expect(reported.has('700')).toBe(false); // tailwind shade
    expect(reported.has('86400')).toBe(true); // genuine magic literal
  });
});

describe('Code Complexity Control — accurate counting + configurable limit (#5)', () => {
  it('does not count identifiers / optional-chaining as decision points', () => {
    const root = fixture(
      'b.ts',
      [
        'export function g(items, cfg) {',
        '  items.forEach(x => notify(x));', // forEach/notify contain for/if substrings
        '  const a = cfg?.a ?? 0;', // ?. and ?? — not ternaries
        '  const b = obj?.b?.c ?? fallback;',
        '  if (a) { return classifier(b); }', // ONE real if; classifier contains "if"
        '  return a;',
        '}',
      ].join('\n')
    );
    const result = CodeComplexityControlLaw.check(
      ctx(root, { codeQuality: { minFunctionComplexity: 5, maxFileLines: 300 } })
    );
    expect(
      (result.violations ?? []).some(v =>
        v.includes('High complexity estimated')
      )
    ).toBe(false);
  });

  it('honours a configurable maxFileLines threshold', () => {
    const root = fixture(
      'c.ts',
      Array.from({ length: 40 }, (_, i) => `const x${i} = ${i};`).join('\n')
    );
    const result = CodeComplexityControlLaw.check(
      ctx(root, { codeQuality: { maxFileLines: 20 } })
    );
    expect(
      (result.violations ?? []).some(
        v => v.includes('too long') && v.includes('max 20')
      )
    ).toBe(true);
  });
});

describe('Code Documentation — declarations, not call-expressions (#6)', () => {
  it('does not inflate the denominator with function calls', () => {
    const root = fixture(
      'svc.ts',
      [
        '/** Service. */',
        'export class Svc {',
        '  /** does a. */',
        '  public doA(): void {',
        '    helperOne(); helperTwo(); helperThree(); this.doB();',
        '    [1, 2, 3].map(n => n).filter(n => n);',
        '  }',
        '  /** does b. */',
        '  private doB(): number { return compute(42); }',
        '}',
      ].join('\n')
    );
    const result = CodeDocumentationLaw.check(ctx(root));
    expect(
      (result.violations ?? []).some(v =>
        v.includes('Function documentation coverage')
      )
    ).toBe(false);
  });
});

describe('Magic Number Prevention — named-constant declarations (v7.1.1, FE flag)', () => {
  function listed(violations: string[] | undefined): Set<string> {
    return new Set(
      (violations ?? [])
        .filter(v => v.startsWith('Magic numbers in'))
        .flatMap(v => (v.split(':')[1] ?? '').split(',').map(s => s.trim()))
    );
  }

  it('does NOT flag a literal that is the RHS of its own const/let declaration', () => {
    // Long SCREAMING_CASE names previously pushed `const` outside the context
    // window, so the very fix for magic numbers (naming them) got flagged.
    const root = fixture(
      'consts.ts',
      [
        'const SLIDE_OUT_MS = 430;',
        'const THIRD_BURST_MS = 1200;',
        'const slideOutMs = 777;',
      ].join('\n')
    );
    const reported = listed(MagicNumberPreventionLaw.check(ctx(root)).violations);
    expect(reported.has('430')).toBe(false);
    expect(reported.has('1200')).toBe(false);
    expect(reported.has('777')).toBe(false);
  });

  it('STILL flags inline literals (incl. on a line containing "export")', () => {
    // Regression guard: full-line context once let "exPORT" match /port.*\d+/i and
    // wrongly exempt the inline literal.
    const root = fixture(
      'inline.ts',
      'export function f(n) { return n * 8642 + compute(9173); }'
    );
    const reported = listed(MagicNumberPreventionLaw.check(ctx(root)).violations);
    expect(reported.has('8642')).toBe(true);
    expect(reported.has('9173')).toBe(true);
  });
});
