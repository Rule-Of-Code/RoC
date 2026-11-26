/**
 * Zero Tolerance Strict Law
 * Enhanced version of Sacred Law 2 with stricter requirements
 *
 * Every per-file check reads the CODE of the file, or its COMMENTS, from the
 * TypeScript parse (#424): a `console.log` in a message string, `: any` in a
 * comment's prose or `TODO` in a regex is not code. In a package that
 * declares a `bin`, `console.log/info` is the program's output, and so is
 * `console.warn` in the command's entry modules — not a debug statement
 * (#425).
 */

import type * as TS from 'typescript';
import type {
  LawCheckContext,
  LawResult,
  ViolationDetail,
} from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { PathOperations } from '../../utils/path-operations';
import {
  loadTypeScript,
  parserUnavailable,
} from '../../utils/react/tsx-source';
import { CliPackages } from './cli-packages';
import { CodeQualityLawBase } from './code-quality-law-base';
import { readSource, type SourceView } from './source-view';

/** One per-file check: its finding, what one occurrence is, and where each is. */
type Site = [finding: string, what: string, offsets: number[]];

export class ZeroToleranceStrictLaw extends CodeQualityLawBase {
  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];
    // What each finding counted, at its line, or the file it read (#43).
    const details: ViolationDetail[] = [];

    const ts = loadTypeScript(projectRoot);
    // .vue too, read as its script (#607).
    const tsFiles = this.findTypeScriptFiles(projectRoot, context);
    if (!ts && tsFiles.length > 0) {
      return markJudgedNothing({
        ...this.createResult(
          [
            `${parserUnavailable(projectRoot, `the ${tsFiles.length} .ts file(s)`)} — Absolute Zero Tolerance Doctrine judged nothing`,
          ],
          'Zero Tolerance Strict Standards',
          'CODE_QUALITY_LAW',
          [],
          context
        ),
      });
    }

    try {
      this.checkTypeScriptConfig(projectRoot, violations, details);
      if (ts) this.checkFiles(ts, projectRoot, tsFiles, violations, details);
    } catch (_error) {
      violations.push('Error performing zero tolerance checks');
    }

    const result = this.createResult(
      violations,
      'Zero Tolerance Strict Standards',
      'CODE_QUALITY_LAW',
      this.suggestionsFor(violations),
      context
    );
    return this.withDetails(result, details);
  }

  /**
   * The advice that answers a finding of this run, and only that. The list was
   * fixed, so a tsconfig the law could not read got "Enable TypeScript strict
   * mode" next to "tsconfig.json … NOT read" — advice about a file it never
   * judged (#506, QA on #503).
   */
  private static suggestionsFor(violations: string[]): string[] {
    const has = (text: string): boolean =>
      violations.some(v => v.startsWith(text));
    const advice: Array<[boolean, string]> = [
      [
        has('TypeScript strict mode not enabled') ||
          has('TypeScript configuration file missing'),
        'Enable TypeScript strict mode',
      ],
      [has('Console statements found in'), 'Remove all console statements'],
      [has('ESLint rules disabled in'), 'Configure strict ESLint rules'],
    ];
    return advice.filter(([applies]) => applies).map(([, text]) => text);
  }

  private static checkTypeScriptConfig(
    projectRoot: string,
    violations: string[],
    details: ViolationDetail[]
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
        details.push({
          file: 'tsconfig.json',
          message:
            'compilerOptions.strict is not on (its "extends" chain merged)',
        });
      }
    }
  }

  /** Every per-file check, on one parse of each file. */
  private static checkFiles(
    ts: typeof TS,
    projectRoot: string,
    tsFiles: string[],
    violations: string[],
    details: ViolationDetail[]
  ): void {
    const cli = new CliPackages(projectRoot);
    const code: string[] = [];
    const lint: string[] = [];
    for (const file of tsFiles) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const view = readSource(ts, content, file);
      const relativePath = PathOperations.getRelative(projectRoot, file);
      const sites: Site[] = [
        [
          'Console statements found in',
          'console statement',
          this.consoleCalls(view, file, cli),
        ],
        [
          'TODO/FIXME comments found in',
          'TODO/FIXME comment',
          this.todoTags(view),
        ],
        [
          'Strict type violations in',
          'explicit any',
          this.anyAnnotations(ts, view.source),
        ],
        [
          'ESLint rules disabled in',
          'eslint-disable comment',
          this.lintDisables(view),
        ],
        [
          'Empty catch blocks in',
          'empty catch block',
          this.emptyCatches(ts, view.source),
        ],
      ];
      // Two groups, in the order the findings have always been listed:
      // statements and types per file first, lint and catch blocks after.
      code.push(...this.counted(relativePath, sites.slice(0, 3)));
      lint.push(...this.counted(relativePath, sites.slice(3)));
      // Each counted occurrence, at its line (#43).
      for (const [, what, offsets] of sites) {
        details.push(
          ...offsets.map(offset => ({
            file: relativePath,
            line: this.lineAt(view.code, offset),
            message: what,
          }))
        );
      }
    }
    violations.push(...code, ...lint);
  }

  /** One finding per check that counted anything in the file. */
  private static counted(relativePath: string, sites: Site[]): string[] {
    return sites
      .filter(([, , offsets]) => offsets.length > 0)
      .map(
        ([finding, , offsets]) =>
          `${finding} ${relativePath}: ${offsets.length} occurrences`
      );
  }

  /**
   * `console.*` in code. In a package that declares a `bin`, log and info
   * are what the command prints — its output; in the command's entry modules
   * warn is too. Library code's warn, and debug and trace everywhere, are
   * counted. The rule lives in CliPackages, shared with Centralized Logging;
   * this law has no error check. A logging module (logger.*, logging*,
   * log.*) is where console output is supposed to live.
   */
  private static consoleCalls(
    view: SourceView,
    file: string,
    cli: CliPackages
  ): number[] {
    if (CliPackages.isLoggingModule(file)) return [];
    const methods = cli.countedConsoleMethods(file, [
      'log',
      'debug',
      'warn',
      'info',
      'trace',
    ]);
    if (methods.length === 0) return [];
    const pattern = new RegExp(`console\\.(${methods.join('|')})`, 'g');
    return [...view.code.matchAll(pattern)].map(match => match.index ?? 0);
  }

  /**
   * Line comments that START with a TODO/FIXME/XXX/HACK tag, in capitals and
   * followed by a space, `:`, `(` or `-` — a tag, not the word in a sentence.
   */
  private static todoTags(view: SourceView): number[] {
    return view.comments
      .filter(comment =>
        /^\/\/\s*(?:TODO|FIXME|XXX|HACK)(?=[\s:(-]|$)/.test(comment.text)
      )
      .map(comment => comment.start);
  }

  /** `eslint-disable` directives — they live in comments, nowhere else. */
  private static lintDisables(view: SourceView): number[] {
    return view.comments
      .filter(comment =>
        /^(?:\/\/ eslint-disable|\/\* eslint-disable)/.test(comment.text)
      )
      .map(comment => comment.start);
  }

  /**
   * `any` written by hand: as the type of a declaration — a parameter,
   * variable, property or return type — or as the target of an `as` cast,
   * also as `any[]`. The rest parameter of a constructor typed `any[]` is
   * exempt: TypeScript requires exactly that for a mixin (TS2545), so it is
   * not a choice anyone could make otherwise.
   */
  private static anyAnnotations(
    ts: typeof TS,
    source: TS.SourceFile
  ): number[] {
    const found: number[] = [];
    const visit = (node: TS.Node): void => {
      if (
        node.kind === ts.SyntaxKind.AnyKeyword &&
        this.isAnnotation(ts, node)
      ) {
        found.push(node.getStart(source));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }

  /**
   * Is this `any` the type after the `:` of a declaration or after `as`
   * (directly or as `any[]`)?
   */
  private static isAnnotation(ts: typeof TS, anyNode: TS.Node): boolean {
    const typeNode = ts.isArrayTypeNode(anyNode.parent)
      ? anyNode.parent
      : anyNode;
    const owner = typeNode.parent as TS.Node & { type?: TS.Node };
    const declarations = [
      ts.isAsExpression,
      ts.isParameter,
      ts.isVariableDeclaration,
      ts.isPropertyDeclaration,
      ts.isPropertySignature,
      ts.isIndexSignatureDeclaration,
      ts.isFunctionLike,
    ];
    if (!declarations.some(is => is(owner)) || owner.type !== typeNode) {
      return false;
    }
    return !(typeNode !== anyNode && this.isMixinRest(ts, owner));
  }

  /** `...args` of a constructor or constructor type: the mixin signature. */
  private static isMixinRest(ts: typeof TS, owner: TS.Node): boolean {
    return (
      ts.isParameter(owner) &&
      owner.dotDotDotToken !== undefined &&
      (ts.isConstructorDeclaration(owner.parent) ||
        ts.isConstructorTypeNode(owner.parent))
    );
  }

  /** `catch (e) {}` — a binding, and nothing at all between the braces. */
  private static emptyCatches(ts: typeof TS, source: TS.SourceFile): number[] {
    const found: number[] = [];
    const visit = (node: TS.Node): void => {
      if (
        ts.isCatchClause(node) &&
        node.variableDeclaration !== undefined &&
        ts.isIdentifier(node.variableDeclaration.name) &&
        node.block.statements.length === 0 &&
        /^\{\s*\}$/.test(node.block.getText(source))
      ) {
        found.push(node.getStart(source));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
  }
}
