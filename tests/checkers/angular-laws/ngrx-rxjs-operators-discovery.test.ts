/**
 * v7.2.2 detection-quality: NgRx RxJS Operators discovery was broken — it used
 * getBasename() (strips ".ts" -> "x.effects"), which failed the ".effects."
 * suffix match, so it reported "No NgRx effects files found" and never analysed
 * anything. This verifies effects files are now discovered.
 *
 * NOTE: the operator-selection analyzers themselves are still shallow; deeper
 * detection (flattening/transformation anti-patterns) is tracked as follow-up.
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
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-rxjs-'));
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

it('discovers NgRx effects files (no longer "No effects files found")', async () => {
  const dir = fixture({
    'package.json': JSON.stringify({ dependencies: { '@ngrx/effects': '18.0.0' } }),
    'angular.json': '{}',
    'src/app/store/data.effects.ts': `import { Injectable } from '@angular/core';
import { createEffect, Actions, ofType } from '@ngrx/effects';
import { switchMap } from 'rxjs/operators';
@Injectable()
export class DataEffects {
  load$ = createEffect(() => this.actions$.pipe(ofType('load'), switchMap(() => this.api.get())));
  constructor(private actions$: Actions, private api: any) {}
}
`,
  });
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'angular';
  config.includes!.global = ['**/*.ts'];
  config.ignores!.global = ['**/node_modules/**'];
  const r = await ModularLawsRegistry.executeLawCheck(
    LAW,
    { projectRoot: dir, config } as never,
    config
  );
  const suggestions = (r.suggestions ?? []).join(' ');
  expect(suggestions).not.toContain('No NgRx effects files found');
});
