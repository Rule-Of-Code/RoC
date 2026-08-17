/**
 * Merge Conflict Prevention Law Implementation
 * Prevents merge conflicts through proper workflow and tooling
 */

import { execFileSync, execSync } from 'child_process';
import type { RuleOfCodeConfig } from '../../config/types';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import {
  resolveGitConfigPath,
  resolveGitDir,
  resolveGitHooksDir,
} from '../../utils/git/git-layout';
import { PathOperations } from '../../utils/path-operations';
import { GitLawBase } from './git-law-base';

export class MergeConflictPreventionLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'Merge Conflict Prevention',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for merge conflict prevention strategies
    const preventionAnalysis = this.checkConflictPreventionStrategies(
      context.projectRoot,
      context.config
    );
    violations.push(...preventionAnalysis.violations);
    suggestions.push(...preventionAnalysis.suggestions);

    // Check for merge tools configuration
    const toolsAnalysis = this.checkMergeToolsConfig(context.projectRoot);
    violations.push(...toolsAnalysis.violations);
    suggestions.push(...toolsAnalysis.suggestions);

    // Check current repository state for conflicts
    const conflictAnalysis = this.checkCurrentConflicts(context.projectRoot);
    violations.push(...conflictAnalysis.violations);
    suggestions.push(...conflictAnalysis.suggestions);

    return GitLawBase.createResult(
      violations,
      'Merge Conflict Prevention',
      'Version Control',
      suggestions,
      context
    );
  }

  private static checkConflictPreventionStrategies(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for conflict prevention documentation
    const conflictDocs = [
      'docs/MERGE_CONFLICTS.md',
      'docs/WORKFLOW.md',
      'CONTRIBUTING.md',
      'docs/GIT_WORKFLOW.md',
    ];

    const hasConflictDocs = conflictDocs.some(doc => {
      const docPath = PathOperations.join(projectRoot, doc);
      if (FileUtils.exists(docPath)) {
        const content = FileUtils.readFile(docPath);
        return (
          content.toLowerCase().includes('merge conflict') ||
          content.toLowerCase().includes('conflict resolution') ||
          content.toLowerCase().includes('rebase')
        );
      }
      return false;
    });

    if (!hasConflictDocs) {
      violations.push('No merge conflict prevention strategies documented');
      suggestions.push(
        'Document merge conflict prevention workflow and resolution strategies'
      );
    }

    // Check for pre-merge hooks, where git will actually look for them:
    // `core.hooksPath` when the project moves them (husky does), and the main
    // repository's git directory from a linked worktree.
    const hooksDir = resolveGitHooksDir(projectRoot);
    const preMergeHookPath = hooksDir
      ? PathOperations.join(hooksDir, 'pre-merge-commit')
      : null;
    if (!preMergeHookPath || !FileUtils.exists(preMergeHookPath)) {
      suggestions.push('Create pre-merge hook to validate conflict resolution');
    }

    // Check for automated conflict detection in CI
    const workflowsDir = PathOperations.join(
      projectRoot,
      '.github',
      'workflows'
    );
    if (FileUtils.exists(workflowsDir)) {
      try {
        const workflows = CheckerUtils.findFilesByExtension(
          workflowsDir,
          ['yml', 'yaml'],
          config
        );
        const hasConflictCheck = workflows.some((workflow: string) => {
          try {
            const workflowContent = FileUtils.readFile(
              PathOperations.join(workflowsDir, workflow),
              { encoding: 'utf8' }
            );
            return (
              workflowContent.includes('conflict') ||
              workflowContent.includes('merge') ||
              workflowContent.includes('rebase')
            );
          } catch (_error) {
            return false;
          }
        });

        if (!hasConflictCheck) {
          suggestions.push('Add merge conflict detection to CI/CD workflows');
        }
      } catch (_error) {
        // Continue if workflows can't be read
      }
    }

    return { violations, suggestions };
  }

  private static checkMergeToolsConfig(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check git configuration
    this.checkGitConfigForMergeTools(projectRoot, suggestions);

    // Check .gitattributes configuration
    this.checkGitAttributesConfig(projectRoot, suggestions);

    // Check for merge conflict markers in files
    const conflictMarkers = this.findConflictMarkers(projectRoot);
    if (conflictMarkers.length > 0) {
      violations.push(
        `Found unresolved conflict markers in ${conflictMarkers.length} files`
      );
      suggestions.push('Resolve all merge conflicts before committing');
    }

    return { violations, suggestions };
  }

  private static checkGitConfigForMergeTools(
    projectRoot: string,
    suggestions: string[]
  ): void {
    // Resolved through git: shared config lives in the MAIN repository's git
    // directory, which `<root>/.git/config` does not name from a worktree.
    const gitConfigPath = resolveGitConfigPath(projectRoot);
    if (!gitConfigPath || !FileUtils.exists(gitConfigPath)) {
      return;
    }

    try {
      const gitConfig = FileUtils.readFile(gitConfigPath);

      if (
        !gitConfig.includes('mergetool') &&
        !gitConfig.includes('merge.tool')
      ) {
        suggestions.push(
          'Configure merge tool: git config merge.tool <tool-name>'
        );
      }

      if (!gitConfig.includes('diff.tool') && !gitConfig.includes('difftool')) {
        suggestions.push(
          'Configure diff tool for conflict analysis: git config diff.tool <tool-name>'
        );
      }
    } catch (_error) {
      // Continue if git config can't be read
    }
  }

  private static checkGitAttributesConfig(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const gitAttributesPath = PathOperations.join(
      projectRoot,
      '.gitattributes'
    );

    if (!FileUtils.exists(gitAttributesPath)) {
      suggestions.push(
        'Create .gitattributes to configure merge strategies for different file types'
      );
      return;
    }

    try {
      const gitAttributes = FileUtils.readFile(gitAttributesPath);
      if (
        !gitAttributes.includes('merge=') &&
        !gitAttributes.includes('diff=')
      ) {
        suggestions.push(
          'Configure file-specific merge strategies in .gitattributes'
        );
      }
    } catch (_error) {
      // Continue if .gitattributes can't be read
    }
  }

  private static findConflictMarkers(projectRoot: string): string[] {
    const conflictFiles: string[] = [];

    try {
      // Use `git grep` so detection respects .gitignore — node_modules, dist, .nx,
      // coverage, .angular, .ruleofcode-cache, reports/ and similar generated dirs
      // are skipped automatically (the old filesystem grep only excluded
      // .git/node_modules/dist and scanned everything else).
      //
      // Match ONLY the unambiguous conflict markers, anchored to the start of a
      // line: `<<<<<<<` (ours) and `>>>>>>>` (theirs). The `=======` separator is
      // deliberately NOT matched on its own — it collides with Markdown H1
      // underlines, Jest coverage-summary rules, and RoC's own report output, which
      // produced "N files with conflict markers" at ZERO real conflicts (Nx 21
      // caches console output under .nx). A genuine conflict always carries the
      // <<<<<<< / >>>>>>> markers, so coverage stays complete.
      //
      // execFileSync (no shell) keeps the regex identical on Windows cmd.exe and
      // POSIX sh — shell quoting of the marker characters differs between them.
      const result = execFileSync(
        'git',
        ['grep', '-lE', '^(<<<<<<<|>>>>>>>)( |$)'],
        {
          cwd: projectRoot,
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      const fileNames = result
        .split('\n')
        .map(line => line.trim())
        .filter((file): file is string => Boolean(file));
      conflictFiles.push(...fileNames);
    } catch (_error) {
      // `git grep` exits non-zero when there are NO matches (the common case) or if
      // git is unavailable — either way there are no conflict markers to report.
    }

    return conflictFiles;
  }

  private static checkCurrentConflicts(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check git status for merge conflicts
      const gitStatus = execSync('git status --porcelain', {
        cwd: projectRoot,
        encoding: 'utf8',
      });

      const conflictFiles = gitStatus
        .split('\n')
        .filter(
          line =>
            line.startsWith('UU ') ||
            line.startsWith('AA ') ||
            line.startsWith('DD ')
        )
        .map(line => line.substring(3));

      if (conflictFiles.length > 0) {
        violations.push(
          `Active merge conflicts in ${conflictFiles.length} files`
        );
        suggestions.push(
          'Resolve merge conflicts: git mergetool or manual resolution'
        );
      }

      // NOT checked: the existence of `.git/MERGE_HEAD`.
      //
      // It answers "is this commit a merge", not "is there an unresolved
      // conflict". `git merge` writes it the moment a real merge commit is
      // needed and git removes it only AFTER `git commit` creates that commit —
      // so during a pre-commit hook, which by definition runs before the commit
      // exists, it is present on EVERY merge, for every user, with nothing
      // unresolved. A repository wiring this law into pre-commit — which the
      // law's own suggestion recommends — could not complete a local merge at
      // all: every marker resolved and every file staged still left MERGE_HEAD
      // in place, because only the commit itself removes it.
      //
      // The real question is already answered twice above: literal conflict
      // markers via `git grep`, and `UU`/`AA`/`DD` via `git status --porcelain`.
      // A resolved-but-uncommitted merge is a working-tree state, not a
      // conflict, and this check contradicted the two above it by design.
      // THIS worktree's git dir, not the shared one: a rebase in progress is
      // per-worktree state, so asking the common directory would report the
      // main checkout's rebase while judging this one.
      const gitDir = resolveGitDir(projectRoot);

      // The rebase check below is NOT the same case, verified rather than
      // assumed: git removes `rebase-merge`/`rebase-apply` before the commit a
      // `rebase --continue` creates, so a pre-commit hook there sees no rebase
      // directory. It fires only on a rebase genuinely left in progress.
      if (
        gitDir &&
        (FileUtils.exists(PathOperations.join(gitDir, 'rebase-merge')) ||
          FileUtils.exists(PathOperations.join(gitDir, 'rebase-apply')))
      ) {
        violations.push('Repository is in the middle of a rebase');
        suggestions.push(
          'Complete or abort the ongoing rebase: git rebase --continue or git rebase --abort'
        );
      }
    } catch (_error) {
      // Git command failed, continue without conflict check
    }

    return { violations, suggestions };
  }
}
