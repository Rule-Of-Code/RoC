/**
 * v7.2.3: NgRx RxJS Operators now detects (low-FP) deprecated operators and
 * map() that returns an Observable (should be a flattening operator).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../../src/data/enhanced-laws';
import { FileUtils } from '../../../src/utils/file-utils';

const LAW = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
  l => l.title === 'NgRx RxJS Operators Selection Mandate'
)!;
const dirs: string[] = [];
function effectsFixture(body: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-rxop-'));
  dirs.push(dir);
  fs.mkdirSync(path.join(dir, 'src/app/store'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ dependencies: { '@ngrx/effects': '18.0.0' } })
  );
  fs.writeFileSync(path.join(dir, 'angular.json'), '{}');
  fs.writeFileSync(
    path.join(dir, 'src/app/store/x.effects.ts'),
    `import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { map, switchMap, catchError } from 'rxjs/operators';
@Injectable()
export class XEffects {
  constructor(private actions$: Actions, private api: any) {}
${body}
}
`
  );
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
function run(root: string) {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'angular';
  config.includes!.global = ['**/*.ts'];
  config.ignores!.global = ['**/node_modules/**'];
  return ModularLawsRegistry.executeLawCheck(
    LAW,
    { projectRoot: root, config } as never,
    config
  );
}

describe('NgRx RxJS Operators detection (v7.2.3)', () => {
  it('flags a deprecated operator (flatMap)', async () => {
    const dir = effectsFixture(
      `a$ = createEffect(() => this.actions$.pipe(ofType('a'), flatMap(() => this.api.get())));`
    );
    const r = await run(dir);
    expect((r.violations ?? []).some(v => v.includes('flatMap'))).toBe(true);
  });

  it('flags map() that returns an Observable (should flatten)', async () => {
    const dir = effectsFixture(
      `b$ = createEffect(() => this.actions$.pipe(ofType('b'), map(() => this.api.get())));`
    );
    const r = await run(dir);
    expect(
      (r.violations ?? []).some(v => v.includes('returns an Observable'))
    ).toBe(true);
  });

  it('does NOT flag a value-transforming map or a non-async method', async () => {
    const dir = effectsFixture(
      `c$ = createEffect(() => this.actions$.pipe(ofType('c'),
        map((a: any) => ({ type: 'ok', id: a.id })),
        switchMap(() => this.api.get().pipe(catchError(() => [])))));
      d$ = createEffect(() => this.actions$.pipe(ofType('d'),
        map((x: any) => this.formatLabel(x)),
        switchMap(() => this.api.get().pipe(catchError(() => [])))));`
    );
    const r = await run(dir);
    expect(
      (r.violations ?? []).some(
        v => v.includes('returns an Observable') || v.includes('Deprecated')
      )
    ).toBe(false);
  });
});
