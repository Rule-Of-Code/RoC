/**
 * `urljoin(base, url)` in Python: a `//host/...` url replaces the host
 * (urllib.parse documents it, and warns against an attacker-controlled url).
 *
 * Read as text, not parsed: each `urljoin(` call's two arguments (balanced
 * parentheses), the enclosing `def` (by indentation) with its parameters and
 * decorators, and the assignments above the call in that function. The url
 * argument comes from the request when it names `request`/`req`, a parameter
 * of a route handler (a function with a request parameter or an
 * `@app.get(...)`-style route decorator), or a local assigned from one. It is
 * forwarded when the call sits in an HTTP client call (requests, httpx,
 * aiohttp, a `*client`/`*session` object, urlopen) or is assigned to a name
 * that such a call later receives in the same function.
 */

import { QUOTE_LENGTH, type UpstreamCall } from './proxy-target';

const URLJOIN = /\burljoin\s*\(/g;
const STRING_LITERAL = /^[rbuRBU]*(["'])[^"'{}]*\1$/;
const REQUEST_WORD = /\b(?:request|req)\b/;
const ROUTE_DECORATOR =
  /^\s*@\w+(?:\.\w+)*\.(?:get|post|put|patch|delete|head|options|api_route|route|websocket)\s*\(/;
const HTTP_CALL =
  /\b(?:requests|httpx|aiohttp|urllib3|\w*client|\w*session|\w*http)\s*\.\s*(?:get|post|put|patch|delete|head|options|request|stream|send|build_request|fetch)\s*\(|\burlopen\s*\(/i;
const DEF = /^(\s*)(?:async\s+)?def\s+\w+\s*\(/;
const IDENTIFIER = /\b[A-Za-z_]\w*\b/g;
const MAX_HOPS = 4;

interface PyFunction {
  start: number;
  end: number;
  params: string[];
  handler: boolean;
}

/** The text of a call's argument list from `open` (the index of `(`), split at top-level commas. */
export function callArguments(
  text: string,
  open: number
): { args: string[]; end: number } {
  const args: string[] = [];
  const state = { depth: 0, quote: null as string | null };
  let current = '';
  for (let i = open; i < text.length; i++) {
    const c = text[i] ?? '';
    const step = scan(state, c, text[i - 1] ?? '');
    if (step === 'close')
      return {
        args: [...args, current.trim()].filter(arg => arg !== ''),
        end: i,
      };
    if (step === 'comma') {
      args.push(current.trim());
      current = '';
    } else if (step === 'text') {
      current += c;
    }
  }
  return { args, end: text.length };
}

/** One character of an argument list: part of an argument, the opening bracket, a separator, or the close. */
function scan(
  state: { depth: number; quote: string | null },
  c: string,
  previous: string
): 'close' | 'comma' | 'open' | 'text' {
  if (state.quote) {
    if (c === state.quote && previous !== '\\') state.quote = null;
    return 'text';
  }
  if (c === '"' || c === "'") {
    state.quote = c;
    return 'text';
  }
  if ('([{'.includes(c)) return ++state.depth === 1 ? 'open' : 'text';
  if (')]}'.includes(c)) return --state.depth === 0 ? 'close' : 'text';
  return c === ',' && state.depth === 1 ? 'comma' : 'text';
}

const indentOf = (line: string): number =>
  (/^\s*/.exec(line)?.[0] ?? '').length;
const isCode = (line: string): boolean =>
  line.trim() !== '' && !line.trim().startsWith('#');

/** The `def` that holds line `index` (0-based), with its body's line range. */
function enclosingFunction(lines: string[], index: number): PyFunction | null {
  const indent = indentOf(lines[index] ?? '');
  for (let i = index; i >= 0; i--) {
    const def = DEF.exec(lines[i] ?? '');
    if (!def || (def[1] ?? '').length >= indent) continue;
    const defIndent = (def[1] ?? '').length;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      if (
        isCode(lines[j] ?? '') &&
        indentOf(lines[j] ?? '') <= defIndent &&
        !/^\s*[)\]]/.test(lines[j] ?? '')
      ) {
        end = j;
        break;
      }
    }
    const signature = lines.slice(i, Math.min(i + 8, lines.length)).join('\n');
    const { args } = callArguments(signature, signature.indexOf('('));
    const params = args
      .map(arg => /^\**([A-Za-z_]\w*)/.exec(arg)?.[1] ?? '')
      .filter(name => name !== '' && name !== 'self');
    const decorated = lines
      .slice(Math.max(0, i - 4), i)
      .some(line => ROUTE_DECORATOR.test(line));
    return {
      start: i,
      end,
      params,
      handler:
        decorated ||
        args.some(arg => REQUEST_WORD.test(arg) || /:\s*Request\b/.test(arg)),
    };
  }
  return null;
}

/** Does `expression`, in `fn` above line `before`, come from the request? */
function fromRequest(
  expression: string,
  lines: string[],
  fn: PyFunction | null,
  before: number,
  hops: number
): boolean {
  if (REQUEST_WORD.test(expression)) return true;
  if (!fn || hops > MAX_HOPS) return false;
  for (const name of expression.match(IDENTIFIER) ?? []) {
    if (fn.handler && fn.params.includes(name)) return true;
    for (let i = before - 1; i > fn.start; i--) {
      const assigned = new RegExp(
        `^\\s*${name}\\s*(?::[^=]+)?=(?!=)\\s*(.+)$`
      ).exec(lines[i] ?? '');
      if (assigned) {
        if (fromRequest(assigned[1] ?? '', lines, fn, i, hops + 1)) return true;
        break;
      }
    }
  }
  return false;
}

/** Is the urljoin at `offset` (line `index`) handed to an HTTP client? */
function forwarded(
  lines: string[],
  index: number,
  column: number,
  fn: PyFunction | null
): boolean {
  const line = lines[index] ?? '';
  if (HTTP_CALL.test(line.slice(0, column))) return true;
  const assigned = /^\s*([A-Za-z_]\w*)\s*(?::[^=]+)?=\s*$/.exec(
    line.slice(0, column)
  );
  if (!assigned) return false;
  const name = assigned[1] ?? '';
  const end = fn ? fn.end : lines.length;
  for (let i = index + 1; i < end; i++) {
    const later = lines[i] ?? '';
    if (HTTP_CALL.test(later) && new RegExp(`\\b${name}\\b`).test(later))
      return true;
  }
  return false;
}

/** Every two-argument `urljoin` call in a Python file, with its verdict. */
export function pythonUpstreamCalls(text: string): UpstreamCall[] {
  const lines = text.split(/\r?\n/);
  const calls: UpstreamCall[] = [];
  for (const match of text.matchAll(URLJOIN)) {
    const offset = match.index ?? 0;
    const before = text.slice(0, offset);
    const index = before.split('\n').length - 1;
    const column = offset - (before.lastIndexOf('\n') + 1);
    if ((lines[index] ?? '').slice(0, column).includes('#')) continue;
    const { args } = callArguments(text, offset + match[0].length - 1);
    const url = args[1];
    if (args.length < 2 || url === undefined) continue;
    const fn = enclosingFunction(lines, index);
    const verdict: UpstreamCall['verdict'] = STRING_LITERAL.test(url)
      ? 'constant'
      : !forwarded(lines, index, column, fn)
        ? 'not-forwarded'
        : fromRequest(url, lines, fn, index, 0)
          ? 'escapes'
          : 'not-request';
    calls.push({
      line: index + 1,
      input: url.replace(/\s+/g, ' ').slice(0, QUOTE_LENGTH),
      verdict,
    });
  }
  return calls;
}
