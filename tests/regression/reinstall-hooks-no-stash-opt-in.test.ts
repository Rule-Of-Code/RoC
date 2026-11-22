/**
 * #480 — an opt-in for `npx lint-staged --no-stash` in the generated
 * pre-commit hook.
 *
 * lint-staged saves a backup with `git stash` and restores it when a task
 * fails. The stash list belongs to the repository, not to a worktree: with
 * several worktrees committing at once, one hook can restore another
 * worktree's backup into its own tree. A project that fixes this by hand loses
 * the fix on the next `reinstall-hooks` (#556).
 *
 * `--no-stash` is not a safe default: a project whose lint-staged tasks
 * rewrite files relies on the backup. So it is opt-in:
 *   - `reinstall-hooks --no-stash` (commander: `{ stash: false }`) writes
 *     `npx lint-staged --no-stash`;
 *   - a later `reinstall-hooks` without the flag keeps it — the hook carries
 *     the opt-in, so the next release does not take it away;
 *   - without the opt-in the hook is unchanged (green control).
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { executeReinstallHooksAction } from '../../src/cli/reinstall-hooks-command';
import { GitHooksInstaller } from '../../src/hooks/installer';
import { FileUtils } from '../../src/utils';
import { execFileSync } from '../../src/utils/child-process';

const VERSION = (
  JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
  ) as { version: string }
).version;

const NO_STASH = /^\s*npx lint-staged --no-stash\s*$/m;
const WITH_STASH = /^\s*npx lint-staged\s*$/m;

describe('#480 reinstall-hooks --no-stash (opt-in)', () => {
  let dir: string;
  let spies: jest.SpyInstance[];
  const preCommit = (): string =>
    fs.readFileSync(path.join(dir, '.husky', 'pre-commit'), 'utf8');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-480-'));
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'r',
        version: '1.0.0',
        'lint-staged': { '*.ts': 'npx ruleofcode audit --staged' },
      })
    );
    spies = ['log', 'error', 'warn'].map(m =>
      jest.spyOn(console, m as 'log').mockImplementation()
    );
    process.exitCode = undefined;
  });

  afterEach(() => {
    spies.forEach(s => s.mockRestore());
    process.exitCode = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('green control: without the opt-in the hook runs lint-staged with its backup', async () => {
    await executeReinstallHooksAction({ force: true }, dir);
    expect(preCommit()).toMatch(WITH_STASH);
    expect(preCommit()).not.toMatch(NO_STASH);
  });

  it('--no-stash writes npx lint-staged --no-stash', async () => {
    await executeReinstallHooksAction(
      { force: true, stash: false } as never,
      dir
    );
    expect(preCommit()).toMatch(NO_STASH);
    expect(preCommit()).not.toMatch(WITH_STASH);
  });

  it('a hook carrying the opt-in keeps it on the next reinstall, and is not outdated', async () => {
    await executeReinstallHooksAction(
      { force: true, stash: false } as never,
      dir
    );
    const config = FileUtils.getMinimalDefaultConfig();
    expect(
      GitHooksInstaller.validateHooks({ projectRoot: dir, config }).outdated
    ).toEqual([]);

    // the next release: the marker is older, the opt-in is in the hook
    const file = path.join(dir, '.husky', 'pre-commit');
    fs.writeFileSync(
      file,
      fs.readFileSync(file, 'utf8').split(`v${VERSION}`).join('v7.0.0')
    );
    await executeReinstallHooksAction({}, dir);
    expect(preCommit()).toContain(`v${VERSION}`);
    expect(preCommit()).toMatch(NO_STASH);
  });
});
