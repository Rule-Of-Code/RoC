/**
 * AngularBundleConfig + the bundle laws' esbuild/budget recognition.
 * A modern Nx app on the esbuild `application` builder with budgets in
 * apps/<name>/project.json must be recognised as a controlled, optimized bundle
 * setup — not false-failed for lacking webpack / vendorChunk.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { BundleSizeOptimizationLaw } from '../../src/checkers/performance-laws/bundle-size-optimization';
import { AngularBundleConfig } from '../../src/utils/angular-bundle-config';
import type { LawCheckContext } from '../../src/types';

function fixture(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-bundle-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return dir;
}
const ctx = (dir: string): LawCheckContext =>
  ({ projectRoot: dir, config: { project: { type: 'angular' }, laws: {} } }) as unknown as LawCheckContext;

const esbuildProject = (): string =>
  fixture({
    'nx.json': '{}',
    'package.json': JSON.stringify({ name: 'ws', version: '1.0.0', dependencies: { '@angular/core': '20.0.0' } }),
    'apps/web/project.json': JSON.stringify({
      name: 'web',
      targets: {
        build: {
          executor: '@angular-devkit/build-angular:application',
          configurations: {
            production: { budgets: [{ type: 'initial', maximumWarning: '500kb', maximumError: '1mb' }] },
          },
        },
      },
    }),
  });

describe('AngularBundleConfig', () => {
  it('recognises the esbuild application builder and budgets across apps/<name>/', () => {
    const dir = esbuildProject();
    expect(AngularBundleConfig.usesEsbuildBuilder(dir)).toBe(true);
    expect(AngularBundleConfig.hasBudgets(dir)).toBe(true);
    expect(AngularBundleConfig.hasModernBundleSetup(dir)).toBe(true);
  });

  it('does not see a modern setup where there is none', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ name: 'ws', version: '1.0.0' }),
      'apps/web/project.json': JSON.stringify({
        name: 'web',
        targets: { build: { executor: '@angular-devkit/build-angular:browser', options: {} } },
      }),
    });
    expect(AngularBundleConfig.hasModernBundleSetup(dir)).toBe(false);
  });
});

describe('BundleSizeOptimizationLaw on a modern esbuild+budgets project', () => {
  it('does not report "optimization configuration not found" (the webpack/root-only FP)', () => {
    // esbuild optimizes automatically and budgets cap size — the modern setup is
    // recognised, so the config-not-found false positive is gone. (A separate
    // bundle-analysis-tooling check is unaffected and not what this fixes.)
    const result = BundleSizeOptimizationLaw.check(ctx(esbuildProject()));
    expect(
      (result.violations ?? []).some(v =>
        /optimization config/i.test(v)
      )
    ).toBe(false);
  });
});
