/**
 * includes.global whitelist — QA-1/QA-2/QA-3 regressions (2026-07-10).
 * A non-empty whitelist used to kill the scan at the root ('' relative path
 * failed the prefix check), bare directory patterns matched nothing, Windows
 * backslash paths never matched, python laws ignored includes entirely, and
 * a config without an ignores section threw TypeError per directory.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileFilterUtils } from '../../src/utils/file-filter-utils';
import { CheckerUtils } from '../../src/utils/checker-utils';
import { FileUtils } from '../../src/utils/file-utils';
import type { RuleOfCodeConfig } from '../../src/types';

const config = (extra: Record<string, unknown> = {}): RuleOfCodeConfig => {
  const base = FileUtils.getMinimalDefaultConfig();
  return { ...base, ...extra } as RuleOfCodeConfig;
};

describe('applyInclusionFilters (QA-1)', () => {
  it.each([
    ['glob pattern', 'libs/**'],
    ['bare directory', 'libs'],
    ['directory with slash', 'libs/'],
  ])('matches files under the included tree for a %s', (_label, pattern) => {
    const kept = FileFilterUtils.applyInclusionFilters(
      ['libs/bot/src/risk.ts', 'apps/other/x.ts'],
      [pattern]
    );
    expect(kept).toEqual(['libs/bot/src/risk.ts']);
  });

  it('matches Windows backslash paths against forward-slash patterns', () => {
    const kept = FileFilterUtils.applyInclusionFilters(
      ['libs\\bot\\src\\risk.ts'],
      ['libs/**']
    );
    expect(kept).toEqual(['libs\\bot\\src\\risk.ts']);
  });
});

describe('shouldIgnoreFile with a whitelist (QA-1)', () => {
  const c = config({ includes: { global: ['libs/**'] } });

  it('never prunes the scan root (empty relative path)', () => {
    expect(FileFilterUtils.shouldIgnoreFile('', c)).toBe(false);
  });

  it('descends into directories on the include path', () => {
    expect(FileFilterUtils.shouldIgnoreFile('libs', c)).toBe(false);
    expect(FileFilterUtils.shouldIgnoreFile('libs/bot', c)).toBe(false);
  });

  it('keeps files inside and prunes trees outside the whitelist', () => {
    expect(FileFilterUtils.shouldIgnoreFile('libs/bot/src/risk.ts', c)).toBe(
      false
    );
    expect(FileFilterUtils.shouldIgnoreFile('apps/other', c)).toBe(true);
  });
});

describe('scanner + whitelist end-to-end (QA-1)', () => {
  it('finds files inside the included tree', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-inc-'));
    try {
      fs.mkdirSync(path.join(dir, 'libs/bot/src'), { recursive: true });
      fs.mkdirSync(path.join(dir, 'tools'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'libs/bot/src/a.ts'), 'export {};');
      fs.writeFileSync(path.join(dir, 'tools/b.ts'), 'export {};');

      const found = CheckerUtils.findTypeScriptFiles(
        dir,
        config({ includes: { global: ['libs/**'] } })
      );

      expect(found).toHaveLength(1);
      expect(found[0]!.replace(/\\/g, '/')).toContain('libs/bot/src/a.ts');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('config without an ignores section (QA-3)', () => {
  it('getIgnorePatterns does not throw and shouldIgnoreFile stays usable', () => {
    const bare = { project: { type: 'python' } } as unknown as RuleOfCodeConfig;
    expect(() =>
      FileFilterUtils.getIgnorePatterns(bare, 'some-law')
    ).not.toThrow();
    expect(() =>
      FileFilterUtils.shouldIgnoreFile('src/x.py', bare, 'some-law')
    ).not.toThrow();
  });
});
