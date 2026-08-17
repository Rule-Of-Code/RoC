/**
 * Commit Size Control Law Implementation
 * Ensures commits are atomic and not too large
 */

import { execSync } from 'child_process';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { FileUtils } from '../../utils';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileSystemOperations } from '../../utils/file-system-operations';
import { PathOperations } from '../../utils/path-operations';
import { GitLawBase } from './git-law-base';

export class CommitSizeControlLaw extends GitLawBase {
  static check(context: LawCheckContext): LawResult {
    // Validate Git repository using base class
    const gitValidationResult = this.validateGitRepository(
      context,
      'Commit Size Control',
      'Version Control'
    );
    if (gitValidationResult) {
      return gitValidationResult;
    }

    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check recent commit sizes
    const commitSizeAnalysis = this.checkRecentCommitSizes(
      context.projectRoot,
      context.config
    );
    violations.push(...commitSizeAnalysis.violations);
    suggestions.push(...commitSizeAnalysis.suggestions);

    // Check for atomic commit policies
    const atomicAnalysis = this.checkAtomicCommitPolicies(
      context.projectRoot,
      context.config
    );
    violations.push(...atomicAnalysis.violations);
    suggestions.push(...atomicAnalysis.suggestions);

    // Check for diff size limits
    const diffAnalysis = this.checkDiffSizeLimits(context.projectRoot, context);
    violations.push(...diffAnalysis.violations);
    suggestions.push(...diffAnalysis.suggestions);

    return this.createResult(
      violations,
      'Commit Size Control',
      'Version Control',
      suggestions,
      context
    );
  }

