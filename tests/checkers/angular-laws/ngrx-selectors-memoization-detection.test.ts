/**
 * v7.2.2 detection-quality: NgRx Selectors Memoization previously did not flag a
 * raw, non-memoized selector because its detection regex required the exact
 * parameter name "state" with no parentheses. This verifies real detection via
 * the registry execution path (how the law actually runs).
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../../src/data/enhanced-laws';
import { FileUtils } from '../../../src/utils/file-utils';

const LAW = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(
  l => l.title === 'NgRx Selectors Memoization Mandate (SACRED LAW)'
)!;

const dirs: string[] = [];
function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-sel-'));
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

describe('NgRx Selectors Memoization detection (v7.2.2)', () => {
  it('flags a raw, non-memoized selector (any param name / parens)', async () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'angular.json': '{}',
      'src/app/store/app.selectors.ts': `import { createFeatureSelector } from '@ngrx/store';
export const f = createFeatureSelector('f');
export const getItems = (s) => s.f.items.filter((x: any) => x.active);
`,
    });
    const r = await run(dir);
    expect(r.passed).toBe(false);
  });

  it('passes selectors built with createSelector', async () => {
    const dir = fixture({
      'package.json': JSON.stringify({ dependencies: { '@ngrx/store': '18.0.0' } }),
      'angular.json': '{}',
      'src/app/store/clean.selectors.ts': `import { createFeatureSelector, createSelector } from '@ngrx/store';
export const f = createFeatureSelector('f');
export const getItems = createSelector(f, (s: any) => s.items);
`,
    });
    const r = await run(dir);
    expect(r.passed).toBe(true);
  });
});
