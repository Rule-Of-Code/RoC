/**
 * The module that mounts a React app: it calls react-dom's `createRoot` or
 * `hydrateRoot` and exports no component (#12, QA on #631).
 *
 * Read from the syntax tree. A mount counts only when `createRoot` /
 * `hydrateRoot` comes from `react-dom/client` or `react-dom`, called by the
 * name it was imported as or through that import's namespace or default
 * binding (`ReactDOM.createRoot(…)`). A method of another object
 * (`treeFactory.createRoot('x')`), a call in a string or a comment, and a
 * name that was not imported from react-dom are not a mount. A module that
 * also exports a component — a default export, or an exported name that
 * starts with a capital letter — is a component module (a portal that calls
 * `createRoot` in an effect, a `main.tsx` that exports `Counter`) and still
 * needs its test. Without the typescript package nothing is taken for the
 * entry: every module keeps needing a test.
 */

import type * as TS from 'typescript';

import {
  internalArray,
  loadTypeScript,
  TsxSource,
  type TypeScriptModule,
} from '../../../../utils/react/tsx-source';

const REACT_DOM = new Set(['react-dom/client', 'react-dom']);
const MOUNTS = new Set(['createRoot', 'hydrateRoot']);
const COMPONENT_NAME = /^[A-Z]/;

/** Whether `content` (the module at `file`) is the app's mount-only entry. */
export function isMountOnlyEntry(
  projectRoot: string,
  file: string,
  content: string
): boolean {
  const ts = loadTypeScript(projectRoot);
  if (!ts) return false;
  const source = TsxSource.parse(ts, file, content);
  if (source.parseErrors().length > 0) return false;
  return mountsWithReactDom(ts, source) && !exportsComponent(ts, source);
}

/** A call of react-dom's createRoot / hydrateRoot, by its import. */
function mountsWithReactDom(ts: TypeScriptModule, source: TsxSource): boolean {
  const named = new Set<string>();
  const namespaces = new Set<string>();
  for (const declaration of source.imports()) {
    if (declaration.typeOnly || !REACT_DOM.has(declaration.module)) continue;
    for (const { imported, local } of declaration.named) {
      if (MOUNTS.has(imported)) named.add(local);
    }
    if (declaration.namespaceName) namespaces.add(declaration.namespaceName);
    if (declaration.defaultName) namespaces.add(declaration.defaultName);
  }
  let mounts = false;
  source.walk(node => {
    if (mounts || !ts.isCallExpression(node)) return;
    const callee = node.expression;
    mounts =
      (ts.isIdentifier(callee) && named.has(callee.text)) ||
      (ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        namespaces.has(callee.expression.text) &&
        MOUNTS.has(callee.name.text));
  });
  return mounts;
}

/** A default export, or an exported name that starts with a capital letter. */
function exportsComponent(ts: TypeScriptModule, source: TsxSource): boolean {
  let found = false;
  source.walk(node => {
    if (found) return;
    if (ts.isExportAssignment(node)) {
      found = true;
    } else if (ts.isExportDeclaration(node)) {
      // `export * from …` may re-export a component: counted as one.
      found = exportedNames(ts, node).some(
        name => name === '*' || COMPONENT_NAME.test(name)
      );
    } else if (hasExportModifier(ts, node)) {
      found =
        hasDefaultModifier(ts, node) ||
        declaredNames(ts, node).some(name => COMPONENT_NAME.test(name));
    }
  });
  return found;
}

/** A node's modifiers, on any TypeScript the project loads (getModifiers is 4.8+). */
function modifiersOf(ts: TypeScriptModule, node: TS.Node): readonly TS.Node[] {
  if (typeof ts.canHaveModifiers === 'function') {
    return ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : [];
  }
  return internalArray<TS.Node>(node, 'modifiers');
}

function hasExportModifier(ts: TypeScriptModule, node: TS.Node): boolean {
  return modifiersOf(ts, node).some(
    modifier => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
}

function hasDefaultModifier(ts: TypeScriptModule, node: TS.Node): boolean {
  return modifiersOf(ts, node).some(
    modifier => modifier.kind === ts.SyntaxKind.DefaultKeyword
  );
}

/** `export { A, b as C } [from …]` → the exported names; `export *` → none known. */
function exportedNames(
  ts: TypeScriptModule,
  node: TS.ExportDeclaration
): string[] {
  const clause = node.exportClause;
  if (!clause) return ['*'];
  return ts.isNamedExports(clause)
    ? clause.elements.map(element => element.name.text)
    : [clause.name.text];
}

/** The names an exported declaration binds. */
function declaredNames(ts: TypeScriptModule, node: TS.Node): string[] {
  if (
    (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) &&
    node.name
  ) {
    return [node.name.text];
  }
  if (ts.isVariableStatement(node)) {
    return node.declarationList.declarations.flatMap(declaration =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : []
    );
  }
  return [];
}
