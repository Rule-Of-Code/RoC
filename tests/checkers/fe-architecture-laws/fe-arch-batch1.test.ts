/**
 * FE Architecture laws — batch 1 (ROC-FE-03/02/01) from the frontend audit.
 * Regex/string detection; gated on an Angular project (stack: frontend).
 * Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PollViaSanctionedSourceLaw } from '../../../src/checkers/fe-architecture-laws/poll-via-sanctioned-source';
import { RootServiceNoTimerLaw } from '../../../src/checkers/fe-architecture-laws/root-service-no-timer';
import { StoresInDataAccessLaw } from '../../../src/checkers/fe-architecture-laws/stores-in-data-access';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const NG = {
  'package.json': JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } }),
  'angular.json': '{}',
};
const dirs: string[] = [];
function fixture(files: Record<string, string>, includeNg = true): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-fe-'));
  dirs.push(dir);
  const all = includeNg ? { ...NG, ...files } : files;
  for (const [name, content] of Object.entries(all)) {
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
const ctx = (
  root: string,
  type = 'angular',
  thresholds?: Record<string, unknown>
): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = type as never;
  if (thresholds)
    (config as { thresholds?: Record<string, unknown> }).thresholds = thresholds;
  return { projectRoot: root, config } as never;
};

describe('ROC-FE-03 Stores In Data Access', () => {
  it('flags a *.store.ts in the feature layer', () => {
    const dir = fixture({
      'libs/bot/feature-dashboard/src/x.store.ts': 'export const x = signalStore();',
    });
    expect(StoresInDataAccessLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a store in the data-access layer', () => {
    const dir = fixture({
      'libs/bot/data-access/src/x.store.ts': 'export const x = signalStore();',
    });
    expect(StoresInDataAccessLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a re-export *.store.ts stub (no store defined)', () => {
    // A barrel that re-exports the real store — no signalStore() call — is not a
    // store definition; the old name-only check flagged it.
    const dir = fixture({
      'libs/bot/feature-dashboard/src/x.store.ts':
        "export * from '../../data-access/src/x.store';",
    });
    expect(StoresInDataAccessLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag signalStore mentioned only in a comment', () => {
    const dir = fixture({
      'libs/bot/feature-dashboard/src/note.ts':
        '// e.g. signalStore({ ... }) belongs in data-access\nexport const N = 1;',
    });
    expect(StoresInDataAccessLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe("ROC-FE-02 Root Service No Timer", () => {
  it('flags a timer inside a providedIn:root service', () => {
    const dir = fixture({
      'libs/a/data-access/src/s.service.ts':
        "@Injectable({ providedIn: 'root' })\nexport class AccountStore { t = interval(5000).pipe(); }",
    });
    expect(RootServiceNoTimerLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a non-root service with a timer', () => {
    const dir = fixture({
      'libs/a/data-access/src/s.service.ts':
        '@Injectable()\nexport class AccountStore { t = interval(5000); }',
    });
    expect(RootServiceNoTimerLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('respects the rootTimerAllowlist', () => {
    const dir = fixture({
      'libs/a/data-access/src/s.service.ts':
        "@Injectable({ providedIn: 'root' })\nexport class AppClock { t = interval(1000); }",
    });
    const c = ctx(dir, 'angular', { angular: { rootTimerAllowlist: ['AppClock'] } });
    expect(RootServiceNoTimerLaw.check(c).passed).toBe(true);
  });
  it('exempts the sanctioned tick-source files (page-visibility/poll-*)', () => {
    // FE-01 mandates this service as the poll source — FE-02 must not flag it.
    const dir = fixture({
      'libs/shared/util/src/page-visibility.service.ts':
        "@Injectable({ providedIn: 'root' })\nexport class PageVisibilityService { t = interval(1000); }",
    });
    expect(RootServiceNoTimerLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag interval() mentioned only in a comment', () => {
    const dir = fixture({
      'libs/a/data-access/src/s.service.ts':
        "@Injectable({ providedIn: 'root' })\nexport class S { f() { /* was: interval(1000) — moved to a route provider */ } }",
    });
    expect(RootServiceNoTimerLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a method named timer()/interval() (a dotted call)', () => {
    const dir = fixture({
      'libs/a/data-access/src/s.service.ts':
        "@Injectable({ providedIn: 'root' })\nexport class S { constructor(private clock: Clock) {} f() { this.clock.timer(5); } }",
    });
    expect(RootServiceNoTimerLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-01 Poll Via Sanctioned Source', () => {
  it('flags raw interval() driving an HTTP poll (switchMap + http)', () => {
    const dir = fixture({
      'libs/a/feature-x/src/c.ts':
        "readonly data = toSignal(interval(2000).pipe(startWith(0), switchMap(() => this.http.get('/strategies'))));",
    });
    expect(PollViaSanctionedSourceLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes a pollSignal-based poll', () => {
    const dir = fixture({
      'libs/a/feature-x/src/c.ts':
        'readonly data = pollSignal(() => this.api.strategies(), POLL_MS);',
    });
    expect(PollViaSanctionedSourceLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('does not flag a local countdown tick with no HTTP', () => {
    const dir = fixture({
      'libs/a/feature-x/src/countdown.ts':
        'const tick = interval(1000).pipe(map(t => 60 - t));',
    });
    expect(PollViaSanctionedSourceLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('FE architecture laws gate off on a non-Angular project', () => {
  it('all three no-op on a Python project', () => {
    const dir = fixture(
      {
        'pyproject.toml': "[project]\nname='x'\n",
        'libs/bot/feature-dashboard/src/x.store.ts': 'signalStore()',
      },
      false // no Angular markers → hasAngularProject is false
    );
    const c = (): LawCheckContext => ctx(dir, 'python');
    expect(StoresInDataAccessLaw.check(c()).passed).toBe(true);
    expect(RootServiceNoTimerLaw.check(c()).passed).toBe(true);
    expect(PollViaSanctionedSourceLaw.check(c()).passed).toBe(true);
  });
});
