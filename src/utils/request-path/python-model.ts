/**
 * Python block tree → the request-path model (see model.ts).
 *
 * Per function: its statement lists, the outermost awaits of each statement,
 * the names each statement binds and reads (simple def-use: assignment and
 * augmented-assignment targets, tuple unpacking, walrus, `as`, `for`
 * targets), the awaited calls that run once per iteration of a loop in the
 * same function (`for`, `async for`, `while`, and the element of a
 * comprehension), and every call. A nested `def` is a function of its own:
 * what it awaits runs when it is called, not where it is defined.
 */

import type { FunctionModel, ImportBinding, ModuleModel } from './model';
import { matchingClose, splitTopLevel } from './expr-text';
import { renderPython } from './python-expr';
import {
  FUNCTION_KEYWORDS,
  isLiteralDisplay,
  walkBlock,
} from './python-statements';
import {
  lexPython,
  pythonTree,
  type PyLiteral,
  type PyNode,
} from './python-source';

const TRANSACTION_PARAM = /^(?:transaction|txn|tx)$/;

function paramsOf(header: string): string[] {
  const open = header.indexOf('(');
  const close = open >= 0 ? matchingClose(header, open) : -1;
  if (close < 0) return [];
  return splitTopLevel(header.slice(open + 1, close))
    .map(part => /^\**\s*([A-Za-z_]\w*)/.exec(part)?.[1] ?? '')
    .filter(Boolean);
}

function newFunction(
  node: PyNode,
  prefix: string,
  decorators: readonly string[],
  literals: readonly PyLiteral[]
): FunctionModel {
  const shortName = /^([A-Za-z_]\w*)/.exec(node.header)?.[1] ?? '<anonymous>';
  const params = paramsOf(node.header);
  return {
    decorators: decorators.map(d => renderPython(d, literals)),
    name: prefix ? `${prefix}.${shortName}` : shortName,
    shortName,
    line: node.line,
    endLine: node.endLine,
    isAsync: node.keyword === 'async def',
    params,
    blocks: [],
    loopAwaits: [],
    calls: [],
    nameUses: new Map(),
    transactional:
      decorators.some(d => /transaction/i.test(d)) ||
      params.some(p => TRANSACTION_PARAM.test(p)),
  };
}

/** Every def in a node list (methods and nested functions included). */
interface ModuleContext {
  literals: readonly PyLiteral[];
  literalCollections: ReadonlySet<string>;
}

function collectFunctions(
  nodes: readonly PyNode[],
  prefix: string,
  module: ModuleContext,
  out: FunctionModel[]
): void {
  let decorators: string[] = [];
  for (const node of nodes) {
    if (node.keyword === '@') {
      decorators.push(node.header);
      continue;
    }
    if (node.keyword !== null && FUNCTION_KEYWORDS.has(node.keyword)) {
      const fn = newFunction(node, prefix, decorators, module.literals);
      walkBlock(node.children, {
        fn,
        literals: module.literals,
        loops: [],
        literalCollections: module.literalCollections,
      });
      out.push(fn);
      collectFunctions(node.children, fn.name, module, out);
    } else if (node.keyword === 'class') {
      const name = /^([A-Za-z_]\w*)/.exec(node.header)?.[1] ?? '';
      collectFunctions(
        node.children,
        prefix ? `${prefix}.${name}` : name,
        module,
        out
      );
    } else if (node.children.length > 0) {
      collectFunctions(node.children, prefix, module, out);
    }
    decorators = [];
  }
}

const COLLECTION_ASSIGNMENT = /^([A-Za-z_]\w*)\s*(?::\s*[^=]+)?=\s*(.+)$/s;

/** Module-level `RULES = ("a", "b")` / `[…]` / `{…}`: names bound to a literal display. */
function literalCollectionsOf(nodes: readonly PyNode[]): Set<string> {
  const names = new Set<string>();
  for (const node of nodes) {
    const m =
      node.keyword === null ? COLLECTION_ASSIGNMENT.exec(node.text) : null;
    if (m && isLiteralDisplay(m[2] as string)) names.add(m[1] as string);
  }
  return names;
}

const NAME_AS = /^([A-Za-z_]\w*)(?:\s+as\s+([A-Za-z_]\w*))?$/;
const DOTTED_AS = /^([A-Za-z_][\w.]*)(?:\s+as\s+([A-Za-z_]\w*))?$/;

/** The bindings of one `from m import …` or `import …` statement. */
function importBindings(text: string): ImportBinding[] {
  const from = /^from\s+(\S+)\s+import\s+(.+)$/.exec(text);
  if (from) {
    return splitTopLevel((from[2] as string).replace(/[()]/g, ''))
      .map(part => NAME_AS.exec(part.trim()))
      .filter((m): m is RegExpExecArray => m !== null)
      .map(m => ({
        local: m[2] ?? (m[1] as string),
        module: from[1] as string,
        imported: m[1] as string,
      }));
  }
  const plain = /^import\s+(.+)$/.exec(text);
  if (!plain) return [];
  return splitTopLevel(plain[1] as string)
    .map(part => DOTTED_AS.exec(part.trim()))
    .filter((m): m is RegExpExecArray => m !== null)
    .map(m => ({
      local: m[2] ?? (m[1] as string),
      module: m[1] as string,
      imported: null,
    }));
}

function importsOf(nodes: readonly PyNode[]): ImportBinding[] {
  return nodes
    .filter(node => node.keyword === null)
    .flatMap(node => importBindings(node.text));
}

const STRING_CONSTANT = /^([A-Za-z_]\w*)\s*(?::\s*[\w[\]., ]+)?=\s*«(\d+)»$/;

/** Module-level `NAME = "literal"` (an annotation such as `Final` allowed). */
function constantsOf(
  nodes: readonly PyNode[],
  literals: readonly PyLiteral[]
): Map<string, string> {
  const constants = new Map<string, string>();
  for (const node of nodes) {
    const m = node.keyword === null ? STRING_CONSTANT.exec(node.text) : null;
    const literal = m ? literals[Number(m[2])] : undefined;
    if (m && literal && !literal.formatted)
      constants.set(m[1] as string, literal.value);
  }
  return constants;
}

/** Parse a Python module into the request-path model. Never throws. */
export function pythonModule(
  file: string,
  rel: string,
  content: string
): ModuleModel {
  const { code, literals } = lexPython(content);
  const tree = pythonTree(code);
  const functions: FunctionModel[] = [];
  const literalCollections = literalCollectionsOf(tree);
  collectFunctions(tree, '', { literals, literalCollections }, functions);
  return {
    file,
    rel,
    language: 'python',
    functions,
    imports: importsOf(tree),
    constants: constantsOf(tree, literals),
    literalCollections,
    lines: content.split(/\r\n|\r|\n/),
  };
}
