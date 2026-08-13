/**
 * Dead Code Elimination Law
 * Detects and eliminates unused code, imports, and variables
 */

import type {
  LawCheckContext,
  LawResult,
  RuleOfCodeConfig,
} from '../../types/law.types';
import { ConfigFileUtils } from '../../utils/config-file-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';
import { CodeQualityLawBase } from './code-quality-law-base';

export class DeadCodeEliminationLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for dead code detection tools
    const toolsAnalysis = this.checkDeadCodeTools(context.projectRoot);
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
          : Math.max(0, 100 - violations.length * 12),
      context,
    });
  }

  private static checkDeadCodeTools(projectRoot: string): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const packageJson = ConfigFileUtils.readPackageJson<{
      devDependencies?: Record<string, string>;
    }>(projectRoot);
    const devDeps = packageJson.devDependencies ?? {};

    // Check for ESLint rules that catch dead code
    if (devDeps.eslint) {
      const eslintConfig = this.findESLintConfig(projectRoot);
      if (!this.hasDeadCodeRules(eslintConfig)) {
        violations.push('ESLint dead code detection rules not configured');
        suggestions.push(
          'Configure no-unused-vars and no-unreachable-code rules'
        );
      }
    }

    // Check for dead code elimination tools
    const deadCodeTools = ['ts-unused-exports', 'unimported', 'depcheck'];
    const hasDeadCodeTool = deadCodeTools.some(tool => devDeps[tool]);
    if (!hasDeadCodeTool) {
      suggestions.push(
        'Consider adding dead code detection tools (ts-unused-exports, depcheck)'
      );
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

    for (const file of codeFiles) {
      try {
        const content = FileUtils.readFile(file);
        const deadCodeIssues = this.findDeadCodeInFile(content);

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

  private static findDeadCodeInFile(content: string): string[] {
    const issues: string[] = [];

    this.checkCommentedCode(content, issues);
    this.checkUnreachableCode(content, issues);
    this.checkDebugStatements(content, issues);

    return issues;
  }

  private static checkCommentedCode(content: string, issues: string[]): void {
    // Check for commented code blocks
    const commentedCodeLines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return (
        trimmed.startsWith('//') &&
        (trimmed.includes('function') ||
          trimmed.includes('const') ||
          trimmed.includes('let'))
      );
    });

    if (commentedCodeLines.length > 3) {
      issues.push('commented code blocks detected');
    }
  }

  private static checkUnreachableCode(
    content: string,
    issues: string[]
  ): void {
    // Check for unreachable code after return (same indentation only)
    // Match multiline: return statement followed by code at same indent before closing brace
    // Improved pattern: captures indentation and requires matching indent for unreachable code
    const lines = content.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (!line) continue; // Skip undefined lines
      const trimmed = line.trim();

      // Skip if not a return statement or is inside a comment
      if (!trimmed.startsWith('return') || trimmed.startsWith('//')) continue;
      if (!trimmed.endsWith(';') && !trimmed.endsWith('}')) continue;

      // Get indentation level of return statement
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch?.[1]?.length || 0;

      if (this.hasUnreachableCodeAfterReturn(lines, i, indent)) {
        issues.push('unreachable code after return');
      }
    }
  }

  private static hasUnreachableCodeAfterReturn(
    lines: string[],
    returnLineIndex: number,
    indent: number
  ): boolean {
    // Check next non-empty line
    for (let j = returnLineIndex + 1; j < lines.length; j++) {
      const nextLine = lines[j];
      if (!nextLine) continue; // Skip undefined lines
      const nextTrimmed = nextLine.trim();

      // Skip empty lines and comments
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith('//') ||
        nextTrimmed.startsWith('/*')
      )
        continue;

      // If next code line is closing brace at same or lower indent - no unreachable code
      if (nextTrimmed.startsWith('}')) return false;

      // Get indentation of next code line
      const nextIndentMatch = nextLine.match(/^(\s*)/);
      const nextIndent = nextIndentMatch?.[1]?.length || 0;

      // If same or greater indent and not a closing brace - unreachable code!
      if (nextIndent >= indent) {
        return true;
      }

      // If less indent - we're in outer scope, no unreachable code
      return false;
    }

    return false;
  }

  private static checkDebugStatements(content: string, issues: string[]): void {
    // Check for debug statements. `console.*` is owned by the dedicated
    // Centralized Logging law (centralized-logging) as of v7.2.0 — only the
    // `debugger` statement is flagged here (real dead/debug code).
    const debugStatements = ['debugger'];
    for (const debug of debugStatements) {
      if (content.includes(debug)) {
        issues.push(`debug statement: ${debug}`);
      }
    }
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
