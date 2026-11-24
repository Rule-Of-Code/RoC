/**
 * Dead Code Elimination Law
 * Reads the code for a `debugger`, a statement after a `return` and
 * commented-out declarations. Unused imports, exports and variables are not
 * detected here: the law asks for a tool that detects them — ESLint's
 * no-unused-vars / no-unreachable, or a dead-code tool the project runs (#439).
 */

import type * as TS from 'typescript';
import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { commandInvocations } from '../../utils/audit-invocation';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { CodeQualityLawBase } from './code-quality-law-base';
import { readSource, type SourceView } from './source-view';

/** Points of the score of 100 each dead-code finding costs. */
const POINTS_PER_VIOLATION = 12;

export class DeadCodeEliminationLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for dead code detection tools
    const toolsAnalysis = this.checkDeadCodeTools(
      context.projectRoot,
      context.config
    );
    violations.push(...toolsAnalysis.violations);
    suggestions.push(...toolsAnalysis.suggestions);

    // Analyze code for dead imports and variables
    const deadCodeAnalysis = this.analyzeDeadCode(
      context.projectRoot,
      context.config,
      context.lawId
    );
    violations.push(...deadCodeAnalysis.violations);
    suggestions.push(...deadCodeAnalysis.suggestions);

    return LawBase.buildDetailedResult({
      passed: violations.length === 0,
      message:
        violations.length === 0
          ? 'No dead code detected'
          : `${violations.length} dead code issues found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * POINTS_PER_VIOLATION),
      context,
    });
  }

  /**
   * Dead-code tools whose run proves the "unused" part (#439): each reports
   * unused exports, files or dependencies across the project.
   */
  private static readonly DEAD_CODE_TOOLS = [
    'knip',
    'ts-prune',
    'ts-unused-exports',
    'unimported',
  ];

  /** One command that runs a dead-code tool (`npx knip`, `ts-prune -e`). */
  private static readonly RUNS_DEAD_CODE_TOOL =
    /(?:^|[\s;&|(/])(?:knip|ts-prune|ts-unused-exports|unimported)(?=[\s;&|)]|$)/;

  /** Installing a tool is not running it (`npm i -D knip`, `pnpm add knip`). */
  private static readonly INSTALLS =
    /\b(?:npm|pnpm|yarn|bun)\s+(?:i|install|add)\b/;

  private static checkDeadCodeTools(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const packageJson = ConfigFileUtils.readPackageJson<{
      devDependencies?: Record<string, string>;
    }>(projectRoot);
    const devDeps = packageJson.devDependencies ?? {};

    // A dead-code tool the project runs (script, git hook or CI step) finds
    // unused code itself, so the ESLint rules are not needed as proof (#439).
    // Declared as a devDependency and run nowhere, it proves nothing.
    const runs = commandInvocations(
      projectRoot,
      command =>
        !this.INSTALLS.test(command) && this.RUNS_DEAD_CODE_TOOL.test(command),
      config
    );
    if (runs.length > 0) return { violations, suggestions };

    const installed = this.DEAD_CODE_TOOLS.filter(tool => devDeps[tool]);
    suggestions.push(
      installed.length > 0
        ? `${installed.join(', ')} is a devDependency, but no script, git hook or CI step runs it`
        : 'Run a dead-code tool (knip, ts-prune, ts-unused-exports or unimported) from a script, a git hook or CI'
    );

    // Check for ESLint rules that catch dead code
    if (devDeps.eslint) {
      const eslint = this.readESLintConfig(projectRoot);
      if (eslint?.notRead !== undefined) {
        violations.push(eslint.notRead);
      } else if (!this.hasDeadCodeRules(eslint?.config ?? null)) {
        violations.push('ESLint dead code detection rules not configured');
        suggestions.push(
          'Configure no-unused-vars and no-unreachable-code rules'
        );
      }
    }

    return { violations, suggestions };
  }

  private static analyzeDeadCode(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const codeFiles = DeadCodeEliminationLaw.findCodeFilesForAnalysis(
      projectRoot,
      { projectRoot, config, lawId } as LawCheckContext
    );
    let deadCodeCount = 0;

    // Read from the parse (#424). Without it the files are not read — said
    // so, never matched as text instead.
    const ts = loadTypeScript(projectRoot);
    if (!ts) {
      if (codeFiles.length > 0) {
        violations.push(
          `${parserUnavailable(projectRoot, `the ${codeFiles.length} code file(s)`)} — Dead Code Elimination judged nothing`
        );
      }
      return { violations, suggestions };
    }

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const deadCodeIssues = this.findDeadCodeInFile(ts, content, file);

        if (deadCodeIssues.length > 0) {
          deadCodeCount++;
          const relativePath = PathOperations.getRelative(projectRoot, file);
          violations.push(
            `Dead code in ${relativePath}: ${deadCodeIssues.join(', ')}`
          );
        }
      } catch (_error) {
        // Continue if file can't be read
      }
    }

    if (deadCodeCount > 0) {
      suggestions.push('Remove unused imports and variables');
      suggestions.push('Use ESLint auto-fix to clean up dead code');
    }

    return { violations, suggestions };
  }

  /**
   * The findings of one file, from its parse (#424): a `debugger` in a
   * message, a `//` sentence that mentions a function, or a property named
   * `returned:` is not dead code.
   */
  private static findDeadCodeInFile(
    ts: typeof TS,
    content: string,
    fileName: string
  ): string[] {
    const view = readSource(ts, content, fileName);
    const issues: string[] = [];
    if (this.commentedCodeLines(view) > 3) {
      issues.push('commented code blocks detected');
    }
    if (this.hasStatementAfterReturn(ts, view.source)) {
      issues.push('unreachable code after return');
    }
    if (this.hasDebuggerStatement(ts, view.source)) {
      issues.push('debug statement: debugger');
    }
    return issues;
  }

  /**
   * `//` comments that hold a declaration rather than words about one:
   * `// const total = sum(rows);`, `// function legacy() {`. A sentence that
   * merely contains "function" or "const" is prose.
   */
  private static commentedCodeLines(view: SourceView): number {
    const looksLikeCode =
      /^\/\/\s*(?:export\s+)?(?:(?:const|let)\s+[\w${}[\],\s]+=|(?:async\s+)?function\b[\s\w$]*\()/;
    return view.comments.filter(comment => looksLikeCode.test(comment.text))
      .length;
  }

  /**
   * A statement written after a `return` in the same block — it can never
   * run. A function declaration after it is hoisted and does run; a type or
   * interface is not code at all.
   */
  private static hasStatementAfterReturn(
    ts: typeof TS,
    source: TS.SourceFile
  ): boolean {
    let found = false;
    const runs = (statement: TS.Statement): boolean =>
      !ts.isFunctionDeclaration(statement) &&
      !ts.isInterfaceDeclaration(statement) &&
      !ts.isTypeAliasDeclaration(statement) &&
      !ts.isEmptyStatement(statement);
    const visit = (node: TS.Node): void => {
      if (found) return;
      if (
        ts.isBlock(node) ||
        ts.isCaseClause(node) ||
        ts.isDefaultClause(node)
      ) {
        const at = node.statements.findIndex(ts.isReturnStatement);
        found = at >= 0 && node.statements.slice(at + 1).some(runs);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }

  /** A `debugger;` statement — not the word in a string or a comment. */
  private static hasDebuggerStatement(
    ts: typeof TS,
    source: TS.SourceFile
  ): boolean {
    const visit = (node: TS.Node): boolean =>
      ts.isDebuggerStatement(node) || !!ts.forEachChild(node, visit);
    return visit(source);
  }

  private static hasDeadCodeRules(
    eslintConfig: Record<string, unknown> | null
  ): boolean {
    return this.hasAnyESLintRule(eslintConfig, [
      'no-unused-vars',
      '@typescript-eslint/no-unused-vars',
      'no-unreachable',
      'no-unreachable-loop',
    ]);
  }
}
