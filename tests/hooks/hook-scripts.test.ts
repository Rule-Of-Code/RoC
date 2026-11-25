/**
 * The text of the generated hooks, tested where it is written.
 */
import type { RuleOfCodeConfig } from '../../src/config/types';
import {
  commitMsgScript,
  customHookScript,
  lintStagedCall,
  preCommitScript,
  prePushScript,
  pythonHookBlock,
} from '../../src/hooks/hook-scripts';

const config = (over: Record<string, unknown> = {}): RuleOfCodeConfig =>
  ({
    project: { name: 'x', type: 'node' },
    ...over,
  }) as unknown as RuleOfCodeConfig;
const PYTHON = config({ project: { name: 'x', type: 'python' } });

describe('pre-commit and pre-push', () => {
  it('carry the version stamp and their own audit mode', () => {
    expect(preCommitScript('1.2.3', config(), false)).toContain(
      '# RuleOfCode v1.2.3 Constitutional Checkpoint'
    );
    expect(preCommitScript('1.2.3', config(), false)).toContain(
      'npx ruleofcode audit --mode=pre-commit --staged'
    );
    expect(prePushScript('1.2.3', config())).toContain(
      'npx ruleofcode audit --mode=pre-push'
    );
  });

  it('lint-staged runs with its stash unless the opt-in is on', () => {
    expect(lintStagedCall(false)).toBe('  npx lint-staged');
    expect(preCommitScript('1.2.3', config(), true)).toContain(
      lintStagedCall(true)
    );
  });

  it('Python steps are added for a Python project, and empty for any other', () => {
    expect(pythonHookBlock(config(), 'pre-commit')).toBe('');
    expect(pythonHookBlock(PYTHON, 'pre-commit')).toContain(
      'roc_py ruff check .'
    );
    // The runner is indented shell: a moved template must keep its spaces.
    expect(prePushScript('1.2.3', PYTHON)).toContain(
      'roc_py() {\n  tool="$1"; shift\n'
    );
  });
});

describe('commit-msg', () => {
  it('without settings it accepts the conventional types, up to 72 characters', () => {
    const script = commitMsgScript('1.2.3', config());
    expect(script).toContain('# Config-driven validation with 1 pattern(s)');
    expect(script).toContain(
      "grep -qE '^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)"
    );
    expect(script).toContain('[ "$SUBJECT_LEN" -gt 72 ]');
  });

  it('reads types, emoji, custom patterns and the limit', () => {
    const script = commitMsgScript(
      '1.2.3',
      config({
        commitMsg: {
          conventionalCommits: true,
          conventionalTypes: ['feat'],
          allowEmoji: true,
          emojiTypes: ['✨'],
          patterns: ['^JIRA-[0-9]+ .+$'],
        },
        thresholds: { git: { maxCommitMessageLength: 50 } },
      })
    );
    expect(script).toContain('# Config-driven validation with 3 pattern(s)');
    expect(script).toContain('Emojis: ✨...');
    expect(script).toContain("grep -qE '^JIRA-[0-9]+ .+$'");
    expect(script).toContain('[ "$SUBJECT_LEN" -gt 50 ]');
  });

  it('empty settings still leave one pattern', () => {
    expect(
      commitMsgScript(
        '1.2.3',
        config({ commitMsg: { conventionalCommits: false, patterns: [] } })
      )
    ).toContain('# Config-driven validation with 1 pattern(s)');
  });
});

describe('custom hook', () => {
  it('runs its commands between two announcements', () => {
    expect(customHookScript('post-merge', ['npm ci', 'npm test'])).toContain(
      '\nnpm ci\nnpm test\n'
    );
  });
});
