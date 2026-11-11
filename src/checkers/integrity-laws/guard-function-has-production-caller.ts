/**
 * Guard Function Has Production Caller
 *
 * A function such as `requirePermission` or `scheduleDeletion` is written and
 * thoroughly tested; the call in the real path never lands — it was on
 * another branch, or dropped in a conflict. The suite proves the guard works;
 * nothing proves the guard runs. Unused-export tools stay quiet, because the
 * test file imports it.
 *
 * Exported functions whose name starts with a guard prefix (a camelCase word:
 * `requireAdmin`, not `requirement`) must have at least one reference outside
 * test files. References are identifiers in the syntax tree — so comments and
 * strings never count — excluding the declaration itself, recursion inside
 * its own body, and import/export plumbing (a barrel re-export is not a call).
 * A function passed by reference counts.
 */

import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject, REACT_TEST_FILE } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

/** The default guard prefixes (thresholds.integrity.guardPrefixes replaces them). */
export const DEFAULT_GUARD_PREFIXES = ['assert', 'require', 'enforce', 'verify', 'check', 'schedule'];

/** Directory names that hold tests, fixtures and mocks — never production callers. */
export const TEST_DIRECTORIES = ['__tests__', '__mocks__', '__fixtures__', 'test', 'tests', 'e2e', 'cypress', 'spec', 'specs'];

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const TYPESCRIPT_FILE = /\.(?:ts|tsx|mts|cts)$/;
const STORY_FILE = /\.stories\.[cm]?[jt]sx?$/;

interface Guard {
  name: string;
  file: string;
  line: number;
  /** The declaration's span: references inside it are recursion, not callers. */
  start: number;
  end: number;
}

/** A path segment test: does `file` live under a test directory? */
function inTestDirectory(file: string): boolean {
  const segments = file.replace(/\\/g, '/').split('/');
  return segments.slice(0, -1).some(segment => TEST_DIRECTORIES.includes(segment));
}

export class GuardFunctionHasProductionCallerLaw extends LawBase {
  static readonly LAW_NAME = 'Guard Function Has Production Caller';

