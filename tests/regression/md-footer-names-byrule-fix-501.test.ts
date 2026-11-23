/**
 * #501 — MD Footer Template's "nothing was judged" named the cause and not
 * the fix.
 *
 * With `includes.global` naming only source, the opt-in law selects no
 * Markdown and the run becomes partial; the reader had to find out that the
 * law takes its files through `includes.byRule`, under the key the registry
 * derives from its title. The message now names that fix with the exact key,
 * derived the way the registry derives it (never a hard-coded key), so it
 * stays right if the title changes.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import { MdFooterTemplateLaw } from '../../src/laws/documentation/md-footer-template';
import { FileUtils } from '../../src/utils';
import { FileFilterUtils } from '../../src/utils/file-filter-utils';
import { configKeySlug } from '../../src/utils/law-identity';

const dirs: string[] = [];
afterAll(() =>
  dirs.forEach(d => fs.rmSync(d, { recursive: true, force: true }))
);

const card = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l =>
  l.title.startsWith('MD Footer Template')
);

describe('#501 nothing judged names the includes.byRule fix and its key', () => {
  it('the message names includes.byRule with the key of the law title', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-501-'));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'README.md'), '# R\n');
    const config = FileUtils.getMinimalDefaultConfig();
    const result = await MdFooterTemplateLaw.check({
      projectRoot: dir,
      config: { ...config, includes: { global: ['src/**/*.ts'] } },
    });
    const key = configKeySlug(card?.title ?? '');
    expect(key).toBe('md-footer-template-mandatory');
    expect(result.judgedNothing).toBe(true);
    expect(result.violations?.[0]).toContain(
      `nothing was judged. Give this law the Markdown files with includes.byRule: { "${key}": ["**/*.md"] }`
    );
  });

  it('the TITLE the key is derived from is the registry title', () => {
    expect(MdFooterTemplateLaw.TITLE).toBe(card?.title);
  });

  it('the fix it names works: with that includes.byRule the Markdown is judged', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-501-fix-'));
    dirs.push(dir);
    fs.writeFileSync(path.join(dir, 'README.md'), '# R\n');
    const key = configKeySlug(card?.title ?? '');
    const config = FileUtils.getMinimalDefaultConfig();
    // the registry sets the running law's key the same way
    FileFilterUtils.currentLawConfigKey = key;
    FileFilterUtils.currentProjectRoot = dir;
    try {
      const result = await MdFooterTemplateLaw.check({
        projectRoot: dir,
        config: {
          ...config,
          includes: { global: ['src/**/*.ts'], byRule: { [key]: ['**/*.md'] } },
        } as never,
      });
      expect(result.judgedNothing).toBeUndefined();
    } finally {
      FileFilterUtils.currentLawConfigKey = undefined;
      FileFilterUtils.currentProjectRoot = undefined;
    }
  });
});
