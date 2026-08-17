/**
 * Commit Description Standards Law
 * Enforces git commit *body* (description) conventions, complementing the
 * Commit Message Standards law (which governs the subject line):
 *  - a body, when present, is separated from the subject by exactly one blank line;
 *  - body lines wrap at a configurable width (default 72), exempting lines that
 *    cannot be wrapped (URLs, no-whitespace tokens) and git trailers (footers).
 *
 * Scope mirrors the subject law: configurable baseline, merge commits skipped,
 * and auto-generated subjects (merge/revert/initial) exempt — so adopting RoC in
 * an existing repo never flags history nobody authored by hand.
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { describeCommitScope } from './commit-scope';
import { GitLawBase } from './git-law-base';

export class CommitDescriptionStandardsLaw extends GitLawBase {
  private static readonly LAW_NAME = 'Commit Description Standards';
  /** A git trailer/footer line, e.g. "Closes: #1", "BREAKING CHANGE: x". */
  private static readonly TRAILER = /^[A-Za-z][\w-]*:\s/;

  static check(context: LawCheckContext): LawResult {
    const gitValidationResult = this.validateGitRepository(
      context,
      this.LAW_NAME
    );
    if (gitValidationResult) return gitValidationResult;

    const { projectRoot } = context;
    const violations: string[] = [];

    // Read outside the try, so the scope can still be reported when the
    // analysis throws. The Commit Description scope has its own config but
    // falls back to commitMessage, so one baseline can govern both subject and
    // body — or each can be tuned independently (e.g. exempt old bodies only).
    const gitCfg = context.config.thresholds?.git;
    const descCfg = gitCfg?.commitDescription;
    const msgCfg = gitCfg?.commitMessage;
    const scopeBaseline = descCfg?.baseline ?? msgCfg?.baseline;
    const scopeMaxCommits = descCfg?.maxCommits ?? msgCfg?.maxCommits ?? 10;

    try {
      const ignoreMerges =
        (descCfg?.ignoreMergeCommits ?? msgCfg?.ignoreMergeCommits) !== false; // default true
      const range = scopeBaseline
        ? `${scopeBaseline}..HEAD`
        : `-${scopeMaxCommits}`;
      const maxBodyLineLength = gitCfg?.maxCommitBodyLineLength ?? 72;

      // -z separates each commit's raw message (%B = subject + body) with NUL,
      // so multi-line bodies stay grouped per commit in a single git call.
      const logResult = this.executeGitCommand(
        `git log ${ignoreMerges ? '--no-merges ' : ''}-z --format=%B ${range}`,
        projectRoot
      );

      if (!logResult.success) {
        return this.createResult(
          ['Unable to read git history'],
          this.LAW_NAME,
          'GIT_LAW',
          ['Check git repository status'],
          context
        );
      }

      const messages = logResult.stdout
        .split('\0')
        .map(m => m.replace(/\r/g, ''))
        .filter(m => m.trim().length > 0);

      if (messages.length === 0) {
        const note = scopeBaseline
          ? `No authored commits after baseline ${scopeBaseline} — nothing to enforce`
          : 'No (non-merge) commits in the scanned range';
        return this.createResult([], this.LAW_NAME, 'GIT_LAW', [note], context);
      }

      messages.forEach((message, index) => {
        const lines = message.replace(/\n+$/, '').split('\n');
        const subject = lines[0] ?? '';
        if (this.isExemptCommit(subject)) return;

        // Single-line commits have no body — nothing to enforce.
        if (lines.length < 2) return;

        // 1) blank line must separate subject from body.
        if (lines[1]?.trim().length) {
          violations.push(
            `Commit ${index + 1} ("${this.truncate(subject)}"): subject and body must be separated by a blank line`
          );
        }

        // 2) body lines should wrap at the configured width (skip unwrappable
        //    lines and trailers).
        for (let i = 2; i < lines.length; i++) {
          const line = lines[i] ?? '';
          if (
            line.length > maxBodyLineLength &&
            /\s/.test(line.trim()) &&
            !line.includes('://') &&
            !this.TRAILER.test(line)
          ) {
            violations.push(
              `Commit ${index + 1} ("${this.truncate(subject)}"): body line ${
                i + 1
              } is ${line.length} chars (wrap at ${maxBodyLineLength})`
            );
          }
        }
      });
    } catch (_error) {
      violations.push(
        'Could not analyze commit descriptions (git repository required)'
      );
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'GIT_LAW',
      [
        // The scope leads: a commit reported here that the reader did not write
        // means a stale baseline, not shared history they have to rewrite.
        describeCommitScope(context.projectRoot, scopeBaseline, scopeMaxCommits),
        'Separate the subject from the body with a single blank line',
        `Wrap body lines at 72 characters (configurable via thresholds.git.maxCommitBodyLineLength)`,
        'Use the body to explain what and why, not how',
      ],
      context
    );
  }

  /** Auto-generated subjects we do not author — exempt (mirrors subject law). */
  private static isExemptCommit(subject: string): boolean {
    return (
      /^(merge\b|merged\b|revert\b)/i.test(subject) ||
      subject.toLowerCase().includes('initial commit')
    );
  }

  private static truncate(s: string): string {
    return s.length > 50 ? `${s.substring(0, 50)}...` : s;
  }
}
