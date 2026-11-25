/**
 * #624 — values from the config are written into the generated commit-msg
 * hook. Every test generates the hook with the installer and runs it with
 * `sh -e`, the way husky runs it, on a valid and an invalid message.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { RuleOfCodeConfig } from '../../src/config/types';
import { customHookScript } from '../../src/hooks/hook-scripts';
import { GitHooksInstaller } from '../../src/hooks/installer';
import {
  shellComment,
  shellPrint,
  shellQuote,
} from '../../src/hooks/shell-quote';
import { spawnSync } from '../../src/utils/child-process';
import { FileUtils } from '../../src/utils/file-utils';
import { makeTempDir } from '../helpers/temp-dirs';

/**
 * The shells a hook runs under: `sh`, and `dash` where it is installed. On
 * Linux `/bin/sh` is dash, whose `echo` reads backslash escapes; Git's `sh`
 * on Windows is bash, whose `echo` does not. A hook must behave the same in
 * both (CI on #660).
 */
const SHELLS = ['sh', 'dash'].filter(
  shell =>
    spawnSync(shell, ['-c', 'true'], { cwd: os.tmpdir(), encoding: 'utf8' })
      .status === 0
);

/** Run `args` in every shell; the first shell's result, or the disagreement. */
function inShells(args: string[], cwd: string) {
  const results = SHELLS.map(shell => ({
    shell,
    ...spawnSync(shell, args, { cwd, encoding: 'utf8' }),
  }));
  const [first] = results;
  const disagree = results.some(
    r => r.status !== first?.status || r.stdout !== first?.stdout
  );
  return {
    status: disagree
      ? results.map(r => `${r.shell}=${r.status}`).join(' ')
      : (first?.status ?? null),
    stdout: first?.stdout ?? '',
    stderr: results.map(r => r.stderr).join(''),
  };
}

const run = (dir: string, message: string) => {
  fs.writeFileSync(path.join(dir, 'message.txt'), `${message}\n`);
  return inShells(['-e', '.husky/commit-msg', 'message.txt'], dir);
};

/** A project with the hook these settings generate. */
function hook(
  commitMsg: Record<string, unknown>,
  git: Record<string, unknown> = {}
): string {
  const dir = makeTempDir('roc-hook-624-');
  const config = {
    ...FileUtils.getMinimalDefaultConfig(),
    hooks: { preCommit: false, prePush: false, commitMsg: true },
    thresholds: { git },
    commitMsg,
  } as unknown as RuleOfCodeConfig;
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  GitHooksInstaller.install({ projectRoot: dir, config, force: true });
  return dir;
}
const text = (dir: string): string =>
  fs.readFileSync(path.join(dir, '.husky/commit-msg'), 'utf8');

afterEach(() => jest.restoreAllMocks());

const types = (value: string) => ({
  conventionalCommits: true,
  conventionalTypes: ['feat', value],
});
const emoji = (value: string) => ({ allowEmoji: true, emojiTypes: [value] });
const pattern = (value: string) => ({ patterns: [value] });

const CHARACTERS: Array<[string, string]> = [
  ['an apostrophe', "a'b"],
  ['a double quote', 'a"b'],
  ['a backtick', 'a`b'],
  ['a dollar sign', 'a$HOME'],
  ['a backslash', 'a\\b'],
  // dash's echo read `\n` as a line break (CI and QA on #660).
  ['a backslash and n', 'x\\ny'],
];

