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
import { NextAppFiles } from '../../utils/react/next-app-files';
import {
  type GraphChoice,
  serverComponentGraph,
} from '../../utils/react/next-entries';
import type {
  NextModuleGraph,
  Visit,
  WalkResult,
} from '../../utils/react/next-module-graph';
import {
  hasDirective,
  NextSourcesLoader,
} from '../../utils/react/next-sources';
import { ReactProject } from '../../utils/react/react-project';
import type { ImportInfo, TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';
import { readProject } from './next-server-support';
import { propProblem } from './client-prop-problems';
import { notReadInWalk } from './next-walk-messages';

const MAX_REEXPORT_DEPTH = 8;
export class NextClientPropsSerializableLaw extends LawBase {
  static readonly LAW_NAME = 'Next Client Props Serializable';

  /**
   * Every import that renders: `require()` and `import()` are edges too (a
   * Server Component loaded through either still passes its props across the
   * boundary). A `'use client'` module is a node without edges: the law needs
   * to know which imported components are client ones.
   */
  static readonly GRAPH: GraphChoice = {
    require: true,
    dynamicImport: true,
    boundary: 'module',
  };

  static check(context: LawCheckContext): LawResult {
    const { graph, unread } = readProject(context);
    const apps = ReactProject.nextApps(context.projectRoot);
    if (!NextSourcesLoader.hasAppRouter({ apps }) && unread.length === 0) {
      return NextAppFiles.withoutSubject(
        this.LAW_NAME,
        'no app/ directory — Server Components and the props they serialize exist only in the App Router',
        context
      );
    }
    const violations: string[] = [];
    if (graph) {
      const walk = serverComponentGraph(graph, apps, this.GRAPH);
      for (const [file, visit] of walk.modules) {
        if (
          hasDirective(visit.source, 'use client') ||
          hasDirective(visit.source, 'use server')
        )
          continue;
        violations.push(
          ...this.checkServerModule(graph, walk, file, visit.source)
        );
      }
      violations.unshift(...graph.unread, ...notReadInWalk(graph, walk));
    } else {
      violations.push(...unread);
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
    graph: NextModuleGraph,
    walk: WalkResult,
    file: string,
    source: TsxSource
  ): string[] {
    const clientTags = this.clientComponentTags(walk, file);
    if (clientTags.size === 0) return [];
    const ts = source.ts;
    const where = graph.relative(file);
    const violations: string[] = [];
    for (const element of source.jsxElements()) {
      if (!clientTags.has(element.tag)) continue;
      for (const property of element.node.attributes.properties) {
        if (
          !ts.isJsxAttribute(property) ||
          !property.initializer ||
          !ts.isJsxExpression(property.initializer)
        )
          continue;
        const problem = propProblem(ts, property.initializer.expression);
        if (problem) {
          violations.push(
            `${where}:${source.lineOf(property)}: <${element.tag} ${property.name.getText(source.sourceFile)}={…}> ${problem}`
          );
        }
      }
      violations.push(
        ...this.childProblems(source, element.node, where, element.tag)
      );
    }
    return violations;
  }

  /** A function written as the child of a Client Component (`<List>{item => …}</List>`). */
  private static childProblems(
    source: TsxSource,
    opening: TS.JsxOpeningLikeElement,
    where: string,
    tag: string
  ): string[] {
    const ts = source.ts;
    if (!ts.isJsxOpeningElement(opening)) return [];
    return opening.parent.children
      .filter((child): child is TS.JsxExpression => ts.isJsxExpression(child))
      .map(child => ({ child, problem: propProblem(ts, child.expression) }))
      .filter(({ problem }) => problem !== null)
      .map(
        ({ child, problem }) =>
          `${where}:${source.lineOf(child)}: <${tag}> child ${problem}`
      );
  }

  /** Local JSX tag names in `file` that resolve to a `'use client'` module (through re-exports). */
  private static clientComponentTags(
    graph: WalkResult,
    file: string
  ): Set<string> {
    const tags = new Set<string>();
    const node = graph.modules.get(file);
    if (!node) return tags;
    for (const info of node.source.imports()) {
      if (info.typeOnly) continue;
      const edge = node.edges.find(
        candidate => candidate.specifier === info.module
      );
      if (edge?.resolution.kind === 'source')
        this.addClientTags(graph, info, edge.resolution.file, tags);
    }
    return this.expandNamespaces(node.source, tags);
  }

  private static addClientTags(
    graph: WalkResult,
    info: ImportInfo,
    target: string,
    tags: Set<string>
  ): void {
    if (info.defaultName && this.isClientExport(graph, target, 'default', 0))
      tags.add(info.defaultName);
    for (const named of info.named) {
      if (this.isClientExport(graph, target, named.imported, 0))
        tags.add(named.local);
    }
    if (info.namespaceName && this.isClientModule(graph, target))
      tags.add(`${info.namespaceName}.`);
  }

  /** `ns.` entries stand for every `<ns.X>` tag used in the module. */
  private static expandNamespaces(
    source: TsxSource,
    tags: Set<string>
  ): Set<string> {
    const prefixes = [...tags].filter(tag => tag.endsWith('.'));
    if (prefixes.length === 0) return tags;
    for (const element of source.jsxElements()) {
      if (prefixes.some(prefix => element.tag.startsWith(prefix)))
        tags.add(element.tag);
    }
    return tags;
  }

  private static isClientModule(graph: WalkResult, file: string): boolean {
    const node = graph.modules.get(file);
    return node !== undefined && hasDirective(node.source, 'use client');
  }

  /** True when `name` exported by `file` comes from a `'use client'` module, following `export … from`. */
  private static isClientExport(
    graph: WalkResult,
    file: string,
    name: string,
    depth: number
  ): boolean {
    if (this.isClientModule(graph, file)) return true;
    const node = graph.modules.get(file);
    if (!node || depth >= MAX_REEXPORT_DEPTH) return false;
    const ts = node.source.ts;
    for (const statement of node.source.sourceFile.statements) {
      const target = this.reexportTarget(node, statement);
      if (target === null) continue;
      const forwarded = this.forwardedName(ts, target.statement, name);
      if (
        forwarded &&
        this.isClientExport(graph, target.file, forwarded, depth + 1)
      )
        return true;
    }
    return false;
  }

  /** An `export … from 'x'` statement whose module resolved to a source file, with that file. */
  private static reexportTarget(
    node: Visit,
    statement: TS.Statement
  ): { statement: TS.ExportDeclaration; file: string } | null {
    const ts = node.source.ts;
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      return null;
    const specifier = statement.moduleSpecifier.text;
    const edge = node.edges.find(
      candidate => candidate.specifier === specifier
    );
    if (edge?.resolution.kind !== 'source') return null;
    return { statement, file: edge.resolution.file };
  }

  /** The name an `export … from` statement forwards `name` as, or null when it does not export it. */
  private static forwardedName(
    ts: TsxSource['ts'],
    statement: TS.ExportDeclaration,
    name: string
  ): string | null {
    const clause = statement.exportClause;
    if (!clause) return name; // export * from
    if (!ts.isNamedExports(clause)) return null;
    const element = clause.elements.find(
      candidate => candidate.name.text === name
    );
    return element ? (element.propertyName ?? element.name).text : null;
  }
}
