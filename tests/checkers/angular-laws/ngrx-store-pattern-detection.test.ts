/**
 * v7.2.2 detection-quality: confirms NgRx Store Pattern actually detects
 * non-canonical store files (it was previously untested, hence "unverified").
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../../src/data/enhanced-laws';
import { FileUtils } from '../../../src/utils/file-utils';

const LAW = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
  l => l.title === 'NgRx Store Pattern Mandate (SACRED LAW)'
)!;

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-sp-'));
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

describe('NgRx Store Pattern detection (v7.2.2)', () => {
  it('flags non-canonical store files (no createAction/createReducer/interface)', async () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'angular.json': '{}',
      'src/app/store/app.state.ts': 'export const initialState = { items: [] };\n',
      'src/app/store/app.actions.ts': "export const load = () => ({ type: 'load' });\n",
      'src/app/store/app.reducer.ts': 'export function reducer(s: any) { return s; }\n',
    });
    const r = await run(dir);
    expect(r.passed).toBe(false);
  });

  it('passes a canonical NgRx store', async () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'angular.json': '{}',
      'src/app/store/app.state.ts': 'export interface AppState { items: string[]; }\n',
      'src/app/store/app.actions.ts': "import { createAction, props } from '@ngrx/store';\nexport const load = createAction('[App] Load', props<{ id: string }>());\n",
      'src/app/store/app.reducer.ts': "import { createReducer, on } from '@ngrx/store';\nexport const reducer = createReducer({ items: [] }, on(null as any, s => s));\n",
      'src/app/store/app.selectors.ts': "import { createFeatureSelector, createSelector } from '@ngrx/store';\nexport const f = createFeatureSelector('f');\nexport const getItems = createSelector(f, (s: any) => s.items);\n",
    });
    const r = await run(dir);
    expect(r.passed).toBe(true);
  });
});
