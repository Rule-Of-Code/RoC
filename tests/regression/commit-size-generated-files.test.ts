import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * The ceiling exists to keep a commit reviewable, and nobody reviews a lockfile
 * line by line. Counting its lines made a dependency update uncommittable: a
 * lockfile cannot be split across two commits, and splitting it from the
 * manifest that caused it lands an inconsistent tree.
 *
 * The report that prompted this was a security patch — an Angular bump closing
 * an SSR escaping advisory and an i18n XSS — held up by 17,980 generated lines.
 * The only levers were to raise the limit for every commit, losing the law
 * everywhere to accommodate one file, or to leave the advisory unpatched.
 */
describe('commit size measures authored change, not generated lines', () => {
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' });

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /**
   * A file of `lines` distinct lines, so a rewrite is a real diff.
   *
   * 600 rather than the ~18,000 the report described: the ceiling is 500, so
   * 600 crosses it, and the fixture stays fast enough to run in every suite.
   */
  const generatedContent = (lines: number, salt: string): string =>
    Array.from({ length: lines }, (_, i) => `"${salt}-key-${i}": ${i}`).join(
      '\n'
    );

  const sizeFindings = (config?: RuleOfCodeConfig): string[] => {
    const result = CommitSizeControlLaw.check({
      projectRoot: root,
      config: config ?? FileUtils.getMinimalDefaultConfig(),
    });
    return (result.violations ?? []).filter(v =>
      /exceed the size limit/.test(v)
    );
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-size-'));
    git('git init -q .');
    git('git config user.email t@example.com');
    git('git config user.name Test');
    write('CONTRIBUTING.md', '# Contributing\n\nAtomic commits: one per change.\n');
    write('package.json', '{"name":"p","version":"1.0.0"}');
    git('git add -A');
    git('git commit -qm "chore: init"');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each([
    ['package-lock.json'],
    ['yarn.lock'],
    ['pnpm-lock.yaml'],
    ['poetry.lock'],
    ['Cargo.lock'],
    ['go.sum'],
    ['composer.lock'],
    ['Gemfile.lock'],
  ])('a dependency update carrying %s is committable', lockfile => {
    write(lockfile, generatedContent(600, 'a'));
    write('package.json', '{"name":"p","version":"1.0.1"}');
    git('git add -A');
    git('git commit -qm "chore(deps): close a security advisory"');

    expect(sizeFindings()).toEqual([]);
  });

  it('finds a lockfile nested under a workspace directory', () => {
    write('apps/web/package-lock.json', generatedContent(600, 'b'));
    git('git add -A');
    git('git commit -qm "chore(deps): bump in the web app"');

    expect(sizeFindings()).toEqual([]);
  });

  /**
   * The red controls. The exemption is for content nobody reads, not for the
   * size of a change — hand-written code is still measured, and a commit
   * touching many generated files is still oversized by file count.
   */
  it('still reports an oversized change to hand-written code', () => {
    write('src/big.ts', generatedContent(600, 'c'));
    git('git add -A');
    git('git commit -qm "feat: a change that wanted splitting"');

    expect(sizeFindings().length).toBeGreaterThan(0);
  });

  it('still counts generated files toward the FILE limit', () => {
    for (let i = 0; i < 12; i += 1) {
      write(`pkg-${i}/package-lock.json`, generatedContent(20, `d${i}`));
    }
    git('git add -A');
    git('git commit -qm "chore(deps): twelve lockfiles at once"');

    expect(sizeFindings().length).toBeGreaterThan(0);
  });

  it('still reports authored lines in a commit that also carries a lockfile', () => {
    write('package-lock.json', generatedContent(600, 'e'));
    write('src/big.ts', generatedContent(600, 'f'));
    git('git add -A');
    git('git commit -qm "chore(deps): bump, and rewrite a module while at it"');

    expect(sizeFindings().length).toBeGreaterThan(0);
  });

  /**
   * `baseline` is what the two sibling commit-history laws already accept.
   * Three laws read commit history; one of them could not be scoped to commits
   * made after adopting RoC.
   */
  describe('baseline, as the sibling laws already support', () => {
    it('exempts history made before the baseline', () => {
      write('src/big.ts', generatedContent(600, 'g'));
      git('git add -A');
      git('git commit -qm "feat: oversized, before adoption"');
      const adoptionPoint = git('git rev-parse HEAD').trim();
      write('src/small.ts', 'export const x = 1;\n');
      git('git add -A');
      git('git commit -qm "feat: small, after adoption"');

      const config = FileUtils.getMinimalDefaultConfig();
      config.thresholds = {
        ...config.thresholds,
        git: { ...config.thresholds?.git, commitSize: { baseline: adoptionPoint } },
      };

      expect(sizeFindings(config)).toEqual([]);
    });

    it('still reports an oversized commit made after the baseline', () => {
      const adoptionPoint = git('git rev-parse HEAD').trim();
      write('src/big.ts', generatedContent(600, 'h'));
      git('git add -A');
      git('git commit -qm "feat: oversized, after adoption"');

      const config = FileUtils.getMinimalDefaultConfig();
      config.thresholds = {
        ...config.thresholds,
        git: { ...config.thresholds?.git, commitSize: { baseline: adoptionPoint } },
      };

      expect(sizeFindings(config).length).toBeGreaterThan(0);
    });
  });

  it('lets a project name its own generated paths', () => {
    write('src/schema.generated.ts', generatedContent(600, 'i'));
    git('git add -A');
    git('git commit -qm "chore: regenerate the schema"');

    const config = FileUtils.getMinimalDefaultConfig();
    config.thresholds = {
      ...config.thresholds,
      git: {
        ...config.thresholds?.git,
        commitSize: { generatedFiles: ['\\.generated\\.ts$'] },
      },
    };

    expect(sizeFindings(config)).toEqual([]);
    // And it is the declared list doing the exempting: with the built-in one,
    // a `.generated.ts` file is just a large hand-written change.
    expect(sizeFindings().length).toBeGreaterThan(0);
  });
});
