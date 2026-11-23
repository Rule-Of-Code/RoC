/**
 * #556 — `reinstall-hooks` rewrites every hook without a backup, dropping the
 * lines a project added.
 *
 * When a hook is outdated (or with `--force`), the command calls
 * `GitHooksInstaller.reinstall`, which is `install({ ...options, force: true })`:
 * every hook file is written over with the template. A step the tool does not
 * know about (a secret scan, a formatter, a repository-specific flag) is gone,
 * and the only sign is a later commit that behaves differently.
 *
 * What is asserted:
 *   - a hook that differs from the template only by its version marker is
 *     replaced, as before (green control);
 *   - a hook with lines of its own is not replaced without `--force`, and the
 *     output names the hook;
 *   - with `--force` it is replaced, and the old file is kept as
 *     `<hook>.bak`, whose path is printed.
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
const OLD = '7.0.0';
const LOCAL_LINE = 'npx secret-scan --staged # added by this project';

describe('#556 reinstall-hooks keeps what the project added to a hook', () => {
  let dir: string;
  let log: jest.SpyInstance;
  let error: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const printed = (): string =>
    [...log.mock.calls, ...error.mock.calls, ...warn.mock.calls]
      .map(c => String(c[0]))
      .join('\n');
  const hook = (name: string): string => path.join(dir, '.husky', name);

  /** The template as this version writes it, then marked as written by OLD. */
  const writeOldTemplate = (): string => {
    const config = FileUtils.getMinimalDefaultConfig();
    config.hooks = { preCommit: true, prePush: true, commitMsg: true };
    GitHooksInstaller.install({ projectRoot: dir, config, force: true });
    for (const name of ['pre-commit', 'pre-push', 'commit-msg']) {
      const text = fs.readFileSync(hook(name), 'utf8');
      fs.writeFileSync(hook(name), text.split(`v${VERSION}`).join(`v${OLD}`));
    }
    return fs.readFileSync(hook('pre-commit'), 'utf8');
  };

  /** An old pre-commit hook with one line of the project's own. */
  const writeEditedOldHook = (): string => {
    const text = writeOldTemplate().replace(
      '# Run constitutional audit on staged files',
      `${LOCAL_LINE}\n\n# Run constitutional audit on staged files`
    );
    fs.writeFileSync(hook('pre-commit'), text);
    return text;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-556-'));
    execFileSync('git', ['init', '-q'], { cwd: dir, stdio: 'ignore' });
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ name: 'r', version: '1.0.0' })
    );
    log = jest.spyOn(console, 'log').mockImplementation();
    error = jest.spyOn(console, 'error').mockImplementation();
    warn = jest.spyOn(console, 'warn').mockImplementation();
    process.exitCode = undefined;
  });

  afterEach(() => {
    log.mockRestore();
    error.mockRestore();
    warn.mockRestore();
    process.exitCode = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('green control: a hook that differs only by its version marker is replaced', async () => {
    writeOldTemplate();
    await executeReinstallHooksAction({}, dir);
    const text = fs.readFileSync(hook('pre-commit'), 'utf8');
    expect(text).toContain(`v${VERSION}`);
    expect(text).not.toContain(`v${OLD}`);
  });

  it('a hook with lines of its own is not replaced without --force, and is named', async () => {
    const before = writeEditedOldHook();
    await executeReinstallHooksAction({}, dir);
    expect(fs.readFileSync(hook('pre-commit'), 'utf8')).toBe(before);
    expect(printed()).toMatch(/pre-commit[^\n]*--force/);
  });

  it('with --force it is replaced, and the old file is kept as pre-commit.bak', async () => {
    const before = writeEditedOldHook();
    await executeReinstallHooksAction({ force: true }, dir);
    expect(fs.readFileSync(hook('pre-commit'), 'utf8')).not.toContain(
      LOCAL_LINE
    );
    expect(fs.existsSync(hook('pre-commit.bak'))).toBe(true);
    expect(fs.readFileSync(hook('pre-commit.bak'), 'utf8')).toBe(before);
    expect(printed()).toContain('pre-commit.bak');
  });
});