describe('#624 a commit type is written as a value', () => {
  it.each(CHARACTERS)('with %s: the hook judges and names it', (_, value) => {
    const dir = hook(types(value));
    const valid = run(dir, 'feat: add it');
    expect({ status: valid.status, stderr: valid.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    const invalid = run(dir, 'nothing like it');
    expect({ status: invalid.status, stderr: invalid.stderr }).toEqual({
      status: 1,
      stderr: '',
    });
    expect(invalid.stdout).toContain(`Types: feat, ${value}\n`);
  });

  it.each([
    ["a'b", "a'b: add it"],
    ['a"b', 'a"b: add it'],
    ['a`b', 'a`b: add it'],
  ])('the type %s accepts its own message', (value, message) => {
    expect(run(hook(types(value)), message).status).toBe(0);
  });
});

describe('#624 an emoji is written as a value', () => {
  it.each([
    ...CHARACTERS.map(([, value]) => value),
    ':+1:',
    '(x)',
    '[x]',
    '{x}',
    '$x',
    '^.*?|',
  ])('%s accepts its own message and no other', value => {
    const dir = hook(emoji(value));
    const valid = run(dir, `${value} add it`);
    expect({ status: valid.status, stderr: valid.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    const invalid = run(dir, 'nothing like it');
    expect({ status: invalid.status, stderr: invalid.stderr }).toEqual({
      status: 1,
      stderr: '',
    });
    expect(invalid.stdout).toContain(`Emojis: ${value}...\n`);
  });

  it('control: a regex character is not a regex (:+1: does not accept ::1:)', () => {
    expect(run(hook(emoji(':+1:')), '::1: add it').status).toBe(1);
  });
});

describe('#624 a pattern is written as a value', () => {
  it.each([
    ["^it's .+$", "it's done", 'it is done'],
    ['^a"b', 'a"b', 'ab'],
    ['^a`b', 'a`b', 'ab'],
    ['^a[$]b', 'a$b', 'ab'],
    ['^a\\.b', 'a.b', 'axb'],
    ['-v', 'a -v flag', 'no flag'],
  ])('%s', (value, good, bad) => {
    const dir = hook(pattern(value));
    const valid = run(dir, good);
    expect({ status: valid.status, stderr: valid.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    const invalid = run(dir, bad);
    expect({ status: invalid.status, stderr: invalid.stderr }).toEqual({
      status: 1,
      stderr: '',
    });
  });

  it.each(['\n', '\r\n'])(
    'a line break in a pattern stays inside its comment (%j)',
    lineBreak => {
      const dir = hook(pattern(`^one${lineBreak}^two`));
      expect(text(dir)).toContain('# Pattern 1: ^one ^two...\n');
      expect(run(dir, 'two words').stderr).toBe('');
      expect(run(dir, 'two words').status).toBe(0);
      expect(run(dir, 'nothing').status).toBe(1);
    }
  );
});

describe('#624 the subject limit is a number', () => {
  const plain = { conventionalCommits: true, conventionalTypes: ['feat'] };
  it.each([
    [50, 50],
    ['50', 50],
    [72.9, 72],
    ['50; x', 72],
    ['', 72],
    [true, 72],
  ])('%j is written as %d', (value, written) => {
    const script = text(hook(plain, { maxCommitMessageLength: value }));
    expect(script).toContain(`[ "$SUBJECT_LEN" -gt ${written} ]`);
    expect(script).toContain(`characters (max ${written})."`);
  });
});

describe('#624 a hook from plain values keeps its lines', () => {
  it('types, emoji and pattern', () => {
    const script = text(
      hook({
        conventionalCommits: true,
        conventionalTypes: ['feat', 'fix'],
        allowEmoji: true,
        emojiTypes: ['✨', '🐛'],
        patterns: ['^JIRA-[0-9]+ .+$'],
      })
    );
    expect(script).toContain('    echo "Types: feat, fix"\n');
    // The blank line is its own echo: `echo "\n…"` differs between dash and bash.
    expect(script).toContain(
      '    echo "Types: feat, fix"\n    echo ""\n    echo "Emojis: ✨ 🐛..."\n    echo ""\n'
    );
    expect(script).toContain('# Pattern 2: ^(✨|🐛)\\s+.+$...\n');
    expect(script).toContain(
      "# Pattern 3: ^JIRA-[0-9]+ .+$...\nif printf '%s\\n' \"$COMMIT_MSG\" | grep -qE '^JIRA-[0-9]+ .+$'; then\n"
    );
  });
});

it('the hooks run under dash where it is installed (it is on Linux CI)', () => {
  expect(SHELLS[0]).toBe('sh');
});

describe('#624 the quoting functions', () => {
  it.each(["it's", "''", '$HOME', '`x`', '"', '\\', 'a\nb', '-n', ''])(
    '%j comes out of sh as written',
    value => {
      const printed = inShells(
        ['-c', `printf '%s' ${shellQuote(value)}`],
        os.tmpdir()
      );
      expect({ status: printed.status, out: printed.stdout }).toEqual({
        status: 0,
        out: value,
      });
    }
  );

  it('a comment is one line, and plain text is an echo', () => {
    expect(shellComment('a\r\nb\nc')).toBe('a b c');
    expect(shellPrint('Types: feat')).toBe('echo "Types: feat"');
    expect(shellPrint('a$b')).toBe("printf '%s\\n' 'a$b'");
  });
});

describe('#624 a custom hook name is written as a value', () => {
  const runScript = (script: string) => {
    const dir = makeTempDir('roc-hook-624-');
    fs.writeFileSync(path.join(dir, 'hook'), script);
    return inShells(['-e', 'hook'], dir);
  };

  it.each(CHARACTERS)(
    'a name with %s runs, and is printed as written',
    (_, value) => {
      const result = runScript(customHookScript(value, ['true']));
      expect(result.status).toBe(0);
      expect(result.stdout).toContain(`Running custom hook: ${value}`);
      expect(result.stdout).toContain(`Custom hook ${value} completed`);
    }
  );

  it('control: a plain name keeps the echo lines, and the commands are written as they are', () => {
    const script = customHookScript('post-merge', ['npm ci', 'echo "$HOME"']);
    expect(script).toContain(
      '# RuleOfCode Custom Hook: post-merge (husky v9+ native)'
    );
    expect(script).toContain('echo "🔧 Running custom hook: post-merge"');
    expect(script).toContain('npm ci\necho "$HOME"');
    expect(script).toContain('echo "✅ Custom hook post-merge completed"');
  });
});
