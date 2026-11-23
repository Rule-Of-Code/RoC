/**
 * Def-use of one Python statement: the names a simple statement or a
 * compound header binds and the names it reads (assignment and
 * augmented-assignment targets, tuple unpacking, walrus, `as`, `for`
 * targets), and the names it binds to a fresh mutable value.
 */

import { depthMap, matchingClose, splitTopLevel } from './expr-text';
import { pythonNames } from './python-expr';
import type { PyLiteral, PyNode } from './python-source';

const FRESH_MUTABLE =
  /^(?:\[.*\]|\{.*\}|(?:set|dict|list|defaultdict|deque|OrderedDict|Counter)\(.*\))$/;

/** Index of the assignment `=` at depth 0 (not `==`, `<=`, `:=`, …), and whether it is augmented. */
function assignmentOperators(
  text: string
): Array<{ at: number; augmented: boolean }> {
  const depths = depthMap(text);
  const out: Array<{ at: number; augmented: boolean }> = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '=' || depths[i] !== 0) continue;
    if (isComparison(text, i)) continue;
    const prev = text[i - 1] ?? '';
    out.push({ at: i, augmented: '+-*/%@&|^<>'.includes(prev) });
  }
  return out;
}

/** Is the `=` at `i` part of `==`, `!=`, `:=`, `<=` or `>=` rather than an assignment? */
function isComparison(text: string, i: number): boolean {
  const prev = text[i - 1] ?? '';
  if (text[i + 1] === '=' || prev === '=' || prev === '!' || prev === ':')
    return true;
  return (prev === '<' || prev === '>') && text[i - 2] !== prev;
}

/** Strip a depth-0 annotation (`x: int`) from an assignment target. */
function withoutAnnotation(target: string): string {
  const depths = depthMap(target);
  for (let i = 0; i < target.length; i++) {
    if (target[i] === ':' && depths[i] === 0) return target.slice(0, i).trim();
  }
  return target.trim();
}

/** Names an assignment target binds, and names its subscripts read. */
function targetNames(
  raw: string,
  literals: readonly PyLiteral[]
): { bound: string[]; used: string[] } {
  let target = withoutAnnotation(raw.replace(/[+\-*/%@&|^<>]+$/, ''))
    .replace(/^\*+/, '')
    .trim();
  const wrapped =
    /^[([]/.test(target) && matchingClose(target, 0) === target.length - 1;
  if (wrapped) target = target.slice(1, -1);
  const parts = splitTopLevel(target);
  if (parts.length > 1 || wrapped) {
    return parts
      .map(part => targetNames(part, literals))
      .reduce(
        (acc, r) => ({
          bound: [...acc.bound, ...r.bound],
          used: [...acc.used, ...r.used],
        }),
        {
          bound: [] as string[],
          used: [] as string[],
        }
      );
  }
  if (/^[A-Za-z_][\w.]*$/.test(target))
    return { bound: [target.replace(/\s+/g, '')], used: [] };
  const sub = /^([A-Za-z_][\w.]*)\s*\[/.exec(target);
  if (sub)
    return {
      bound: [sub[1] as string],
      used: pythonNames(target.slice(sub[0].length - 1), literals),
    };
  return { bound: [], used: pythonNames(target, literals) };
}

function walrusNames(text: string): string[] {
  return [...text.matchAll(/([A-Za-z_]\w*)\s*:=/g)].map(m => m[1] as string);
}

/** Bound and used names of a simple statement. */
export function simpleDefUse(
  text: string,
  literals: readonly PyLiteral[]
): { bound: string[]; used: string[]; mutable: string[] } {
  const imported = /^(?:from\s+\S+\s+)?import\s+(.+)$/.exec(text);
  if (imported) {
    const bound = splitTopLevel(
      (imported[1] as string).replace(/[()]/g, '')
    ).map(part => {
      const as = /\bas\s+(\w+)$/.exec(part);
      return as ? (as[1] as string) : (part.split('.')[0] as string).trim();
    });
    return { bound, used: [], mutable: [] };
  }
  const ops = assignmentOperators(text);
  if (ops.length === 0) {
    const annotated = /^([A-Za-z_][\w.]*)\s*:\s*\S/.exec(text);
    if (
      annotated &&
      !/^(?:return|yield|raise|assert|del|lambda)\b/.test(text)
    ) {
      return { bound: [annotated[1] as string], used: [], mutable: [] };
    }
    return {
      bound: walrusNames(text),
      used: pythonNames(text, literals),
      mutable: [],
    };
  }
  const last = ops[ops.length - 1] as { at: number; augmented: boolean };
  const value = text.slice(last.at + 1).trim();
  const bound: string[] = [];
  const used = pythonNames(value, literals);
  let from = 0;
  for (const op of ops) {
    const names = targetNames(text.slice(from, op.at), literals);
    bound.push(...names.bound);
    used.push(...names.used);
    if (op.augmented) used.push(...names.bound);
    from = op.at + 1;
  }
  bound.push(...walrusNames(value));
  return {
    bound,
    used,
    mutable: FRESH_MUTABLE.test(value) && !last.augmented ? bound : [],
  };
}

/** Bound and used names of a compound header. */
export function headerDefUse(
  node: PyNode,
  literals: readonly PyLiteral[]
): { bound: string[]; used: string[] } {
  const header = node.header;
  if (node.keyword === 'for' || node.keyword === 'async for') {
    const m = /^(.*?)\s+in\s+(.*)$/.exec(header);
    if (!m) return { bound: [], used: pythonNames(header, literals) };
    return {
      bound: targetNames(m[1] as string, literals).bound,
      used: pythonNames(m[2] as string, literals),
    };
  }
  if (
    node.keyword === 'with' ||
    node.keyword === 'async with' ||
    node.keyword?.startsWith('except')
  ) {
    const bound = [...header.matchAll(/\bas\s+([A-Za-z_]\w*)/g)].map(
      m => m[1] as string
    );
    return {
      bound,
      used: pythonNames(header.replace(/\bas\s+[A-Za-z_]\w*/g, ''), literals),
    };
  }
  return { bound: walrusNames(header), used: pythonNames(header, literals) };
}
