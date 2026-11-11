/**
 * The files of a Next.js app, read the way Next reads them.
 *
 * App Router: a route segment is a directory under `app/` (or `src/app/`); its
 * behaviour lives in special files named by convention — `page`, `layout`,
 * `loading`, `route`, … — with one of the default page extensions. A folder
 * named `_x` is private: it and everything under it is out of routing. A
 * folder named `(x)` is a route group and `@x` a parallel-route slot: both
 * are segments on disk that do not appear in the URL. A segment inherits from
 * every ancestor segment — layouts nest, and a `loading` file wraps the page
 * and every segment below it.
 *
 * Pages Router: every file under `pages/` (or `src/pages/`) is a route,
 * except `pages/api/**` (route handlers) and the `_app`, `_document` and
 * `_error` specials.
 *
 * Custom `pageExtensions` in next.config are not read: the four defaults are
 * what Next uses unless the project overrides them.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PathOperations } from '../path-operations';
import { type NextApp, ReactProject } from './react-project';
import type { TsxSource } from './tsx-source';

/** Next's default `pageExtensions`. */
export const NEXT_PAGE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/** The App Router's special files that this module classifies. */
export type AppFileKind =
  | 'default'
  | 'error'
  | 'global-error'
  | 'layout'
  | 'loading'
  | 'not-found'
  | 'page'
  | 'route'
  | 'template';

const APP_FILE = /^(page|layout|template|loading|error|global-error|not-found|route|default)\.(?:tsx|ts|jsx|js)$/;
const PAGES_SPECIAL = /^_(?:app|document|error)$/;
const PAGE_EXTENSION = /\.(?:tsx|ts|jsx|js)$/;

/** One file inside an App Router directory. */
export interface AppFile {
  app: NextApp;
  appDir: string;
  file: string;
  /** The special file this is, or null for any other module under `app/`. */
  kind: AppFileKind | null;
  /** The directory of the file — its route segment. */
  segmentDir: string;
}

/** One route file inside a Pages Router directory. */
export interface PagesFile {
  app: NextApp;
  pagesDir: string;
  file: string;
  /** `_app`, `_document`, `_error`, or null for a routed page. */
  special: string | null;
  /** True for `pages/api/**` — a route handler, not a page. */
  api: boolean;
  /** The URL the page serves (`/blog/[slug]`), '' for specials and API routes. */
  route: string;
}

/** `a/b/c` relative to `from`, forward slashes; null when outside it. */
function inside(from: string, file: string): string | null {
  const rel = PathOperations.getRelative(from, file).replace(/\\/g, '/');
  if (rel.startsWith('..') || PathOperations.isAbsolute(rel)) return null;
  return rel;
}

export class NextAppFiles {
  /**
   * Classify `file` against an App Router directory: null when the file is not
   * under it or sits in a private `_folder` (out of routing).
   */
  static appFile(app: NextApp, appDir: string, file: string): AppFile | null {
    const rel = inside(appDir, file);
    if (rel === null) return null;
    const parts = rel.split('/');
    if (parts.slice(0, -1).some(part => part.startsWith('_'))) return null;
    const match = APP_FILE.exec(parts[parts.length - 1] ?? '');
    return {
      app,
      appDir,
      file,
      kind: match ? (match[1] as AppFileKind) : null,
      segmentDir: PathOperations.getDirectory(file),
    };
  }

  /** Every scanned file under an App Router directory of any Next app. */
  static appFiles(apps: readonly NextApp[], files: readonly string[]): AppFile[] {
    const found: AppFile[] = [];
    for (const file of files) {
      const owner = this.owningAppDir(apps, file);
      if (!owner) continue;
      const appFile = this.appFile(owner.app, owner.appDir, file);
      if (appFile) found.push(appFile);
    }
    return found;
  }

