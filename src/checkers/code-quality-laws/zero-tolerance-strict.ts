/**
 * Zero Tolerance Strict Law
 * Enhanced version of Sacred Law 2 with stricter requirements
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { CodeQualityLawBase } from './code-quality-law-base';

export class ZeroToleranceStrictLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    try {
      this.checkTypeScriptConfig(projectRoot, violations);
      this.checkConsoleStatements(projectRoot, violations, context);
      this.checkESLintConfig(projectRoot, violations, context);
    } catch (_error) {
      violations.push('Error performing zero tolerance checks');
    }

    return this.createResult(
      violations,
      'Zero Tolerance Strict Standards',
      'CODE_QUALITY_LAW',
      [
        'Enable TypeScript strict mode',
        'Remove all console statements',
        'Configure strict ESLint rules',
      ],
      context
    );
  }

  private static checkTypeScriptConfig(
    projectRoot: string,
    violations: string[]
  ): void {
    const tsconfigPath = PathOperations.join(projectRoot, 'tsconfig.json');
    if (!FileUtils.fileExistsSync(tsconfigPath)) {
      violations.push('TypeScript configuration file missing');
    } else {
      // Read from the file, its `extends` chain merged. A text search for
      // "strict" and "true" passed `"strict": false, "sourceMap": true`, and
      // the parse behind it never read a tsconfig (#486).
      const verdict = this.strictTypeScriptConfig(tsconfigPath);
      if (verdict.notRead !== undefined) {
        violations.push(verdict.notRead);
      } else if (!verdict.strict) {
        violations.push('TypeScript strict mode not enabled');
      }
    }
  }

  private static checkConsoleStatements(
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): void {
    const tsFiles = CheckerUtils.findTypeScriptFiles(
      projectRoot,
      context.config
    );
    let _consoleStatements = 0;

    for (const file of tsFiles) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;

      const consoleMatches = content.match(
        /console\.(log|debug|warn|info|trace)/g
      );
      if (consoleMatches) {
        _consoleStatements += consoleMatches.length;
        const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
        violations.push(
          `Console statements found in ${relativePath}: ${consoleMatches.length} occurrences`
        );
      }

      this.checkTodoComments(content, file, projectRoot, violations);
      this.checkAnyTypeUsage(content, file, projectRoot, violations);
    }
  }

  private static checkTodoComments(
    content: string,
    file: string,
    projectRoot: string,
    violations: string[]
  ): void {
    const todoMatches = content.match(/\/\/(.*?)(TODO|FIXME|XXX|HACK)/gi);
    if (todoMatches && todoMatches.length > 0) {
      const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
      violations.push(
        `TODO/FIXME comments found in ${relativePath}: ${todoMatches.length} occurrences`
      );
    }
  }

  private static checkAnyTypeUsage(
    content: string,
    file: string,
    projectRoot: string,
    violations: string[]
  ): void {
    const anyTypeMatches = content.match(/:\s*any\b|unknown\[\]/g);
    if (anyTypeMatches && anyTypeMatches.length > 0) {
      const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
      violations.push(
        `Strict type violations in ${relativePath}: ${anyTypeMatches.length} occurrences`
      );
    }
  }

  private static checkESLintConfig(
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): void {
    const tsFiles = CheckerUtils.findTypeScriptFiles(
      projectRoot,
      context.config
    );

    for (const file of tsFiles) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;

      // Check for disabled linter rules
      const disabledLintMatches = content.match(
        /\/\/ eslint-disable|\/\* eslint-disable/g
      );
      if (disabledLintMatches && disabledLintMatches.length > 0) {
        const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
        violations.push(
          `ESLint rules disabled in ${relativePath}: ${disabledLintMatches.length} occurrences`
        );
      }

      // Check for empty catch blocks
      const emptyCatchPattern = /catch\s*\(\s*\w*\s*\)\s*{\s*}/g;
      const emptyCatchMatches = content.match(emptyCatchPattern);
      if (emptyCatchMatches && emptyCatchMatches.length > 0) {
        const relativePath = file.replace(projectRoot, '').replace(/^\//, '');
        violations.push(
          `Empty catch blocks in ${relativePath}: ${emptyCatchMatches.length} occurrences`
        );
      }
    }
  }
}
