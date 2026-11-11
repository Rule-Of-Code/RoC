/**
 * Next Client Props Serializable
 *
 * The props a Server Component passes to a Client Component are serialized
 * into the RSC payload. React serializes primitives, plain objects, arrays,
 * Date, Map, Set, Promise, FormData, typed arrays, Blob and Server Functions;
 * a plain function or an instance of any other class throws at render
 * ("Functions cannot be passed directly to Client Components…", "Only plain
 * objects, and a few built-ins, can be passed…"). Type-checking does not
 * catch it, and the render that throws may be one no test makes. The law
 * reads the inline cases: an arrow or function written as a prop, and `new`
 * of a class that is not one of those built-ins.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import type { ModuleGraph } from '../../utils/react/module-graph';
import { NextAppFiles } from '../../utils/react/next-app-files';
import { hasDirective, NextSourcesLoader } from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { ImportInfo, TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** Classes React's Flight serializer accepts (react-server-dom renderModelDestructive). */
const SERIALIZABLE_CLASSES = new Set([
  'Date',
  'Map',
  'Set',
  'Array',
  'Object',
  'Promise',
  'FormData',
  'Blob',
  'ReadableStream',
  'ArrayBuffer',
  'DataView',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'Float32Array',
  'Float64Array',
  'BigInt64Array',
  'BigUint64Array',
  'Error',
  'TypeError',
  'RangeError',
  'SyntaxError',
  'ReferenceError',
  'EvalError',
  'URIError',
  'AggregateError',
]);

const MAX_REEXPORT_DEPTH = 8;
const FUNCTION_PROBLEM =
  "functions cannot be passed from a Server Component to a Client Component unless they are Server Functions ('use server')";

export class NextClientPropsSerializableLaw extends LawBase {
  static readonly LAW_NAME = 'Next Client Props Serializable';

  static check(context: LawCheckContext): LawResult {
    const sources = NextSourcesLoader.load(context);
    if (!NextSourcesLoader.hasAppRouter(sources) && sources.unread.length === 0) {
      return NextAppFiles.withoutSubject(
        this.LAW_NAME,
        'no app/ directory — Server Components and the props they serialize exist only in the App Router',
        context
      );
    }
    const graph = NextSourcesLoader.serverGraph(context, sources);
    const violations = [...sources.unread, ...graph.unread];
    for (const [file, node] of graph.nodes) {
      if (hasDirective(node.source, 'use client') || hasDirective(node.source, 'use server')) continue;
      violations.push(...this.checkServerModule(context, graph, file, node.source));
    }
    return this.createResult(
      violations,
      this.LAW_NAME,
      'FRAMEWORK',
      [
        "Define the handler inside the Client Component, or pass a Server Function ('use server')",
        'Pass plain data (an id, a plain object) and build the class instance on the client',
      ],
      context
    );
  }

  private static checkServerModule(
    context: LawCheckContext,
    graph: ModuleGraph,
    file: string,
    source: TsxSource
  ): string[] {
    const clientTags = this.clientComponentTags(graph, file);
    if (clientTags.size === 0) return [];
    const ts = source.ts;
    const where = ReactProject.relative(context, file);
    const violations: string[] = [];
    for (const element of source.jsxElements()) {
      if (!clientTags.has(element.tag)) continue;
      for (const property of element.node.attributes.properties) {
        if (!ts.isJsxAttribute(property) || !property.initializer || !ts.isJsxExpression(property.initializer)) continue;
        const problem = this.problemOf(ts, property.initializer.expression);
        if (problem) {
          violations.push(`${where}:${source.lineOf(property)}: <${element.tag} ${property.name.getText(source.sourceFile)}={…}> ${problem}`);
        }
      }
      violations.push(...this.childProblems(source, element.node, where, element.tag));
    }
    return violations;
  }

  /** A function written as the child of a Client Component (`<List>{item => …}</List>`). */
  private static childProblems(source: TsxSource, opening: TS.JsxOpeningLikeElement, where: string, tag: string): string[] {
    const ts = source.ts;
    if (!ts.isJsxOpeningElement(opening)) return [];
    return opening.parent.children
      .filter((child): child is TS.JsxExpression => ts.isJsxExpression(child))
      .map(child => ({ child, problem: this.problemOf(ts, child.expression) }))
      .filter(({ problem }) => problem !== null)
      .map(({ child, problem }) => `${where}:${source.lineOf(child)}: <${tag}> child ${problem}`);
  }

