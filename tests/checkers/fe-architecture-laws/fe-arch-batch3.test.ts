/**
 * FE Architecture laws — batch 3 (ROC-FE-06/07/09/11), B-tier / warn-first.
 * Regex/string; gated on Angular (stack: frontend). Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DefensiveArrayCoercionLaw } from '../../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoPassthroughCastLaw } from '../../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { NoRiskLiteralsLaw } from '../../../src/checkers/fe-architecture-laws/no-risk-literals';
import { TimerCleanupLaw } from '../../../src/checkers/fe-architecture-laws/timer-cleanup';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const NG = {
  'package.json': JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } }),
  'angular.json': '{}',
};
const dirs: string[] = [];
function fixture(files: Record<string, string>, includeNg = true): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-fe3-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(includeNg ? { ...NG, ...files } : files)) {
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
const ctx = (root: string, type = 'angular'): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = type as never;
  return { projectRoot: root, config } as never;
};

describe('ROC-FE-06 Defensive Array Coercion', () => {
  it('flags an unguarded .map on a crypto Raw* envelope property', () => {
    const dir = fixture({
      'libs/a/data-access/api.ts': 'function m(r: RawStrategiesView){ return r.strategies.map(x=>x); }',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('flags ?? [] on a futures FuturesRaw* (infix) envelope property', () => {
    const dir = fixture({
      'libs/a/data-access/edge.ts': 'function m(raw: FuturesRawEdge){ return (raw.configs ?? []).map(x=>x); }',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes an Array.isArray-guarded coercion', () => {
    const dir = fixture({
      'libs/a/data-access/api.ts':
        'function m(r: RawStrategiesView){ return (Array.isArray(r.strategies) ? r.strategies : []).map(x=>x); }',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a domain→domain map (no Raw type)', () => {
    const dir = fixture({
      'libs/a/data-access/helm.ts': 'function helmJournalToTrades(entries: Trade[]){ return entries.map(x=>x); }',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-07 No Passthrough Cast', () => {
  it('flags an http.get<DomainModel> passthrough', () => {
    const dir = fixture({
      'libs/a/data-access/api.ts': 'this.http.get<StrategiesView>(url)',
    });
    expect(NoPassthroughCastLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a Raw* generic converted in a mapper', () => {
    const dir = fixture({
      'libs/a/data-access/api.ts': 'this.http.get<RawStrategiesView>(url).pipe(map(mapRawStrategies))',
    });
    expect(NoPassthroughCastLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-09 Timer Cleanup', () => {
  it('flags setInterval with no cleanup mechanism', () => {
    const dir = fixture({
      'libs/a/x.component.ts': 'class C { start(){ setInterval(()=>tick(),1000); } }',
    });
    expect(TimerCleanupLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes when DestroyRef is present', () => {
    const dir = fixture({
      'libs/a/x.component.ts': 'class C { d = inject(DestroyRef); start(){ setInterval(()=>tick(),1000); } }',
    });
    expect(TimerCleanupLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-11 No Risk Literals', () => {
  it('flags a hardcoded risk number', () => {
    const dir = fixture({ 'libs/a/x.ts': 'const equityFloor = 450;' });
    expect(NoRiskLiteralsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a risk value sourced from state, and whitelists 0/1', () => {
    const dir = fixture({ 'libs/a/x.ts': 'const equityFloor = this.state.floor();\nconst riskLevel = 0;' });
    expect(NoRiskLiteralsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('ignores $-amounts inside HTML comments (documentation, not bound values)', () => {
    const dir = fixture({
      'libs/a/x.component.html':
        '<!-- stepper стъпка $100 -->\n<div>{{ maxPosition() }}</div>\n<!-- multi\nline $250\ncomment -->\n',
    });
    expect(NoRiskLiteralsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('still flags a $-amount outside a comment, with the right line number', () => {
    const dir = fixture({
      'libs/a/x.component.html': '<!-- doc $100 -->\n<span>$450</span>\n',
    });
    const r = NoRiskLiteralsLaw.check(ctx(dir));
    expect(r.passed).toBe(false);
    expect((r.violations ?? []).some(v => /x\.component\.html:2/.test(v))).toBe(true);
  });
  it('ignores a risk assignment inside a captured/display string literal', () => {
    // A `floor = 3` inside a captured-terminal display string is text, not a
    // bound risk number. Real risk assignments are code, so this must pass.
    const dir = fixture({
      'libs/a/terminal-captures.ts': 'export const CAPTURE = `\\n  floor = 3\\n  risk = 5\\n`;',
    });
    expect(NoRiskLiteralsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('batch 3 gates off on a non-Angular project', () => {
  it('all four no-op on a Python project', () => {
    const dir = fixture(
      {
        'pyproject.toml': "[project]\nname='x'\n",
        'libs/a/data-access/api.ts': 'function m(r: RawX){ return r.items.map(x=>x); }',
        'libs/a/x.component.ts': 'setInterval(()=>{},1)',
      },
      false
    );
    const c = (): LawCheckContext => ctx(dir, 'python');
    expect(DefensiveArrayCoercionLaw.check(c()).passed).toBe(true);
    expect(NoPassthroughCastLaw.check(c()).passed).toBe(true);
    expect(TimerCleanupLaw.check(c()).passed).toBe(true);
    expect(NoRiskLiteralsLaw.check(c()).passed).toBe(true);
  });
});
