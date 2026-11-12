/**
 * Inject Over Constructor DI Law
 * Modern Angular injects dependencies via the inject() function in a field
 * initializer. Constructor parameter-property DI (params with private/public/
 * protected/readonly modifiers) must not be (re)introduced — it composes poorly
 * with inheritance/mixins and is inconsistent with the rest of the codebase.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { loadTypeScript, TsxSource } from '../../utils/react/tsx-source';
import { PathOperations } from '../../utils/path-operations';
import { AngularLawBase } from './angular-law-base';
import { AngularComponentFiles } from '../../utils/angular-component-files';

export class InjectOverConstructorDiLaw extends AngularLawBase {
  // A constructor whose parameter list declares a parameter-property (access
  // modifier before a parameter name) = constructor DI.
  private static readonly CONSTRUCTOR = /constructor\s*\(([\s\S]*?)\)/g;
  private static readonly PARAM_PROPERTY =
    /\b(private|public|protected|readonly)\s+[A-Za-z_$]/;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const violations: string[] = [];

    const files = FileUtils.getAllTypeScriptFiles(
      projectRoot,
      context.config,
      undefined,
      false
    ).filter(f =>
      AngularComponentFiles.isKind(f, ['component', 'directive', 'service', 'pipe', 'guard'])
    );

    for (const file of files) {
      const content = FileUtils.readFileContentSync(file);
      if (!content) continue;
      const code = content
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

      const count = this.injectedConstructors(projectRoot, file, content) ?? this.regexCount(code);
      if (count > 0) {
        violations.push(
          `${PathOperations.getRelative(projectRoot, file)}: ${count} constructor(s) using parameter-property DI — inject() in a field initializer instead.`
        );
      }
    }

    return this.createResult(
      violations,
      'Inject Over Constructor DI',
      'ANGULAR_LAW',
      [
        'Inject dependencies via inject() in a field initializer',
        'Avoid constructor parameter-property DI (private/public/protected/readonly params)',
      ],
      context
    );
  }

  /** Classes Angular's injector constructs — the only constructors that are DI. */
  private static readonly DI_DECORATORS = new Set(['Component', 'Directive', 'Injectable', 'Pipe']);

  /**
   * Parameter-property constructors of DECORATED classes, read from the parse.
   * A file is selected because it holds an Angular class, but a plain class in
   * the same file — an in-memory fake built with `new`, a value object — is
   * not constructed by the injector, and its `constructor(readonly seed = {})`
   * is not DI. Counted per file, that was a false finding the moment Angular
   * 20 files without a suffix were read (#330). Null when no parser loads.
   */
  private static injectedConstructors(projectRoot: string, file: string, content: string): number | null {
    const ts = loadTypeScript(projectRoot);
    if (!ts) return null;
    const source = TsxSource.parse(ts, file, content);
    if (source.parseErrors().length > 0) return null;
    const decoratorName = (decorator: TS.Decorator): string | undefined => {
      const expression = ts.isCallExpression(decorator.expression)
        ? decorator.expression.expression
        : decorator.expression;
      return ts.isIdentifier(expression) ? expression.text : undefined;
    };
    const decoratorsOf = (node: TS.ClassDeclaration): readonly TS.Decorator[] =>
      (ts.canHaveDecorators?.(node) ? ts.getDecorators?.(node) : undefined) ??
      ((node as unknown as { decorators?: readonly TS.Decorator[] }).decorators ?? []);
    const PARAMETER_PROPERTY = new Set([
      ts.SyntaxKind.PublicKeyword,
      ts.SyntaxKind.PrivateKeyword,
      ts.SyntaxKind.ProtectedKeyword,
      ts.SyntaxKind.ReadonlyKeyword,
    ]);
    let count = 0;
    source.walk(node => {
      if (!ts.isClassDeclaration(node)) return;
      if (!decoratorsOf(node).some(d => this.DI_DECORATORS.has(decoratorName(d) ?? ''))) return;
      for (const member of node.members) {
        if (
          ts.isConstructorDeclaration(member) &&
          member.parameters.some(p => (p.modifiers ?? []).some(m => PARAMETER_PROPERTY.has(m.kind)))
        ) {
          count++;
        }
      }
    });
    return count;
  }

  /** Without a parser: every parameter-property constructor in the file, as before. */
  private static regexCount(code: string): number {
    let count = 0;
    let match: RegExpExecArray | null;
    this.CONSTRUCTOR.lastIndex = 0;
    while ((match = this.CONSTRUCTOR.exec(code)) !== null) {
      if (this.PARAM_PROPERTY.test(match[1] ?? '')) count++;
    }
    return count;
  }
}