  /** Why a prop value cannot cross to the client, or null. Walks object and array literals. */
  static problemOf(ts: TsxSource['ts'], expression: TS.Expression | undefined, depth = 0): string | null {
    if (!expression || depth > 4) return null;
    let value: TS.Expression = expression;
    while (ts.isParenthesizedExpression(value) || ts.isAsExpression(value) || ts.isSatisfiesExpression(value)) {
      value = value.expression;
    }
    if ((ts.isArrowFunction(value) || ts.isFunctionExpression(value)) && !this.isServerFunction(ts, value)) {
      return `is a function — ${FUNCTION_PROBLEM}`;
    }
    if (ts.isNewExpression(value)) {
      const name = value.expression.getText();
      return SERIALIZABLE_CLASSES.has(name)
        ? null
        : `is a \`new ${name}(…)\` — instances of classes other than React's serializable built-ins cannot be passed to a Client Component`;
    }
    if (ts.isObjectLiteralExpression(value)) {
      const values = this.objectValues(ts, value);
      return values === 'method' ? `holds a method — ${FUNCTION_PROBLEM}` : this.firstProblem(ts, values, depth);
    }
    if (ts.isArrayLiteralExpression(value)) return this.firstProblem(ts, [...value.elements], depth);
    return null;
  }

  private static objectValues(ts: TsxSource['ts'], literal: TS.ObjectLiteralExpression): TS.Expression[] | 'method' {
    const values: TS.Expression[] = [];
    for (const property of literal.properties) {
      if (ts.isMethodDeclaration(property) || ts.isAccessor(property)) return 'method';
      if (ts.isPropertyAssignment(property)) values.push(property.initializer);
    }
    return values;
  }

  private static firstProblem(ts: TsxSource['ts'], values: TS.Expression[], depth: number): string | null {
    for (const value of values) {
      const problem = this.problemOf(ts, value, depth + 1);
      if (problem) return problem.startsWith('holds') ? problem : `holds a value that ${problem}`;
    }
    return null;
  }

  /** An inline Server Function: its body opens with the `'use server'` directive. */
  private static isServerFunction(ts: TsxSource['ts'], fn: TS.ArrowFunction | TS.FunctionExpression): boolean {
    const body = fn.body;
    if (!body || !ts.isBlock(body)) return false;
    const first = body.statements[0];
    return first !== undefined && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'use server';
  }

  /** Local JSX tag names in `file` that resolve to a `'use client'` module (through re-exports). */
  private static clientComponentTags(graph: ModuleGraph, file: string): Set<string> {
    const tags = new Set<string>();
    const node = graph.nodes.get(file);
    if (!node) return tags;
    for (const info of node.source.imports()) {
      if (info.typeOnly) continue;
      const edge = node.edges.find(candidate => candidate.specifier === info.module);
      if (edge?.resolution.kind === 'local') this.addClientTags(graph, info, edge.resolution.file, tags);
    }
    return this.expandNamespaces(node.source, tags);
  }

  private static addClientTags(graph: ModuleGraph, info: ImportInfo, target: string, tags: Set<string>): void {
    if (info.defaultName && this.isClientExport(graph, target, 'default', 0)) tags.add(info.defaultName);
    for (const named of info.named) {
      if (this.isClientExport(graph, target, named.imported, 0)) tags.add(named.local);
    }
    if (info.namespaceName && this.isClientModule(graph, target)) tags.add(`${info.namespaceName}.`);
  }

  /** `ns.` entries stand for every `<ns.X>` tag used in the module. */
  private static expandNamespaces(source: TsxSource, tags: Set<string>): Set<string> {
    const prefixes = [...tags].filter(tag => tag.endsWith('.'));
    if (prefixes.length === 0) return tags;
    for (const element of source.jsxElements()) {
      if (prefixes.some(prefix => element.tag.startsWith(prefix))) tags.add(element.tag);
    }
    return tags;
  }

  private static isClientModule(graph: ModuleGraph, file: string): boolean {
    const node = graph.nodes.get(file);
    return node !== undefined && hasDirective(node.source, 'use client');
  }

  /** True when `name` exported by `file` comes from a `'use client'` module, following `export … from`. */
  private static isClientExport(graph: ModuleGraph, file: string, name: string, depth: number): boolean {
    if (this.isClientModule(graph, file)) return true;
    const node = graph.nodes.get(file);
    if (!node || depth >= MAX_REEXPORT_DEPTH) return false;
    const ts = node.source.ts;
    for (const statement of node.source.sourceFile.statements) {
      if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const specifier = statement.moduleSpecifier.text;
      const edge = node.edges.find(candidate => candidate.specifier === specifier);
      if (edge?.resolution.kind !== 'local') continue;
      const forwarded = this.forwardedName(ts, statement, name);
      if (forwarded && this.isClientExport(graph, edge.resolution.file, forwarded, depth + 1)) return true;
    }
    return false;
  }

  /** The name an `export … from` statement forwards `name` as, or null when it does not export it. */
  private static forwardedName(ts: TsxSource['ts'], statement: TS.ExportDeclaration, name: string): string | null {
    const clause = statement.exportClause;
    if (!clause) return name; // export * from
    if (!ts.isNamedExports(clause)) return null;
    const element = clause.elements.find(candidate => candidate.name.text === name);
    return element ? (element.propertyName ?? element.name).text : null;
  }
}
