/**
 * Golden Fixture Immutability
 * A silently regenerated golden/snapshot masks a regression — the code
 * approves its own new behavior. Changing anything under the declared
 * goldenPaths requires touching GOLDEN-APPROVALS.md in the SAME change-set
 * (working tree + unpushed commits). Configurable law: without goldenPaths it
 * passes — the consumer declares what is golden. Universal (JS snapshots too).
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { minimatch } from 'minimatch';
import { GitLawBase } from '../git-laws/git-law-base';

export class GoldenFixtureImmutabilityLaw extends GitLawBase {
  private static readonly LAW_NAME = 'Golden Fixture Immutability';
  private static readonly APPROVALS_FILE = 'GOLDEN-APPROVALS.md';

  /** Changed files in the working tree + commits not yet on the upstream. */
  private static changedFiles(projectRoot: string): string[] {
    const collected = new Set<string>();
    const commands = [
      'git diff --name-only HEAD',
      'git diff --name-only --cached',
      'git diff --name-only @{upstream}...HEAD',
      // Untracked files too — the first-ever GOLDEN-APPROVALS.md (or a brand
      // new golden) is invisible to `git diff`.
      'git ls-files --others --exclude-standard',
    ];
    for (const command of commands) {
      const result = this.executeGitCommand(command, projectRoot);
      if (!result.success) continue; // e.g. no upstream — skip that slice
      for (const line of result.stdout.split('\n')) {
        const f = line.trim().replace(/\\/g, '/');
        if (f) collected.add(f);
      }
    }
    return [...collected];
  }

  static check(context: LawCheckContext): LawResult {
    const { projectRoot, config } = context;
    const goldenPaths =
      (config as { goldenPaths?: string[] }).goldenPaths ?? [];

    const violations: string[] = [];

    if (goldenPaths.length > 0 && this.isGitRepository(projectRoot)) {
      const changed = this.changedFiles(projectRoot);
      const touchedGoldens = changed.filter(f =>
        goldenPaths.some(p => minimatch(f, p) || f.includes(p))
      );
      const approvalsTouched = changed.some(f =>
        f.endsWith(GoldenFixtureImmutabilityLaw.APPROVALS_FILE)
      );

      if (touchedGoldens.length > 0 && !approvalsTouched) {
        for (const f of touchedGoldens) {
          violations.push(
            `${f}: golden fixture changed without a ${GoldenFixtureImmutabilityLaw.APPROVALS_FILE} entry in the same change-set — a silent regen masks a regression`
          );
        }
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'META_GATE_LAW',
      [
        `Record the regeneration in ${GoldenFixtureImmutabilityLaw.APPROVALS_FILE} (what changed, why, approved by whom) in the same change-set`,
        'If the change is a regression, fix the code — never re-bless the output',
      ],
      context
    );
  }
}
