/**
 * Which columns a CHECK expression lets NULL through.
 *
 * A CHECK fails only when its expression is FALSE; NULL is not FALSE. A column
 * that is compared (`=`, `<>`, `IN`, `<`, `>` …) or tested bare, and that can
 * hold NULL, makes the expression NULL for exactly that row — and the row is
 * accepted. A column is NULL-aware when the expression says what NULL means
 * for it: `IS [NOT] NULL`, `IS [NOT] DISTINCT FROM`, `ISNULL`/`NOTNULL`, or an
 * argument of COALESCE / IFNULL / NVL / NUM_NULLS / NUM_NONNULLS.
 *
 * A column reached through a function, a cast or arithmetic (`length(x) > 0`,
 * `x::text = 'a'`, `a + b > 0`) may or may not propagate NULL; that is not
 * decidable from the text, so it is reported as unread — never passed.
 */

import type { SqlToken } from './sql-lexer';

export interface ColumnUse {
  /** Compared or tested directly, outside any function. */
  direct: boolean;
  /** Reached through a function, a cast or arithmetic. */
  indirect: boolean;
  nullAware: boolean;
}

export interface ExpressionReading {
  columns: Map<string, ColumnUse>;
  /** Identifiers that are not a column, a keyword, a function or a type. */
  unknown: string[];
}

const NULL_AWARE_FUNCTIONS = new Set(['coalesce', 'ifnull', 'nvl', 'num_nulls', 'num_nonnulls']);
const KEYWORDS = new Set([
  'and', 'or', 'not', 'is', 'null', 'true', 'false', 'in', 'between', 'symmetric', 'asymmetric',
  'like', 'ilike', 'similar', 'to', 'escape', 'case', 'when', 'then', 'else', 'end', 'any', 'all',
  'some', 'distinct', 'from', 'array', 'as', 'collate', 'isnull', 'notnull', 'unknown', 'overlaps',
  'current_date', 'current_time', 'current_timestamp', 'localtime', 'localtimestamp',
  'current_user', 'session_user', 'user', 'with', 'without', 'time', 'zone', 'varying',
  'precision', 'regexp', 'rlike', 'glob', 'match', 'at',
]);
const EXPRESSION_OPERATORS = new Set(['+', '-', '*', '/', '%', '||', '::', '^', '&', '|', '#', '~']);

const word = (token: SqlToken | undefined): string =>
  token?.kind === 'ident' && !token.quoted ? token.value : '';
const isPunct = (token: SqlToken | undefined, value: string): boolean =>
  token?.kind === 'punct' && token.value === value;

class Reader {
  readonly columns = new Map<string, ColumnUse>();
  readonly unknown: string[] = [];
  /** Function name per open parenthesis; '' for grouping. */
  private readonly calls: string[] = [];

  constructor(
    private readonly tokens: SqlToken[],
    private readonly known: ReadonlySet<string>
  ) {}

  run(): void {
    for (let i = 0; i < this.tokens.length; i += 1) {
      const token = this.tokens[i];
      if (isPunct(token, '(')) this.calls.push(this.functionBefore(i));
      else if (isPunct(token, ')')) this.calls.pop();
      else if (token?.kind === 'ident') i = this.identifier(i);
    }
  }

  /** The function a `(` at `i` opens, or '' when it groups. */
  private functionBefore(i: number): string {
    const previous = this.tokens[i - 1];
    if (previous?.kind !== 'ident' || previous.quoted) return '';
    return KEYWORDS.has(previous.value) && previous.value !== 'any' ? '' : previous.value;
  }

  /** Classify the identifier (or qualified reference) at `i`; returns its last index. */
  private identifier(i: number): number {
    let end = i;
    while (isPunct(this.tokens[end + 1], '.') && this.tokens[end + 2]?.kind === 'ident') end += 2;
    const token = this.tokens[end];
    const name = token?.value ?? '';
    const next = this.tokens[end + 1];
    if (this.isTypeOrCall(i, next)) return end;
    if (this.known.has(name)) {
      this.use(name, i, end);
    } else if (token?.quoted || !KEYWORDS.has(name)) {
      this.unknown.push(name);
    }
    return end;
  }

  /** A function name, a type after `::` / AS, or a typed literal (`date '…'`). */
  private isTypeOrCall(i: number, next: SqlToken | undefined): boolean {
    const previous = this.tokens[i - 1];
    if (isPunct(next, '(') && !KEYWORDS.has(word(this.tokens[i]))) return true;
    if (next?.kind === 'string') return true;
    if (previous?.kind === 'op' && previous.value === '::') return true;
    return word(previous) === 'as' && this.calls.includes('cast');
  }

  private use(name: string, start: number, end: number): void {
    const use = this.columns.get(name) ?? { direct: false, indirect: false, nullAware: false };
    this.columns.set(name, use);
    if (this.isNullAware(start, end)) {
      use.nullAware = true;
      return;
    }
    const before = this.tokens[start - 1];
    const after = this.tokens[end + 1];
    const inExpression =
      this.calls.some(call => call !== '') ||
      (before?.kind === 'op' && EXPRESSION_OPERATORS.has(before.value)) ||
      (after?.kind === 'op' && EXPRESSION_OPERATORS.has(after.value)) ||
      isPunct(after, '[');
    if (inExpression) use.indirect = true;
    else use.direct = true;
  }

  private isNullAware(start: number, end: number): boolean {
    const after = (n: number): string => word(this.tokens[end + n]);
    const before = (n: number): string => word(this.tokens[start - n]);
    if (after(1) === 'isnull' || after(1) === 'notnull') return true;
    if (after(1) === 'is') {
      const offset = after(2) === 'not' ? 3 : 2;
      if (after(offset) === 'null' || after(offset) === 'distinct') return true;
    }
    if (before(1) === 'from' && before(2) === 'distinct') return true;
    return this.calls.some(call => NULL_AWARE_FUNCTIONS.has(call));
  }
}

/** Read `tokens` (a CHECK's expression) against the table's known column names. */
export function readCheckExpression(
  tokens: SqlToken[],
  knownColumns: ReadonlySet<string>
): ExpressionReading {
  const reader = new Reader(tokens, knownColumns);
  reader.run();
  return { columns: reader.columns, unknown: [...new Set(reader.unknown)] };
}