  /** Every scanned page-extension file under a Pages Router directory. */
  static pagesFiles(apps: readonly NextApp[], files: readonly string[]): PagesFile[] {
    const found: PagesFile[] = [];
    for (const app of apps) {
      for (const pagesDir of app.pagesDirs) {
        for (const file of files) {
          const rel = inside(pagesDir, file);
          if (rel === null || !PAGE_EXTENSION.test(rel)) continue;
          found.push(this.pagesFile(app, pagesDir, file, rel));
        }
      }
    }
    return found;
  }

  private static pagesFile(app: NextApp, pagesDir: string, file: string, rel: string): PagesFile {
    const withoutExt = rel.replace(PAGE_EXTENSION, '');
    const special = PAGES_SPECIAL.test(withoutExt) ? withoutExt : null;
    const api = withoutExt === 'api' || withoutExt.startsWith('api/');
    const route =
      special || api ? '' : `/${withoutExt.replace(/(?:^|\/)index$/, '')}`.replace(/\/$/, '') || '/';
    return { app, pagesDir, file, special, api, route };
  }

  /** The deepest App Router directory containing `file`, with its app. */
  static owningAppDir(
    apps: readonly NextApp[],
    file: string
  ): { app: NextApp; appDir: string } | null {
    let best: { app: NextApp; appDir: string } | null = null;
    for (const app of apps) {
      for (const appDir of app.appDirs) {
        if (inside(appDir, file) === null) continue;
        if (!best || appDir.length > best.appDir.length) best = { app, appDir };
      }
    }
    return best;
  }

  /** `segmentDir`, then each parent up to and including `appDir`. */
  static segmentChain(appDir: string, segmentDir: string): string[] {
    const chain: string[] = [];
    let dir = segmentDir;
    for (;;) {
      chain.push(dir);
      if (PathOperations.normalize(dir) === PathOperations.normalize(appDir)) break;
      const parent = PathOperations.getDirectory(dir);
      if (parent === dir || inside(appDir, parent) === null) break;
      dir = parent;
    }
    return chain;
  }

  /** The URL a segment directory serves: route groups and slots removed. */
  static routeOf(appDir: string, segmentDir: string): string {
    const rel = inside(appDir, segmentDir) ?? '';
    const parts = rel
      .split('/')
      .filter(part => part !== '' && !/^\(.*\)$/.test(part) && !part.startsWith('@'));
    return `/${parts.join('/')}`;
  }

  /** The special file of `kind` directly in `dir`, among `appFiles`. */
  static specialIn(appFiles: readonly AppFile[], dir: string, kind: AppFileKind): AppFile | undefined {
    const wanted = PathOperations.normalize(dir);
    return appFiles.find(
      appFile => appFile.kind === kind && PathOperations.normalize(appFile.segmentDir) === wanted
    );
  }

  /** The routed pages of the App Router: `page.*` files outside private folders. */
  static pages(appFiles: readonly AppFile[]): AppFile[] {
    return appFiles.filter(appFile => appFile.kind === 'page');
  }

  /**
   * Passing result for a law about one router when no app declares that
   * router's directory: the subject does not exist, and the message says so
   * rather than "compliance verified".
   */
  static withoutSubject(lawName: string, subject: string, context: LawCheckContext): LawResult {
    return {
      lawName: lawName.toLowerCase().replace(/\s+/g, '-'),
      passed: true,
      message: `${lawName}: ${subject}`,
      violations: [],
      suggestions: [],
      score: 100,
      config: context.config,
    };
  }

  /** The violation a law gives when `next` is declared but no router directory exists. */
  static noRouterDirectory(context: LawCheckContext): string {
    return `${ReactProject.relative(context, context.projectRoot) || '.'}: \`next\` is declared but no app/, src/app/, pages/ or src/pages/ directory was found beside any package.json declaring it — no route was inspected`;
  }
}

/** A name exported by a module, with the node that defines it. */
export interface ExportedBinding {
  name: string;
  /** The declaration, or the local declaration an `export { x }` points at, when found. */
  node: TS.Node;
  /** The value: a variable's initializer, the function itself, an `export default` expression. */
  value: TS.Node | undefined;
}

