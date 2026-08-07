/**
 * FE Architecture laws — batch 2 (ROC-FE-04/08/10): required specs, no layout
 * CSS transitions, no hostname gating. Regex/string; gated on Angular (stack:
 * frontend). Real temp fixtures, no mocks.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { NoHostnameGatingLaw } from '../../../src/checkers/fe-architecture-laws/no-hostname-gating';
import { NoLayoutTransitionLaw } from '../../../src/checkers/fe-architecture-laws/no-layout-transition';
import { RequiresSpecLaw } from '../../../src/checkers/fe-architecture-laws/requires-spec';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';

const NG = {
  'package.json': JSON.stringify({ dependencies: { '@angular/core': '^17.0.0' } }),
  'angular.json': '{}',
};
const dirs: string[] = [];
function fixture(files: Record<string, string>, includeNg = true): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-fe2-'));
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
const ctx = (root: string, extra?: Partial<RuleOfCodeConfig>): LawCheckContext => {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.type = 'angular';
  if (extra) Object.assign(config, extra);
  return { projectRoot: root, config } as never;
};
const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `const x${i} = ${i};`).join('\n');

describe('ROC-FE-04 Requires Spec', () => {
  it('flags a money-adjacent write service with no spec', () => {
    const dir = fixture({
      'libs/a/data-access/src/futures-actions.service.ts':
        "post() { headers.set('X-Control-Pass', p); }",
    });
    expect(RequiresSpecLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('flags a component over the LOC threshold with no spec', () => {
    const dir = fixture({ 'libs/a/feature-x/src/big.component.ts': lines(250) });
    expect(RequiresSpecLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes when a co-located spec exists', () => {
    const dir = fixture({
      'libs/a/data-access/src/futures-actions.service.ts': 'post() {}',
      'libs/a/data-access/src/futures-actions.service.spec.ts': 'describe("x", () => {});',
    });
    expect(RequiresSpecLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('passes a small non-money service without a spec', () => {
    const dir = fixture({ 'libs/a/feature-x/src/small.service.ts': lines(30) });
    expect(RequiresSpecLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('ROC-FE-08 No Layout Transition', () => {
  it('flags a CSS transition on a layout property', () => {
    const dir = fixture({ 'libs/a/x.component.scss': '.p { transition: width 700ms ease; }' });
    expect(NoLayoutTransitionLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('passes transform/opacity transitions', () => {
    const dir = fixture({ 'libs/a/x.component.scss': '.p { transition: transform 700ms, opacity 200ms; }' });
    expect(NoLayoutTransitionLaw.check(ctx(dir)).passed).toBe(true);
  });
  it('honours config.ignores.global', () => {
    const dir = fixture({ 'libs/a/x.component.scss': '.p { transition: width 1s; }' });
    const c = ctx(dir, { ignores: { global: ['**/x.component.scss'] } } as never);
    expect(NoLayoutTransitionLaw.check(c).passed).toBe(true);
  });
});

describe('ROC-FE-10 No Hostname Gating', () => {
  it('flags feature gating via location.hostname', () => {
    const dir = fixture({
      'libs/a/x.component.ts': "if (location.hostname === 'demo.app') { showDemo(); }",
    });
    expect(NoHostnameGatingLaw.check(ctx(dir)).passed).toBe(false);
  });
  it('does not flag a read-only hostname reference', () => {
    const dir = fixture({ 'libs/a/x.component.ts': 'const host = location.hostname; log(host);' });
    expect(NoHostnameGatingLaw.check(ctx(dir)).passed).toBe(true);
  });
});

describe('batch 2 gates off on a non-Angular project', () => {
  it('all three no-op on a Python project', () => {
    const dir = fixture(
      {
        'pyproject.toml': "[project]\nname='x'\n",
        'libs/a/x.component.scss': '.p { transition: width 1s; }',
        'libs/a/x.component.ts': "if (location.hostname === 'd') {}",
      },
      false
    );
    const c = (): LawCheckContext => ctx(dir, { project: { type: 'python' } } as never);
    expect(NoLayoutTransitionLaw.check(c()).passed).toBe(true);
    expect(NoHostnameGatingLaw.check(c()).passed).toBe(true);
    expect(RequiresSpecLaw.check(c()).passed).toBe(true);
  });
});
