import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { GitHooksInstaller } from '../../src/hooks/installer';
import { FileUtils } from '../../src/utils';
import type { RuleOfCodeConfig } from '../../src/types/law.types';

/**
 * A hook written by an earlier version must report as outdated, or a fix to the
 * hook never reaches the person it was written for: `reinstall-hooks` says "all
 * hooks are up to date" and leaves the old one in place.
 *
 * `pre-commit` and `pre-push` were checked against the version stamp. The third
 * hook was checked against the literal string 'RuleOfCode' — which every
 * generated commit-msg hook has ever contained, of any version, so that check
 * could never fail. Two hooks upgraded; the one that gates commit messages did
 * not, silently, for as long as it existed.
 */
describe('a hook from an older version is not up to date', () => {
  let root: string;

  const HOOKS = ['pre-commit', 'pre-push', 'commit-msg'];

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const config = (): RuleOfCodeConfig => {
    const c = FileUtils.getMinimalDefaultConfig();
    c.hooks = { preCommit: true, prePush: true, commitMsg: true };
    return c;
  };

  const currentVersion = (): string =>
    (
      JSON.parse(
        fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
      ) as { version: string }
    ).version;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-stale-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it.each(HOOKS.map(h => [h]))('reports a stale %s as outdated', hook => {
    for (const name of HOOKS) {
      write(
        `.husky/${name}`,
        `# RuleOfCode v${name === hook ? '0.0.1' : currentVersion()} hook\necho ok\n`
      );
    }

    const result = GitHooksInstaller.validateHooks({
      projectRoot: root,
      config: config(),
    });

    expect(result.outdated).toContain(hook);
    expect(result.valid).toBe(false);
  });

  /**
   * The red control for the defect itself: a commit-msg hook that carries the
   * brand name but no current version must NOT be accepted.
   */
  it('does not accept a commit-msg hook that only says RuleOfCode', () => {
    write('.husky/pre-commit', `# RuleOfCode v${currentVersion()} hook\n`);
    write('.husky/pre-push', `# RuleOfCode v${currentVersion()} hook\n`);
    write('.husky/commit-msg', '# RuleOfCode commit message hook\n');

    const result = GitHooksInstaller.validateHooks({
      projectRoot: root,
      config: config(),
    });

    expect(result.outdated).toContain('commit-msg');
  });

  it('accepts hooks stamped with the current version', () => {
    for (const name of HOOKS) {
      write(`.husky/${name}`, `# RuleOfCode v${currentVersion()} hook\n`);
    }

    expect(
      GitHooksInstaller.validateHooks({ projectRoot: root, config: config() })
        .valid
    ).toBe(true);
  });
});