/** The local top-level declaration named `name`: a function, class, or variable. */
function localDeclaration(source: TsxSource, name: string): ExportedBinding | null {
  const ts = source.ts;
  for (const statement of source.sourceFile.statements) {
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name?.text === name) {
      return { name, node: statement, value: statement };
    }
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
        return { name, node: declaration, value: declaration.initializer };
      }
    }
  }
  return null;
}

function hasExportModifier(ts: TsxSource['ts'], node: TS.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
}

function hasDefaultModifier(ts: TsxSource['ts'], node: TS.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
}

function exportsOfStatement(source: TsxSource, statement: TS.Statement): ExportedBinding[] {
  const ts = source.ts;
  if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
    const expression = statement.expression;
    const local = ts.isIdentifier(expression) ? localDeclaration(source, expression.text) : null;
    return [{ name: 'default', node: local?.node ?? statement, value: local ? local.value : expression }];
  }
  if (ts.isExportDeclaration(statement)) {
    if (statement.isTypeOnly || !statement.exportClause || !ts.isNamedExports(statement.exportClause)) return [];
    return statement.exportClause.elements
      .filter(element => !element.isTypeOnly)
      .map(element => {
        const local = statement.moduleSpecifier
          ? null
          : localDeclaration(source, (element.propertyName ?? element.name).text);
        return { name: element.name.text, node: local?.node ?? element, value: local?.value };
      });
  }
  if (!hasExportModifier(ts, statement)) return [];
  if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) {
    const name = hasDefaultModifier(ts, statement) ? 'default' : (statement.name?.text ?? 'default');
    return [{ name, node: statement, value: statement }];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter(declaration => ts.isIdentifier(declaration.name))
      .map(declaration => ({
        name: (declaration.name as TS.Identifier).text,
        node: declaration,
        value: declaration.initializer,
      }));
  }
  return [];
}

/** Every value a module exports, by exported name (type-only exports excluded). */
export function exportedBindings(source: TsxSource): Map<string, ExportedBinding> {
  const bindings = new Map<string, ExportedBinding>();
  for (const statement of source.sourceFile.statements) {
    for (const binding of exportsOfStatement(source, statement)) bindings.set(binding.name, binding);
  }
  return bindings;
}

/** Peel parentheses, `as`, `satisfies` and `!` off an expression. */
export function unwrapExpression(ts: TsxSource['ts'], node: TS.Node | undefined): TS.Node | undefined {
  let current = node;
  while (
    current &&
    (ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isNonNullExpression(current) ||
      ts.isTypeAssertionExpression(current))
  ) {
    current = current.expression;
  }
  return current;
}

/** True when a function-like node is declared `async`. */
export function isAsyncFunction(ts: TsxSource['ts'], node: TS.Node | undefined): boolean {
  const fn = unwrapExpression(ts, node);
  if (
    !fn ||
    !(ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn) || ts.isArrowFunction(fn))
  ) {
    return false;
  }
  return ts.getModifiers(fn)?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword) ?? false;
}

/** The local names bound to `imported` (or the default, with 'default') from `module`. */
export function importedNames(source: TsxSource, modules: readonly string[], imported: string): Set<string> {
  const names = new Set<string>();
  for (const info of source.imports()) {
    if (info.typeOnly || !modules.includes(info.module)) continue;
    if (imported === 'default' && info.defaultName) names.add(info.defaultName);
    for (const named of info.named) if (named.imported === imported) names.add(named.local);
  }
  return names;
}

/** Local namespace or default names bound to `module` (`import * as React`, `import React`). */
export function namespaceNames(source: TsxSource, module: string): Set<string> {
  const names = new Set<string>();
  for (const info of source.imports()) {
    if (info.typeOnly || info.module !== module) continue;
    if (info.namespaceName) names.add(info.namespaceName);
    if (info.defaultName) names.add(info.defaultName);
  }
  return names;
}
