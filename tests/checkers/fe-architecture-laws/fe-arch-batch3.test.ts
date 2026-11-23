/**
 * FE Architecture laws — batch 3 (ROC-FE-06/07/09/11), B-tier / warn-first.
 * Regex/string (fetch casts: syntax tree); stack: frontend, Timer Cleanup gated
 * on @angular/core by `requires`. Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DefensiveArrayCoercionLaw } from '../../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoPassthroughCastLaw } from '../../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { TimerCleanupLaw } from '../../../src/checkers/fe-architecture-laws/timer-cleanup';
import { FE_ARCHITECTURE_LAWS } from '../../../src/data/fe-architecture-laws';
import { FileUtils } from '../../../src/utils/file-utils';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import type { LawCheckContext } from '../../../src/types';

const NG = {
  'package.json': JSON.stringify({
    dependencies: { '@angular/core': '^17.0.0' },
  }),
  'angular.json': '{}',
};
const dirs: string[] = [];
function fixture(files: Record<string, string>, includeNg = true): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-fe3-'));
  dirs.push(dir);
  for (const [name, content] of Object.entries(
    includeNg ? { ...NG, ...files } : files
  )) {
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
      'libs/a/data-access/api.ts':
        'function m(r: RawStrategiesView){ return r.strategies.map(x=>x); }',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('flags ?? [] on a futures FuturesRaw* (infix) envelope property', () => {
    const dir = fixture({
      'libs/a/data-access/edge.ts':
        'function m(raw: FuturesRawEdge){ return (raw.configs ?? []).map(x=>x); }',
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
      'libs/a/data-access/helm.ts':
        'function helmJournalToTrades(entries: Trade[]){ return entries.map(x=>x); }',
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
      'libs/a/data-access/api.ts':
        'this.http.get<RawStrategiesView>(url).pipe(map(mapRawStrategies))',
    });
    expect(NoPassthroughCastLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-09 Timer Cleanup', () => {
  it('flags setInterval with no cleanup mechanism', () => {
    const dir = fixture({
      'libs/a/x.component.ts':
        'class C { start(){ setInterval(()=>tick(),1000); } }',
    });
    expect(TimerCleanupLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes when DestroyRef is present', () => {
    const dir = fixture({
      'libs/a/x.component.ts':
        'class C { d = inject(DestroyRef); start(){ setInterval(()=>tick(),1000); } }',
    });
    expect(TimerCleanupLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('batch 3 without Angular (#210)', () => {
  const nonAngular = (): string =>
    fixture(
      {
        'package.json': JSON.stringify({ dependencies: { react: '19.0.0' } }),
        'libs/a/data-access/api.ts':
          'function m(r: RawX){ return r.items.map(x=>x); }\nconst u = http.get<User>("/u");',
        'libs/a/x.component.ts': 'setInterval(()=>{},1)',
      },
      false
    );

  it('Defensive Array Coercion and No Passthrough Cast judge it (framework-neutral)', () => {
    const dir = nonAngular();
    expect(DefensiveArrayCoercionLaw.check(ctx(dir, 'react')).passed).toBe(
      false
    );
    expect(NoPassthroughCastLaw.check(ctx(dir, 'react')).passed).toBe(false);
  });

  it('Timer Cleanup is not selected: its requires asks for @angular/core', () => {
    const card = FE_ARCHITECTURE_LAWS.find(
      law => law.title === 'Timer Cleanup'
    );
    expect(card?.requires).toEqual({ anyDependency: ['@angular/core'] });
    expect(lawRequirementsMet(card?.requires, nonAngular())).toBe(false);
    expect(lawRequirementsMet(card?.requires, fixture({}))).toBe(true);
  });
});
