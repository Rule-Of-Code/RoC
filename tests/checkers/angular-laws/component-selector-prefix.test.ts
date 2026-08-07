/**
 * Tests for ComponentSelectorPrefixLaw, incl. multi-prefix support (v7.2.5):
 * a project may allow more than one selector prefix (app + a design-system
 * prefix like "t3", mirroring Material's "mat").
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ComponentSelectorPrefixLaw } from '../../../src/checkers/angular-laws/component-selector-prefix';
import { FileUtils } from '../../../src/utils/file-utils';
import type { LawCheckContext } from '../../../src/types';

const dirs: string[] = [];
function fixture(selectors: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-prefix-'));
  dirs.push(dir);
  for (const [name, selector] of Object.entries(selectors)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      `import { Component } from '@angular/core';\n@Component({ selector: '${selector}', template: '' })\nexport class C {}\n`
    );
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
function ctx(root: string, allowed?: string[]): LawCheckContext {
  const config = FileUtils.getMinimalDefaultConfig();
  config.project.componentPrefix = 'app';
  if (allowed) config.thresholds = { angular: { allowedComponentPrefixes: allowed } };
  return { projectRoot: root, config } as never;
}

describe('ComponentSelectorPrefixLaw', () => {
  it('passes selectors using the configured prefix', () => {
    const dir = fixture({ 'src/a.component.ts': 'app-foo' });
    expect(ComponentSelectorPrefixLaw.check(ctx(dir)).passed).toBe(true);
  });

  it('flags a selector with a non-allowed prefix', () => {
    const dir = fixture({ 'src/b.component.ts': 'xyz-bad' });
    expect(ComponentSelectorPrefixLaw.check(ctx(dir)).passed).toBe(false);
  });

  it('flags a design-system prefix when only the single prefix is configured', () => {
    const dir = fixture({ 'src/c.component.ts': 't3-button' });
    expect(ComponentSelectorPrefixLaw.check(ctx(dir)).passed).toBe(false);
  });

  it('accepts an additional allowed prefix (multi-prefix)', () => {
    const dir = fixture({
      'src/a.component.ts': 'app-foo',
      'src/c.component.ts': 't3-button',
    });
    expect(ComponentSelectorPrefixLaw.check(ctx(dir, ['t3'])).passed).toBe(true);
  });

  it('still flags genuinely wrong prefixes under multi-prefix config', () => {
    const dir = fixture({
      'src/c.component.ts': 't3-button',
      'src/d.component.ts': 'xyz-bad',
    });
    const r = ComponentSelectorPrefixLaw.check(ctx(dir, ['t3']));
    expect(r.passed).toBe(false);
    expect(r.violations!.some(v => v.includes('xyz-bad'))).toBe(true);
    expect(r.violations!.some(v => v.includes('t3-button'))).toBe(false);
  });

  it('tolerates prefixes written with a trailing dash ("t3-")', () => {
    const dir = fixture({ 'src/c.component.ts': 't3-button' });
    expect(ComponentSelectorPrefixLaw.check(ctx(dir, ['t3-'])).passed).toBe(true);
  });
});