  static check(context: LawCheckContext): LawResult {
    return this.createResult(
      this.findings(context),
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        'Call the guard on the real path it protects, or delete it if the feature was dropped',
        'If the caller is on an unmerged branch, merge it before the guard is trusted',
      ],
      context
    );
  }

  /** The configured prefixes, or why they cannot be used. */
  static prefixes(context: LawCheckContext): string[] | string {
    const configured = (context.config.thresholds as { integrity?: { guardPrefixes?: unknown } } | undefined)
      ?.integrity?.guardPrefixes;
    if (configured === undefined) return DEFAULT_GUARD_PREFIXES;
    if (!Array.isArray(configured) || !configured.every(p => typeof p === 'string' && /^[A-Za-z_$][\w$]*$/.test(p))) {
      return 'thresholds.integrity.guardPrefixes must be a list of identifier prefixes (e.g. ["require", "assert"])';
    }
    if (configured.length === 0) {
      return 'thresholds.integrity.guardPrefixes is empty, so no function would be checked — disable the law instead of emptying its list';
    }
    return configured as string[];
  }

  private static findings(context: LawCheckContext): string[] {
    const prefixes = this.prefixes(context);
    if (typeof prefixes === 'string') return [prefixes];
    const files = ReactProject.sourceFiles(context, SOURCE_EXTENSIONS).filter(
      file => !REACT_TEST_FILE.test(file) && !STORY_FILE.test(file) && !inTestDirectory(ReactProject.relative(context, file))
    );
    if (files.length === 0) {
      return ['no TypeScript source file was scanned — check the ignores; a law that read nothing does not pass'];
    }
    const { sources, unread } = ReactProject.parse(context, files);
    const pattern = new RegExp(`^(?:${prefixes.join('|')})(?=[A-Z0-9_$]|$)`);
    const guards = sources
      .filter(source => TYPESCRIPT_FILE.test(source.fileName))
      .flatMap(source => this.guardsIn(source, pattern));
    const called = this.referenced(sources, guards);
    return [
      ...unread.map(reason => `${reason} — guards and their callers there were NOT inspected`),
      ...guards
        .filter(guard => !called.has(guard))
        .map(
          guard =>
            `${ReactProject.relative(context, guard.file)}:${guard.line}: ${guard.name} is exported as a guard but nothing outside the tests references it — the tests prove it works, nothing proves it runs`
        ),
    ];
  }

  /** Exported function declarations and exported `const x = () => …` / `function` expressions. */
  private static guardsIn(source: TsxSource, pattern: RegExp): Guard[] {
    const ts = source.ts;
    const guards: Guard[] = [];
    const add = (name: TS.Identifier, declaration: TS.Node): void => {
      if (!pattern.test(name.text)) return;
      guards.push({
        name: name.text,
        file: source.fileName,
        line: source.lineOf(name),
        start: declaration.getStart(source.sourceFile),
        end: declaration.getEnd(),
      });
    };
    for (const statement of source.sourceFile.statements) {
      if (!this.isExported(ts, statement)) continue;
      if (ts.isFunctionDeclaration(statement) && statement.name) add(statement.name, statement);
      if (!ts.isVariableStatement(statement)) continue;
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && this.isFunction(ts, declaration.initializer)) {
          add(declaration.name, declaration);
        }
      }
    }
    return guards;
  }

  private static isExported(ts: TsxSource['ts'], statement: TS.Statement): boolean {
    return (
      ts.canHaveModifiers(statement) &&
      (ts.getModifiers(statement) ?? []).some(m => m.kind === ts.SyntaxKind.ExportKeyword)
    );
  }

  private static isFunction(ts: TsxSource['ts'], init: TS.Expression | undefined): boolean {
    return init !== undefined && (ts.isArrowFunction(init) || ts.isFunctionExpression(init));
  }

  /** The guards that have at least one reference in `sources` other than themselves. */
  private static referenced(sources: TsxSource[], guards: Guard[]): Set<Guard> {
    const byName = new Map<string, Guard[]>();
    for (const guard of guards) byName.set(guard.name, [...(byName.get(guard.name) ?? []), guard]);
    const called = new Set<Guard>();
    const names = [...byName.keys()];
    for (const source of sources) {
      if (!names.some(name => source.text.includes(name))) continue;
      const aliases = this.importAliases(source, byName);
      source.walk(node => {
        if (!source.ts.isIdentifier(node) || this.isPlumbing(source.ts, node)) return;
        const name = aliases.get(node.text) ?? node.text;
        for (const guard of byName.get(name) ?? []) {
          const own =
            guard.file === source.fileName && node.getStart(source.sourceFile) >= guard.start && node.getEnd() <= guard.end;
          if (!own) called.add(guard);
        }
      });
    }
    return called;
  }

  /** `import { requireAdmin as mustBeAdmin }` → mustBeAdmin refers to requireAdmin. */
  private static importAliases(source: TsxSource, byName: Map<string, Guard[]>): Map<string, string> {
    const aliases = new Map<string, string>();
    source.walk(node => {
      if (!source.ts.isImportSpecifier(node)) return;
      const imported = (node.propertyName ?? node.name).text;
      if (byName.has(imported)) aliases.set(node.name.text, imported);
    });
    return aliases;
  }

  /** An identifier that names something rather than using it: declarations, keys, import/export lists. */
  private static isPlumbing(ts: TsxSource['ts'], node: TS.Identifier): boolean {
    const parent = node.parent;
    if (
      ts.isImportSpecifier(parent) ||
      ts.isImportClause(parent) ||
      ts.isNamespaceImport(parent) ||
      ts.isExportSpecifier(parent) ||
      ts.isTypeQueryNode(parent)
    ) {
      return true;
    }
    const named = parent as { name?: TS.Node };
    return (
      named.name === node &&
      (ts.isFunctionDeclaration(parent) ||
        ts.isVariableDeclaration(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isPropertyAssignment(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isMethodSignature(parent) ||
        ts.isParameter(parent) ||
        ts.isClassDeclaration(parent))
    );
  }
}