  /**
   * The size check — dead until v7.13.0, and dead by arithmetic.
   *
   * It read at most 10 commits and only violated when `largeCommits > 20`. Each
   * commit contributes AT MOST 2 (its one summary line matches both the
   * files-changed and the insertions branch), so the ceiling was exactly 20 and
   * the threshold could never be crossed. The law therefore checked a DOCUMENT,
   * never a commit size, while its name promised otherwise.
   *
   * Now: one verdict per commit (a commit over either limit is large, counted
   * once — not twice for being large in both dimensions), thresholds read from
   * config instead of hardcoded.
   */
  private static checkRecentCommitSizes(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const git = config.thresholds?.git;
    const maxFiles = git?.maxFilesPerCommit ?? 10;
    const maxLines = git?.maxLinesPerCommit ?? 500;

    try {
      // `--no-merges`, so the sample means what the message says it does.
      //
      // `git log --stat` prints NO diffstat for a merge commit — the subject
      // line appears with no stat block under it. A merge therefore measured as
      // zero files and could never be oversized, while still occupying a slot
      // in the fixed window. On a gitflow repository one release cycle produces
      // three of them, so the law inspected seven commits and reported "of the
      // last 10" — the sample narrowed exactly when activity was highest.
      //
      // Excluding them is also the honest scope: this law is about the size of
      // an AUTHORED change, and a merge is composed by git.
      //
      // `--numstat` rather than `--stat`, because a per-commit summary cannot be
      // questioned file by file, and this law needs to be: a lockfile's 18,000
      // regenerated lines are not a change anyone reviews.
      //
      // `baseline` is honoured here as it already is by the two sibling laws
      // that read commit history — three laws read it, and one of them could
      // not be scoped to commits made after adopting RoC.
      const baseline = git?.commitSize?.baseline;
      const maxCommits = git?.commitSize?.maxCommits ?? 10;
      const range = baseline
        ? `${baseline}..HEAD`
        : `--since="1 week ago" -n ${maxCommits}`;

      const commitStats = execSync(
        `git log --format=%x00%H --numstat --no-merges ${range}`,
        {
          cwd: projectRoot,
          encoding: 'utf8',
        }
      );

      const commits = this.parseNumstat(commitStats, config);

      const oversized = commits.filter(
        commit => commit.files > maxFiles || commit.lines > maxLines
      ).length;

      if (oversized > 0) {
        violations.push(
          `${oversized} of the last ${commits.length} authored commits exceed the size limit (>${maxFiles} files or >${maxLines} lines changed)`
        );
        suggestions.push(
          `Keep commits atomic: under ${maxFiles} files and ${maxLines} changed lines each`
        );
      }
    } catch (_error) {
      // Can't analyze commit history, might be a new repository
      suggestions.push('Establish commit size guidelines for atomic commits');
    }

    return { violations, suggestions };
  }

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
   * Their LINES are excluded; their presence is not. A commit touching thirty
   * generated files is still thirty files, and still oversized by file count.
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
  ];

  /** Is this path a generated file whose lines nobody reads? */
  private static isGeneratedFile(
    filePath: string,
    config: RuleOfCodeConfig
  ): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    const declared = config.thresholds?.git?.commitSize?.generatedFiles;
    const patterns = declared?.length
      ? declared.map(p => new RegExp(p))
      : this.GENERATED_FILES;

    return patterns.some(pattern => pattern.test(normalized));
  }

  /**
   * Turn `git log --format=%x00%H --numstat` output into one entry per commit.
   *
   * Each numstat row is `<added>\t<deleted>\t<path>`, with `-` for both counts
   * on a binary file — a binary has no line count to answer for, so it
   * contributes files but no lines.
   */
  private static parseNumstat(
    output: string,
    config: RuleOfCodeConfig
  ): Array<{ files: number; lines: number }> {
    const commits: Array<{ files: number; lines: number }> = [];

    for (const block of output.split('\0')) {
      const rows = block
        .split('\n')
        .slice(1) // the commit hash line
        .filter(row => row.includes('\t'));
      if (rows.length === 0) continue;

      let files = 0;
      let lines = 0;
      for (const row of rows) {
        const [added, deleted, ...pathParts] = row.split('\t');
        const filePath = pathParts.join('\t').trim();
        if (!filePath) continue;

        files += 1;
        if (this.isGeneratedFile(filePath, config)) continue;
        lines += (Number(added) || 0) + (Number(deleted) || 0);
      }

      commits.push({ files, lines });
    }

    return commits;
  }

  private static checkAtomicCommitPolicies(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for atomic commit documentation
    const atomicDocs = [
      'docs/ATOMIC_COMMITS.md',
      'docs/COMMIT_GUIDELINES.md',
      'CONTRIBUTING.md',
      'docs/DEVELOPMENT.md',
    ];

    const hasAtomicDocs = atomicDocs.some(doc => {
      const docPath = PathOperations.join(projectRoot, doc);
      if (FileUtils.exists(docPath)) {
        const content = FileUtils.readFile(docPath);
        return (
          content.toLowerCase().includes('atomic') ||
          content.toLowerCase().includes('single responsibility') ||
          content.toLowerCase().includes('one change per commit')
        );
      }
      return false;
    });

    if (!hasAtomicDocs) {
      violations.push('No atomic commit policies documented');
      suggestions.push(
        'Document atomic commit principles: one logical change per commit'
      );
    }

    // Check for commit message templates that encourage atomic commits
    const templatePath = PathOperations.join(projectRoot, '.gitmessage');
    if (FileUtils.exists(templatePath)) {
      try {
        const templateContent = FileUtils.readFile(templatePath);
        if (
          !templateContent.includes('atomic') &&
          !templateContent.includes('single change') &&
          !templateContent.includes('focused')
        ) {
          suggestions.push(
            'Update .gitmessage template to encourage atomic commits'
          );
        }
      } catch (_error) {
        // Continue if template can't be read
      }
    }

    return { violations, suggestions };
  }

  private static checkDiffSizeLimits(
    projectRoot: string,
    context: LawCheckContext
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for pre-commit hooks that validate commit size
    this.checkPreCommitHooks(projectRoot, suggestions);

    // Check for package.json scripts related to commit validation
    this.checkPackageJsonScripts(projectRoot, suggestions);

    // Check for CI/CD that validates PR size
    this.checkCICDWorkflows(projectRoot, context, suggestions);

    return { violations, suggestions };
  }

  private static checkPreCommitHooks(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const preCommitHookPath = PathOperations.join(
      projectRoot,
      '.git',
      'hooks',
      'pre-commit'
    );

    if (!FileUtils.exists(preCommitHookPath)) {
      suggestions.push('Create pre-commit hook to validate commit size limits');
      return;
    }

    try {
      const hookContent = FileUtils.readFile(preCommitHookPath);
      const hasValidation = [
        'diff --stat',
        'files changed',
        'size',
        'lines',
      ].some(keyword => hookContent.includes(keyword));

      if (!hasValidation) {
        suggestions.push('Add commit size validation to pre-commit hook');
      }
    } catch (_error) {
      // Continue if hook can't be read
    }
  }

  private static checkPackageJsonScripts(
    projectRoot: string,
    suggestions: string[]
  ): void {
    const packageJsonPath = PathOperations.join(projectRoot, 'package.json');
    if (!FileUtils.exists(packageJsonPath)) {
      return;
    }

    try {
      const packageJson = FileSystemOperations.readJsonFile<{
        scripts?: Record<string, string>;
        [key: string]: unknown;
      }>(packageJsonPath, {});
      const scripts = packageJson.scripts ?? {};

      const hasCommitValidation = Object.keys(scripts).some(script => {
        const scriptValue = scripts[script] ?? '';
        return [
          script.includes('commit'),
          scriptValue.includes('commit'),
          scriptValue.includes('husky'),
        ].some(Boolean);
      });

      if (!hasCommitValidation) {
        suggestions.push(
          'Add commit validation scripts using husky or similar tools'
        );
      }
    } catch (_error) {
      // Continue if package.json can't be parsed
    }
  }

  private static checkCICDWorkflows(
    projectRoot: string,
    context: LawCheckContext,
    suggestions: string[]
  ): void {
    const workflowsDir = PathOperations.join(
      projectRoot,
      '.github',
      'workflows'
    );
    if (!FileUtils.exists(workflowsDir)) {
      return;
    }

    try {
      const workflows = CheckerUtils.findFilesByExtension(
        workflowsDir,
        ['yml', 'yaml'],
        context.config
      );

      const hasSizeValidation = workflows.some((workflow: string) =>
        this.checkWorkflowForSizeValidation(workflowsDir, workflow)
      );

      if (!hasSizeValidation) {
        suggestions.push('Add PR size validation to GitHub Actions workflows');
      }
    } catch (_error) {
      // Continue if workflows can't be read
    }
  }

  private static checkWorkflowForSizeValidation(
    workflowsDir: string,
    workflow: string
  ): boolean {
    try {
      const workflowContent = FileUtils.readFile(
        PathOperations.join(workflowsDir, workflow)
      );
      return ['diff', 'size', 'lines changed'].some(keyword =>
        workflowContent.includes(keyword)
      );
    } catch (_error) {
      return false;
    }
  }

  /**
   * Process files changed line and return increment for large commits
   */
  /** How many files a `--stat` summary line reports as changed. */
  private static filesChangedCount(line: string): number {
    const filesMatch = line.match(/(\d+) files? changed/);
    return filesMatch?.[1] ? parseInt(filesMatch[1], 10) : 0;
  }

  /**
   * Process changes line and return total changes
   */
  private static processChangesLine(line: string): number {
    const insertionsMatch = line.match(/(\d+) insertions?/);
    const deletionsMatch = line.match(/(\d+) deletions?/);

    const insertions = insertionsMatch?.[1]
      ? parseInt(insertionsMatch[1], 10)
      : 0;
    const deletions = deletionsMatch?.[1] ? parseInt(deletionsMatch[1], 10) : 0;

    return insertions + deletions;
  }
}
