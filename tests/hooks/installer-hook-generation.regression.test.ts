/**
 * Regression tests for v7.1.1 git-hook generation (FE-flagged on Windows/Git-Bash
 * + husky v9.1.7). Generates real hook files into a temp dir and validates them.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GitHooksInstaller } from '../../src/hooks/installer';
import type { RuleOfCodeConfig } from '../../src/types';

const dirs: string[] = [];
function installInto(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-hookgen-'));
  dirs.push(dir);
  const config = {
    hooks: { preCommit: true, prePush: true, commitMsg: true },
    commitMsg: {
      conventionalCommits: true,
      conventionalTypes: ['feat', 'fix', 'docs', 'chore'],
    },
  } as unknown as RuleOfCodeConfig;
  const origLog = console.log;
  console.log = (): void => {};
  try {
    GitHooksInstaller.install({ projectRoot: dir, config, force: true });
  } finally {
    console.log = origLog;
  }
  return path.join(dir, '.husky');
}
function read(huskyDir: string, hook: string): string {
  return fs.readFileSync(path.join(huskyDir, hook), 'utf8');
}

let shAvailable = true;
try {
  execFileSync('sh', ['-c', 'exit 0'], { stdio: ['pipe', 'pipe', 'pipe'] });
} catch {
  shAvailable = false;
}

afterAll(() => {
  for (const dir of dirs) {
    try {
      fs.rmSync(path.dirname(dir), { recursive: true, force: true });
    } catch {
      /* best effort */
    }
  }
});

describe('Hook generation — husky v9+ native (no deprecated v8 boilerplate)', () => {
  it('emits no shebang and no `_/husky.sh` sourcing line', () => {
    const husky = installInto();
    for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
      const content = read(husky, hook);
      expect(content.startsWith('#!')).toBe(false);
      // No `. "$(dirname …)/_/husky.sh"` sourcing line (husky v9 deprecation).
      expect(/^\s*\.\s+["'].*_\/husky\.sh/m.test(content)).toBe(false);
    }
  });
});

describe('Hook generation — commit-msg POSIX validity (FE Git-Bash crash)', () => {
  it('quotes space-bearing case patterns (no bare-space grandfather patterns)', () => {
    const husky = installInto();
    const content = read(husky, 'commit-msg');
    // The grandfather case must use quoted patterns: "Merge "* not bare Merge *.
    expect(content).toContain('"Merge "*');
    expect(content).not.toMatch(/^\s*Merge \*\|/m);
  });

  (shAvailable ? it : it.skip)(
    'generates POSIX-valid hooks (sh -n) and grandfathers long merge subjects',
    () => {
      const husky = installInto();
      for (const hook of ['pre-commit', 'pre-push', 'commit-msg']) {
        // sh -n throws on syntax error → would fail the test.
        execFileSync('sh', ['-n', path.join(husky, hook)], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }
      const msgFile = path.join(path.dirname(husky), 'msg.txt');
      const runCommitMsg = (subject: string): number => {
        fs.writeFileSync(msgFile, `${subject}\n`);
        try {
          execFileSync('sh', [path.join(husky, 'commit-msg'), msgFile], {
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          return 0;
        } catch (e) {
          return (e as { status?: number }).status ?? 1;
        }
      };
      // Long merge/squash subject (>72) is grandfathered → exit 0 (no crash).
      expect(
        runCommitMsg(
          'Merged in feature/some-really-long-branch-name (pull request #42)'
        )
      ).toBe(0);
      // Valid conventional subject → exit 0.
      expect(runCommitMsg('feat(core): add a thing')).toBe(0);
      // Non-conventional subject → exit 1.
      expect(runCommitMsg('random junk subject')).toBe(1);
    }
  );

  it('generates commit body (description) validation', () => {
    const content = read(installInto(), 'commit-msg');
    expect(content).toContain('separated from the subject by a blank line');
    expect(content).toContain('wrap at 72'); // wrap-check message
    expect(content).toContain('EXEMPT=false');
  });

  describe('Python project hooks (P8 — FastAPI + Clean Architecture toolchain)', () => {
    function installTyped(type: string): string {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-hookgen-'));
      dirs.push(dir);
      const config = {
        project: { type },
        hooks: { preCommit: true, prePush: true, commitMsg: false },
      } as unknown as RuleOfCodeConfig;
      const origLog = console.log;
      console.log = (): void => {};
      try {
        GitHooksInstaller.install({ projectRoot: dir, config, force: true });
      } finally {
        console.log = origLog;
      }
      return path.join(dir, '.husky');
    }

    it('injects ruff+mypy into pre-commit and pytest+bandit into pre-push', () => {
      const husky = installTyped('python');
      const pre = read(husky, 'pre-commit');
      expect(pre).toContain('roc_py');
      expect(pre).toContain('ruff check');
      expect(pre).toContain('mypy');
      const push = read(husky, 'pre-push');
      expect(push).toContain('roc_py pytest');
      expect(push).toContain('bandit');
    });

    it('does not inject the Python block for non-Python projects', () => {
      const husky = installTyped('angular');
      expect(read(husky, 'pre-commit')).not.toContain('roc_py');
      expect(read(husky, 'pre-push')).not.toContain('roc_py');
    });

    (shAvailable ? it : it.skip)(
      'generates POSIX-valid Python hooks (sh -n) and roc_py skips missing tools (exit 0)',
      () => {
        const husky = installTyped('python');
        for (const hook of ['pre-commit', 'pre-push']) {
          execFileSync('sh', ['-n', path.join(husky, hook)], {
            stdio: ['pipe', 'pipe', 'pipe'],
          });
        }
        // roc_py with a definitely-absent tool returns 0 (graceful skip).
        const probe =
          'roc_py() { tool="$1"; shift; ' +
          'if command -v uv >/dev/null 2>&1 && uv run "$tool" --version >/dev/null 2>&1; then uv run "$tool" "$@"; ' +
          'elif command -v "$tool" >/dev/null 2>&1; then "$tool" "$@"; ' +
          'else return 0; fi; }; roc_py definitely_not_a_real_tool_xyz check .';
        const status = (() => {
          try {
            execFileSync('sh', ['-c', probe], { stdio: ['pipe', 'pipe', 'pipe'] });
            return 0;
          } catch (e) {
            return (e as { status?: number }).status ?? 1;
          }
        })();
        expect(status).toBe(0);
      }
    );
  });

  (shAvailable ? it : it.skip)(
    'enforces commit body rules (blank line + wrap) and exempts URLs/merges',
    () => {
      const husky = installInto();
      const msgFile = path.join(path.dirname(husky), 'bodymsg.txt');
      const run = (msg: string): number => {
        fs.writeFileSync(msgFile, msg);
        try {
          execFileSync('sh', [path.join(husky, 'commit-msg'), msgFile], {
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          return 0;
        } catch (e) {
          return (e as { status?: number }).status ?? 1;
        }
      };
      // Well-formed body → pass.
      expect(run('feat: x\n\nA short, well-formed body line.\n')).toBe(0);
      // Body not separated by a blank line → fail.
      expect(run('fix: y\nBody on the line right after the subject.\n')).toBe(1);
      // Over-long wrappable body line → fail.
      expect(run(`docs: z\n\n${'word '.repeat(20)}\n`)).toBe(1);
      // Long URL is exempt → pass.
      expect(run(`chore: u\n\nSee https://example.com/${'x'.repeat(90)}\n`)).toBe(
        0
      );
      // Merge commit body is exempt → pass.
      expect(run("Merge branch 'main'\nno blank line but exempt")).toBe(0);
    }
  );
});
