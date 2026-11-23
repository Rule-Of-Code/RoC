import { execSync } from '../../src/utils/child-process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CommitSizeControlLaw } from '../../src/checkers/git-laws/commit-size-control';
import { FileUtils } from '../../src/utils';

/**
 * #439 (Commit Size Control) — the same change reached the history twice, as
 * a commit and its cherry-pick (one patch-id), and the law counted it twice:
 * "2 of the last N authored commits exceed the size limit" for one oversized
 * change. A change is counted once, by its patch-id.
 */
describe('#439 one change is counted once, whatever number of commits carry it', () => {
  let root: string;
  const git = (command: string): string =>
    execSync(command, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const big = (salt: string): string =>
    Array.from(
      { length: 600 },
      (_, i) => `export const ${salt}${i} = ${i};`
    ).join('\n');
  const sizeFindings = (): string[] =>
    (
      CommitSizeControlLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
      }).violations ?? []
    ).filter(v => /exceed the size limit/.test(v));

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-patchid-'));
    git('git init -q -b main .');
    git('git config user.email t@example.com');
    git('git config user.name Test');
    write('CONTRIBUTING.md', '# Contributing\n\nAtomic commits.\n');
    git('git add -A');
    git('git commit -qm "chore: init"');
  });
  afterEach(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  });

  it('counts a commit and its cherry-pick as one oversized change', () => {
    git('git checkout -q -b side');
    write('src/big.ts', big('a'));
    git('git add -A');
    git('git commit -qm "feat: one large change"');
    git('git checkout -q main');
    // A commit first, so the cherry-pick gets another parent and another hash.
    write('src/small.ts', 'export const small = 1;\n');
    git('git add -A');
    git('git commit -qm "feat: small"');
    git('git cherry-pick side');
    git('git merge -q --no-ff side -m "merge side"');

    expect(sizeFindings()).toEqual([
      expect.stringMatching(/^1 of the last 3 authored commits exceed/),
    ]);
  });

  /** The boundary: a change of exactly the line limit is not oversized, however many commits carry it. */
  it('does not count a change at exactly the line limit, nor its cherry-pick', () => {
    const atLimit = (salt: string): string =>
      Array.from(
        { length: 500 },
        (_, i) => `export const ${salt}${i} = ${i};`
      ).join('\n');
    git('git checkout -q -b side');
    write('src/edge.ts', atLimit('e'));
    git('git add -A');
    git('git commit -qm "feat: change at the limit"');
    git('git checkout -q main');
    write('src/small.ts', 'export const small = 1;\n');
    git('git add -A');
    git('git commit -qm "feat: small"');
    git('git cherry-pick side');

    expect(sizeFindings()).toEqual([]);
  });

  /** The control: two different large changes are two. */
  it('still counts two different large changes as two', () => {
    write('src/a.ts', big('a'));
    git('git add -A');
    git('git commit -qm "feat: a"');
    write('src/b.ts', big('b'));
    git('git add -A');
    git('git commit -qm "feat: b"');

    expect(sizeFindings()).toEqual([
      expect.stringMatching(/^2 of the last 3 authored commits exceed/),
    ]);
  });
});
