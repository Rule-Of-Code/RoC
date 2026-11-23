/**
 * What Commit Size Control reads from history: the size of each authored
 * commit (generated files left out) and its patch-id, so one change carried by
 * several commits is counted once (#439). Moved out of the law unchanged.
 */

import type { RuleOfCodeConfig } from '../../types/law.types';
import { execSync } from '../../utils/child-process';

export class CommitHistoryStats {
  /**
   * Files whose contents are written by a tool, not by a person.
   *
   * The ceiling exists to keep a commit reviewable, and nobody reviews a
   * lockfile line by line. Counting its lines made a dependency update
   * uncommittable: a lockfile cannot be split across two commits, and splitting
   * it from the manifest that caused it lands an inconsistent tree. The only
   * levers left were to raise the limit for every commit — losing the law
   * everywhere to accommodate one file — or to leave the dependency unpatched.
   *
   * They are not counted at all, neither their lines nor the files: a
   * commit's size is the authored change a reviewer reads. A recording of a
   * terminal session (asciinema .cast) is written by the recorder, not by a
   * person, like a lockfile. A project declares its own generated paths in
   * thresholds.git.commitSize.generatedFiles; they are added to this list.
   */
  private static readonly GENERATED_FILES = [
    /(^|\/)package-lock\.json$/,
    /(^|\/)npm-shrinkwrap\.json$/,
    /(^|\/)yarn\.lock$/,
    /(^|\/)pnpm-lock\.yaml$/,
    /(^|\/)bun\.lockb?$/,
    /(^|\/)Cargo\.lock$/,
    /(^|\/)poetry\.lock$/,
    /(^|\/)Pipfile\.lock$/,
    /(^|\/)uv\.lock$/,
    /(^|\/)composer\.lock$/,
    /(^|\/)Gemfile\.lock$/,
    /(^|\/)go\.sum$/,
    /(^|\/)packages\.lock\.json$/,
    /(^|\/)pubspec\.lock$/,
    /(^|\/)gradle\.lockfile$/,
    /(^|\/)mix\.lock$/,
    /\.cast$/,
  ];

  /** Is this path a generated file whose lines nobody reads? */
  private static isGeneratedFile(
    filePath: string,
    config: RuleOfCodeConfig
  ): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const declared = config.thresholds?.git?.commitSize?.generatedFiles ?? [];
    const patterns = [
      ...this.GENERATED_FILES,
      ...declared.map(p => new RegExp(p)),
    ];

    return patterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Turn `git log --format=%x00%H --numstat` output into one entry per commit.
   *
   * Each numstat row is `<added>\t<deleted>\t<path>`, with `-` for both counts
   * on a binary file — a binary has no line count to answer for, so it
   * contributes files but no lines.
   */
  static parseNumstat(
    output: string,
    config: RuleOfCodeConfig
  ): Array<{ hash: string; files: number; lines: number }> {
    const commits: Array<{ hash: string; files: number; lines: number }> = [];

    for (const block of output.split('\0')) {
      const [hashLine = '', ...rest] = block.split('\n');
      const rows = rest.filter(row => row.includes('\t'));
      if (rows.length === 0) continue;

      let files = 0;
      let lines = 0;
      for (const row of rows) {
        const [added, deleted, ...pathParts] = row.split('\t');
        const filePath = pathParts.join('\t').trim();
        if (!filePath) continue;

        if (this.isGeneratedFile(filePath, config)) continue;
        files += 1;
        lines += (Number(added) || 0) + (Number(deleted) || 0);
      }

      commits.push({ hash: hashLine.trim(), files, lines });
    }

    return commits;
  }

  /**
   * The patch-id of every commit in the range, from `git patch-id --stable`
   * (commit → patch-id). Empty when git cannot say: every commit is then
   * counted, as before.
   */
  static patchIds(projectRoot: string, range: string): Map<string, string> {
    const ids = new Map<string, string>();
    try {
      const output = execSync(
        `git log -p --no-merges --format=commit%x20%H ${range} | git patch-id --stable`,
        {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );
      for (const line of output.split('\n')) {
        const [patchId, commit] = line.trim().split(/\s+/);
        if (patchId && commit) ids.set(commit, patchId);
      }
    } catch {
      // No patch-ids: count every commit.
    }
    return ids;
  }

  /** The commits, with a later commit of an already seen patch-id dropped. */
  static oncePerPatch<T extends { hash: string }>(
    commits: T[],
    patchIds: Map<string, string>
  ): T[] {
    const seen = new Set<string>();
    return commits.filter(commit => {
      const id = patchIds.get(commit.hash);
      if (id === undefined) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
}
