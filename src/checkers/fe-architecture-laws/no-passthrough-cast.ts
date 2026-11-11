/**
 * ROC-FE-07 — No passthrough DTO→model cast in data-access
 * A validating boundary is mandatory: typing a response straight to a domain
 * model skips the runtime conversion and hides shape drift. Two shapes are
 * judged in the data-access layer (configurable):
 *
 * - HttpClient: `http.get<DomainModel>()` — the generic should be a `Raw*`
 *   envelope (or `unknown`), converted in a `.pipe(map(...))`. Regex, as before.
 * - fetch: `res.json()` returns `Promise<any>`, so `(await res.json()) as T`,
 *   `res.json() as Promise<T>`, `… as unknown as T` and `const x: T = await
 *   res.json()` all relabel the wire shape without parsing it. Read from the
 *   syntax tree with the project's own TypeScript; a file it cannot parse is a
 *   violation, never a pass.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { FileUtils } from '../../utils/file-utils';
import { PathOperations } from '../../utils/path-operations';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { FeArchLawBase } from './fe-arch-law-base';

/** Generics and casts that are legitimately not a domain model. */
const SAFE = new Set([
  'unknown',
  'any',
  'void',
  'object',
  'Blob',
  'ArrayBuffer',
  'string',
  'number',
  'boolean',
  'HttpEvent',
  'HttpResponse',
  'Response',
]);

const isSafeName = (name: string): boolean => SAFE.has(name) || /Raw/.test(name);

export class NoPassthroughCastLaw extends FeArchLawBase {
  private static readonly LAW_NAME = 'No Passthrough Cast';
  private static readonly HTTP_GENERIC =
    /\.(get|post|put|patch|delete)\s*<\s*([A-Za-z_]\w*)\s*(?:\[\])?\s*>\s*\(/g;

  static check(context: LawCheckContext): LawResult {
    const { projectRoot } = context;
    const dataAccess = this.sourceFiles(context).filter(file =>
      this.inLayer(context, file, 'dataAccess')
    );
    const violations: string[] =
      dataAccess.length === 0 ? [this.emptyLayer(context, ['dataAccess'])] : [];
    const fetchCandidates: string[] = [];

    for (const file of dataAccess) {
      const content = FileUtils.readFile(file) ?? '';
      if (content.includes('.json(')) fetchCandidates.push(file);
      if (!/\.(get|post|put|patch|delete)\s*</.test(content)) continue;
      const rel = PathOperations.getRelative(projectRoot, file);
      this.HTTP_GENERIC.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = this.HTTP_GENERIC.exec(content)) !== null) {
        const generic = m[2] ?? '';
        if (isSafeName(generic)) continue;
        const line = content.slice(0, m.index).split('\n').length;
        violations.push(
          `${rel}:${line}: http.${m[1]}<${generic}> casts the response straight to a domain model — use a Raw*/unknown generic and convert in .pipe(map(...))`
        );
      }
    }

    const { sources, unread } = ReactProject.parse(context, fetchCandidates);
    violations.push(...unread);
    for (const source of sources) {
      const rel = PathOperations.getRelative(projectRoot, source.fileName);
      for (const { line, type } of this.jsonCasts(source)) {
        violations.push(
          `${rel}:${line}: the body of res.json() is relabelled as ${type} without being parsed — type it unknown and parse it (a schema or a mapper) at the boundary`
        );
      }
    }

    return this.createResult(
      violations,
      this.LAW_NAME,
      'FE_ARCHITECTURE',
      [
        'Type the HTTP call as Raw*/unknown; map to the domain model in a mapper',
        'Parse res.json() with a schema (or a mapper over unknown) instead of casting it',
      ],
      context
    );
  }

  /** Every `.json()` body cast or annotated to a domain type. */
  private static jsonCasts(source: TsxSource): Array<{ line: number; type: string }> {
    const ts = source.ts;
    const found: Array<{ line: number; type: string }> = [];
    source.walk(node => {
      let target: TS.TypeNode | undefined;
      let value: TS.Expression | undefined;
      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        target = node.type;
        value = node.expression;
      } else if (ts.isVariableDeclaration(node) && node.type && node.initializer) {
        target = node.type;
        value = node.initializer;
      }
      if (!target || !value || !this.isJsonBody(ts, value)) return;
      const name = this.domainTypeName(ts, target, source);
      if (name) found.push({ line: source.lineOf(node), type: name });
    });
    return found;
  }

  /** `res.json()`, `await res.json()`, parenthesised, or behind `as unknown`. */
  private static isJsonBody(ts: typeof TS, expression: TS.Expression): boolean {
    let e: TS.Expression = expression;
    for (;;) {
      if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e)) e = e.expression;
      else if (ts.isAsExpression(e) && this.isLooseType(ts, e.type)) e = e.expression;
      else break;
    }
    return (
      ts.isCallExpression(e) &&
      e.arguments.length === 0 &&
      ts.isPropertyAccessExpression(e.expression) &&
      e.expression.name.text === 'json'
    );
  }

  private static isLooseType(ts: typeof TS, type: TS.TypeNode): boolean {
    return type.kind === ts.SyntaxKind.UnknownKeyword || type.kind === ts.SyntaxKind.AnyKeyword;
  }

  /** The domain type a cast names, or null when it is a safe/loose one. */
  private static domainTypeName(
    ts: typeof TS,
    type: TS.TypeNode,
    source: TsxSource
  ): string | null {
    let t: TS.TypeNode = type;
    if (ts.isArrayTypeNode(t)) t = t.elementType;
    if (
      ts.isTypeReferenceNode(t) &&
      ts.isIdentifier(t.typeName) &&
      t.typeName.text === 'Promise' &&
      t.typeArguments?.length === 1
    ) {
      return this.domainTypeName(ts, t.typeArguments[0] as TS.TypeNode, source);
    }
    if (this.isLooseType(ts, t)) return null;
    if (ts.isTypeReferenceNode(t)) {
      const name = t.typeName.getText(source.sourceFile);
      return isSafeName(name) ? null : name;
    }
    if (ts.isTypeLiteralNode(t)) return t.getText(source.sourceFile).replace(/\s+/g, ' ');
    return null;
  }
}
