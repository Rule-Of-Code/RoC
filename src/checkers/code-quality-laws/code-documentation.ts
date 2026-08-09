/**
 * Code Documentation Law
 * Enforces proper code documentation standards and JSDoc usage
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CheckerUtils } from '../../utils/checker-utils';
import { FileUtils } from '../../utils/file-utils';
import { CodeQualityLawBase } from './code-quality-law-base';

export class CodeDocumentationLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const { config: _config } = context;
    const violations: string[] = [];

    try {
      const tsFiles = this.findTypeScriptFiles(projectRoot, context);
      const documentationStats = this.analyzeDocumentation(
        tsFiles,
        projectRoot,
        violations,
        context
      );

      this.generateSummaryViolations(documentationStats, violations, context);

      return this.createResult(
        violations,
        'Code Documentation',
        'CODE_QUALITY_LAW',
        ['Add JSDoc comments to classes and functions'],
        context
      );
    } catch (_error) {
      return this.createResult(
        ['Error analyzing code documentation'],
        'Code Documentation',
        'CODE_QUALITY_LAW',
        [],
        context
      );
    }
  }

  private static analyzeDocumentation(
    files: string[],
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): {
    totalClasses: number;
    totalFunctions: number;
    documentedClasses: number;
    documentedFunctions: number;
  } {
    let totalClasses = 0;
    let totalFunctions = 0;
    let documentedClasses = 0;
    let documentedFunctions = 0;

    for (const file of files) {
      const stats = this.analyzeFileDocumentation(
        file,
        projectRoot,
        violations,
        context
      );
      totalClasses += stats.classes;
      totalFunctions += stats.functions;
      documentedClasses += stats.documentedClasses;
      documentedFunctions += stats.documentedFunctions;
    }

    return {
      totalClasses,
      totalFunctions,
      documentedClasses,
      documentedFunctions,
    };
  }

  private static analyzeFileDocumentation(
    file: string,
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): {
    classes: number;
    functions: number;
    documentedClasses: number;
    documentedFunctions: number;
  } {
    const content = FileUtils.readFileContentSync(file);
    if (!content)
      return {
        classes: 0,
        functions: 0,
        documentedClasses: 0,
        documentedFunctions: 0,
      };

    // Count classes and their documentation.
    //
    // `abstract` counts too: `export abstract class` matched neither the
    // numerator nor the denominator, so a documented abstract class was
    // invisible to this ratio in both directions.
    const classMatches = content.match(/export\s+(?:abstract\s+)?class\s+\w+/g);
    const classes = classMatches?.length ?? 0;

    // Decorators may sit between the docblock and the class. In Angular they
    // almost always do — @Component, @Injectable, @Directive, @Pipe — and this
    // pattern allowed whitespace only, so every decorated class in every Angular
    // codebase counted as undocumented. The only way to satisfy it was to put the
    // docblock BELOW the decorator, where IDEs, TypeDoc and the TypeScript
    // language service all stop reading it as the class's documentation: the law
    // asked people to hide their docs from the tooling.
    const classDocPattern =
      /\/\*\*[\s\S]*?\*\/\s*(?:@[\w$]+(?:\([\s\S]*?\))?\s*)*export\s+(?:abstract\s+)?class/g;
    const documentedClassMatches = content.match(classDocPattern);
    const documentedClasses = documentedClassMatches?.length ?? 0;

    // Count function/method DECLARATIONS — NOT call-expressions. The previous
    // `methodMatches` regex reduced to `\w+\s*\(`, so every function CALL inflated
    // the denominator and made documentation coverage mathematically unreachable
    // (consumers had to drop the threshold to ~6 as a workaround).
    const functionMatches = content.match(
      /\b(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(|\b(?:export\s+)?(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g
    );

    // Class methods: `name(args) {` or `name(args): Type {` at statement position.
    // A real declaration is followed by a body brace; a call (`foo(...);`,
    // `foo(...).then(…)`) never is — that brace is what separates the two.
    // Control-flow keywords that share the `name(...) {` shape are excluded.
    const methodDeclPattern =
      /^[ \t]*(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\s+)*([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*(?::\s*[^={;]+?)?\s*\{/gm;
    const controlFlowNames = new Set([
      'if',
      'for',
      'while',
      'switch',
      'catch',
      'return',
      'do',
      'function',
      'constructor',
    ]);
    let methodCount = 0;
    for (const methodMatch of content.matchAll(methodDeclPattern)) {
      if (!controlFlowNames.has(methodMatch[1] ?? '')) {
        methodCount++;
      }
    }

    const functions = (functionMatches?.length ?? 0) + methodCount;

    // Documented = a JSDoc block immediately followed by a declaration. JSDoc-gated,
    // so it cannot match a stray call expression.
    const functionDocPattern =
      /\/\*\*[\s\S]*?\*\/\s*(?:export\s+)?(?:(?:public|private|protected|static|readonly|abstract|override|async|get|set)\s+)*(?:function\b|const\s|let\s|var\s|[A-Za-z_$][\w$]*\s*\()/g;
    const documentedFunctionMatches = content.match(functionDocPattern);
    const documentedFunctions = documentedFunctionMatches?.length ?? 0;

    // Check comment ratio
    this.checkCommentRatio(file, content, projectRoot, violations, context);

    return { classes, functions, documentedClasses, documentedFunctions };
  }

  private static checkCommentRatio(
    file: string,
    content: string,
    projectRoot: string,
    violations: string[],
    context: LawCheckContext
  ): void {
    const codeLines = content
      .split('\n')
      .filter(
        line =>
          line.trim() &&
          !line.trim().startsWith('//') &&
          !line.trim().startsWith('/*')
      );
    const commentLines = content
      .split('\n')
      .filter(line => line.trim().startsWith('//') || line.includes('/*'));

    const commentRatio = commentLines.length / Math.max(codeLines.length, 1);
    const minRatio =
      (context.config.thresholds?.codeQuality?.minCommentRatioPercent ?? 10) /
      100;
    const minFileSize =
      context.config.thresholds?.codeQuality?.minFileSizeForComments ?? 50;

    if (commentRatio < minRatio && codeLines.length > minFileSize) {
      const relativePath = file.replace(projectRoot, '').replace(/^\//g, '');
      const requiredPercent = (minRatio * 100).toFixed(0);
      violations.push(
        `Low comment ratio in ${relativePath}: ${(commentRatio * 100).toFixed(1)}% (should be >${requiredPercent}%)`
      );
    }

    // Check for README.md or documentation files in the same directory
    const fileDir = file.substring(0, file.lastIndexOf('/'));
    const readmePath = `${fileDir}/README.md`;

    if (
      !FileUtils.fileExistsSync(readmePath) &&
      (file.includes('src/app') || file.includes('src/lib'))
    ) {
      const relativePath = fileDir.replace(projectRoot, '').replace(/^\//, '');
      violations.push(`Missing README.md in directory: ${relativePath}`);
    }
  }

  private static generateSummaryViolations(
    stats: {
      totalClasses: number;
      totalFunctions: number;
      documentedClasses: number;
      documentedFunctions: number;
    },
    violations: string[],
    context: LawCheckContext
  ): void {
    const {
      totalClasses,
      totalFunctions,
      documentedClasses,
      documentedFunctions,
    } = stats;

    // Calculate overall documentation coverage
    const classDocumentationRatio =
      totalClasses > 0 ? documentedClasses / totalClasses : 1;
    const functionDocumentationRatio =
      totalFunctions > 0 ? documentedFunctions / totalFunctions : 1;

    const minClassDoc =
      (context.config.thresholds?.documentation?.minClassDocumentationPercent ??
        80) / 100;
    const minFuncDoc =
      (context.config.thresholds?.documentation
        ?.minFunctionDocumentationPercent ?? 60) / 100;

    if (classDocumentationRatio < minClassDoc) {
      violations.push(
        `Class documentation coverage is ${(classDocumentationRatio * 100).toFixed(1)}% (should be >${(minClassDoc * 100).toFixed(0)}%)`
      );
    }

    if (functionDocumentationRatio < minFuncDoc) {
      violations.push(
        `Function documentation coverage is ${(functionDocumentationRatio * 100).toFixed(1)}% (should be >${(minFuncDoc * 100).toFixed(0)}%)`
      );
    }
  }

  protected static findTypeScriptFiles(
    projectRoot: string,
    context: LawCheckContext
  ): string[] {
    return CheckerUtils.findFilesByExtension(
      projectRoot,
      CheckerUtils.getCommonExtensions().TYPESCRIPT,
      context.config
    );
  }
}
