/**
 * Tests for the v7.2.0 template / performance / NgRx law batch (Laws 1,2,13,16,17,19).
 * Real temp-dir fixtures (no mocks).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AliasRepeatedTemplateExpressionsLaw } from '../../../src/checkers/angular-laws/alias-repeated-template-expressions';
import { DeclarativeReadSubscriptionsLaw } from '../../../src/checkers/angular-laws/declarative-read-subscriptions';
import { DeferHeavyBlocksLaw } from '../../../src/checkers/angular-laws/defer-heavy-blocks';
import { NoMethodCallsInTemplatesLaw } from '../../../src/checkers/angular-laws/no-method-calls-in-templates';
import { NoSubscribeInEffectLaw } from '../../../src/checkers/angular-laws/no-subscribe-in-effect';
import { SideEffectsInNgrxEffectsLaw } from '../../../src/checkers/angular-laws/side-effects-in-ngrx-effects';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-tpn-'));
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

describe('NoMethodCallsInTemplatesLaw', () => {
  const TS = `import { Component, signal, computed } from '@angular/core';
@Component({ selector: 'app-a', templateUrl: './a.component.html' })
export class A {
  rows = signal<unknown[]>([]);
  total = computed(() => 1);
  format(x: string) { return x; }
  isLong(s: string) { return s === 'long'; }
}
`;
  it('flags component method calls, not signal/computed calls', () => {
    const dir = fixture({
      'a.component.ts': TS,
      'a.component.html':
        "<span>{{ format(x) }}</span>\n<b [class]=\"isLong(s) ? 'w' : 'l'\">{{ rows() }} {{ total() }}</b>\n",
    });
    const result = NoMethodCallsInTemplatesLaw.check(ctx(dir));
    const v = (result.violations ?? []).join(' || ');
    expect(result.passed).toBe(false);
    expect(v).toContain('format()');
    expect(v).toContain('isLong()');
    expect(v).not.toContain('rows()');
    expect(v).not.toContain('total()');
  });
  it('does not flag method calls in event bindings', () => {
    const dir = fixture({
      'c.component.ts':
        "import { Component } from '@angular/core';\n@Component({ selector: 'app-c', templateUrl: './c.component.html' })\nexport class C {\n  save() {}\n}\n",
      'c.component.html': '<button (click)="save()">Save</button>\n',
    });
    expect(NoMethodCallsInTemplatesLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('SideEffectsInNgrxEffectsLaw', () => {
  it('flags long-lived stream subscribed in a component and dispatch-in-subscribe', () => {
    const dir = fixture({
      'a.component.ts':
        'export class A {\n  ngOnInit() { interval(1000).subscribe(() => {}); }\n  save() { this.api.x().subscribe(() => this.store.dispatch(y())); }\n}\n',
    });
    const v = (SideEffectsInNgrxEffectsLaw.check(ctx(dir)).violations ?? []).join(
      ' || '
    );
    expect(v.toLowerCase()).toContain('long-lived');
    expect(v.toLowerCase()).toContain('dispatch');
  });
  it('passes a declarative component', () => {
    const dir = fixture({
      'b.component.ts':
        'export class B { ngOnInit() { this.store.dispatch(start()); } }\n',
    });
    expect(SideEffectsInNgrxEffectsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('NoSubscribeInEffectLaw', () => {
  it('flags .subscribe() inside effect()', () => {
    const dir = fixture({
      'a.component.ts':
        'export class A { x = effect(() => { this.api.load().subscribe(() => {}); }); }\n',
    });
    expect(NoSubscribeInEffectLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a plain effect()', () => {
    const dir = fixture({
      'b.component.ts':
        'export class B { x = effect(() => { this.log(this.sig()); }); }\n',
    });
    expect(NoSubscribeInEffectLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('DeclarativeReadSubscriptionsLaw', () => {
  it('flags a subscribe callback that only sets a signal', () => {
    const dir = fixture({
      'a.component.ts':
        'export class A { ngOnInit() { this.api.get().subscribe(v => this.data.set(v)); } }\n',
    });
    expect(DeclarativeReadSubscriptionsLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a multi-statement subscribe callback', () => {
    const dir = fixture({
      'b.component.ts':
        'export class B { f() { this.api.get().subscribe(v => { this.process(v); this.log(v); }); } }\n',
    });
    expect(DeclarativeReadSubscriptionsLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('DeferHeavyBlocksLaw', () => {
  it('flags a large dashboard template without @defer', () => {
    const big = Array.from({ length: 300 }, (_, i) => `<div>row ${i}</div>`).join(
      '\n'
    );
    const dir = fixture({ 'x-dashboard.component.html': big });
    expect(DeferHeavyBlocksLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a dashboard that uses @defer', () => {
    const dir = fixture({
      'y-dashboard.component.html':
        '<div>@defer (on viewport) { <app-chart /> }</div>\n',
    });
    expect(DeferHeavyBlocksLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('AliasRepeatedTemplateExpressionsLaw', () => {
  it('flags an expression repeated at/above the threshold', () => {
    const dir = fixture({
      'a.component.html':
        '<a>{{ isLong(h.side) }}</a><b>{{ isLong(h.side) }}</b><c>{{ isLong(h.side) }}</c>\n',
    });
    expect(AliasRepeatedTemplateExpressionsLaw.check(ctx(dir)).passed).toBe(
      false
    );
  });
  it('passes when under the threshold', () => {
    const dir = fixture({
      'b.component.html': '<a>{{ isLong(h.side) }}</a><b>{{ other() }}</b>\n',
    });
    expect(AliasRepeatedTemplateExpressionsLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not count CSS functions (url/calc/rgba) or plain HTML as expressions', () => {
    // These are in inline styles / plain attributes, not Angular bindings — the
    // old raw-HTML scan flagged url() ×3 as a "repeated template expression".
    const dir = fixture({
      'c.component.html':
        '<div style="background:url(x.png)"></div>' +
        '<div style="background:url(x.png)"></div>' +
        '<div style="width:calc(100% - 10px)"></div>' +
        '<div style="width:calc(100% - 10px)"></div>' +
        '<div style="width:calc(100% - 10px)"></div>\n',
    });
    expect(AliasRepeatedTemplateExpressionsLaw.check(ctx(dir)).passed).toBe(true);
  });
});
