/**
 * Calls inside one Python statement: every call with its callee chain and
 * arguments. Text here is lexed text (string literals are `«n»`
 * placeholders, see python-source.ts).
 */

import type { CallArgument, CallSite, ChainLink } from './model';
import {
  depthMap,
  matchingClose,
  matchingOpen,
  splitTopLevel,
} from './expr-text';
import { isPyKeyword, pythonNames, renderPython } from './python-expr';
import type { PyLiteral } from './python-source';

/** Arguments of a call from the lexed text between its parentheses. */
export function pythonArguments(
  inner: string,
  literals: readonly PyLiteral[]
): CallArgument[] {
  return splitTopLevel(inner).map(part => {
    const kw = /^([A-Za-z_]\w*)\s*=(?!=)\s*/.exec(part);
    const valueText = kw ? part.slice(kw[0].length) : part;
    const lit = /^«(\d+)»$/.exec(valueText.trim());
    const literal = lit ? literals[Number(lit[1])] : undefined;
    return {
      text: renderPython(valueText, literals),
      literal: literal && !literal.formatted ? literal.value : null,
      keyword: kw ? (kw[1] as string) : null,
    };
  });
}

/** Split a callee into its links: `db.collection(«0»).document(uid).get`. */
export function pythonChain(
  callee: string,
  literals: readonly PyLiteral[]
): ChainLink[] {
  const links: ChainLink[] = [];
  const depths = depthMap(callee);
  let start = 0;
  const pieces: string[] = [];
  for (let i = 0; i <= callee.length; i++) {
    if (i === callee.length || (callee[i] === '.' && depths[i] === 0)) {
      pieces.push(callee.slice(start, i).trim());
      start = i + 1;
    }
  }
  for (const piece of pieces) {
    const name = /^[A-Za-z_]\w*/.exec(piece)?.[0] ?? piece;
    const open = piece.indexOf('(');
    const close = open >= 0 ? matchingClose(piece, open) : -1;
    links.push({
      name,
      args:
        open >= 0 && close > open
          ? pythonArguments(piece.slice(open + 1, close), literals)
          : null,
    });
  }
  return links;
}

function skipNameBack(text: string, i: number): number {
  let j = i;
  while (j >= 0 && /\w/.test(text[j] as string)) j--;
  return j;
}

/** Start of the callee chain that ends just before `paren`, or -1 when it is not a call. */
export function calleeStart(text: string, paren: number): number {
  let i = paren - 1;
  let start = -1;
  while (i >= 0) {
    const ch = text[i] as string;
    if (/\w/.test(ch)) {
      i = skipNameBack(text, i);
      start = i + 1;
      if (text[i] !== '.') return start;
      i--;
    } else if (ch === ')' || ch === ']') {
      const open = matchingOpen(text, i);
      if (open < 0) return -1;
      start = open;
      i = open - 1;
      if (!/[\w)\]]/.test(text[i] ?? '')) return start;
    } else {
      return start;
    }
  }
  return start;
}

/** Build a call site from the callee text and the index of its `(` in `text`. */
export function callAt(
  text: string,
  start: number,
  paren: number,
  line: number,
  literals: readonly PyLiteral[]
): CallSite | null {
  const close = matchingClose(text, paren);
  if (close < 0) return null;
  const calleeRaw = text.slice(start, paren).trim();
  const root = /^[A-Za-z_]\w*/.exec(calleeRaw)?.[0] ?? '';
  if (!root || (isPyKeyword(root) && root === calleeRaw)) return null;
  const chain = pythonChain(calleeRaw, literals);
  const method = chain[chain.length - 1]?.name ?? root;
  const lastDot = lastTopLevelDot(calleeRaw);
  const receiverRaw = lastDot < 0 ? '' : calleeRaw.slice(0, lastDot);
  const inner = text.slice(paren + 1, close);
  return {
    line,
    callee: renderPython(calleeRaw, literals),
    method,
    receiver: renderPython(receiverRaw, literals),
    args: pythonArguments(inner, literals),
    chain,
    text: renderPython(text.slice(start, close + 1), literals),
    names: pythonNames(`${receiverRaw} ${inner}`, literals),
  };
}

function lastTopLevelDot(text: string): number {
  const depths = depthMap(text);
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === '.' && depths[i] === 0) return i;
  }
  return -1;
}

/** Every call in a statement's text. */
export function pythonCalls(
  text: string,
  line: number,
  literals: readonly PyLiteral[]
): CallSite[] {
  const calls: CallSite[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '(') continue;
    const prev = text.slice(0, i).trimEnd();
    if (!/[\w)\]]$/.test(prev) || prev.length !== i) continue;
    const start = calleeStart(text, i);
    if (start < 0) continue;
    const call = callAt(text, start, i, line, literals);
    if (call) calls.push(call);
  }
  return calls;
}
