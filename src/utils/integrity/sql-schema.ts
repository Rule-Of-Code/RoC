/**
 * The schema a chain of SQL migrations leaves behind: which columns exist, which
 * are nullable, and which CHECK constraints are still in force — replayed in
 * order, so a column made nullable by a later `DROP NOT NULL` is nullable.
 *
 * It reads the DDL a migration tool writes (CREATE TABLE, ALTER TABLE ADD /
 * ALTER / DROP / RENAME / MODIFY / CHANGE, DROP TABLE, CREATE/ALTER DOMAIN).
 * A statement holding a CHECK it does not take apart is recorded as unread,
 * never skipped: a CHECK this reader did not see is a CHECK nobody judged.
 */

import {
  closingParen,
  lineAt,
  maskSql,
  splitStatements,
  splitTopLevel,
  type SqlToken,
  tokenizeSql,
} from './sql-lexer';

export interface SqlColumn {
  nullable: boolean;
}

export interface SqlTable {
  name: string;
  columns: Map<string, SqlColumn>;
  /** Why the column list is not known in full (created outside the chain, AS SELECT, LIKE). */
  partial: string | null;
}

export interface SqlCheck {
  table: string;
  name: string;
  /** The expression between the CHECK's parentheses. */
  tokens: SqlToken[];
  file: string;
  line: number;
}

export interface UnreadCheck {
  file: string;
  line: number;
  reason: string;
}

const CONSTRAINT_STARTS = new Set(['constraint', 'check', 'primary', 'unique', 'foreign', 'exclude']);
const NOT_NULL_TYPES = new Set(['serial', 'bigserial', 'smallserial', 'serial4', 'serial8', 'serial2']);
const CREATE_MODIFIERS = new Set(['or', 'replace', 'temp', 'temporary', 'unlogged', 'global', 'local']);
const OUTSIDE_THE_CHAIN = 'it is not created in the tracked migrations';
const DOMAIN_PREFIX = 'domain ';
const CHECK = 'check';

const isWord = (token: SqlToken | undefined, word: string): boolean =>
  token?.kind === 'ident' && !token.quoted && token.value === word;
const isPunct = (token: SqlToken | undefined, punct: string): boolean =>
  token?.kind === 'punct' && token.value === punct;

/** `"public"."users"` → `users`; `audit.log` → `audit.log`. */
function tableKey(parts: string[]): string {
  const named = parts[0] === 'public' && parts.length > 1 ? parts.slice(1) : parts;
  return named.join('.');
}

export class SqlSchema {
  readonly tables = new Map<string, SqlTable>();
  readonly checks: SqlCheck[] = [];
  readonly unread: UnreadCheck[] = [];
  private file = '';
  private text = '';
  /** Checks recorded so far, removals not subtracted: what a statement added. */
  private added = 0;

  /** Replay one migration file. Call in chain order. */
  apply(file: string, text: string): void {
    this.file = file;
    this.text = text;
    const masked = maskSql(text);
    for (const statement of splitStatements(tokenizeSql(masked))) {
      const before = this.added;
      this.statement(statement);
      this.reportUnparsedChecks(statement, before);
    }
  }

  /** Every CHECK keyword the statement holds must have become a recorded check. */
  private reportUnparsedChecks(statement: SqlToken[], before: number): void {
    const written = statement.filter(
      (token, i) => isWord(token, CHECK) && isPunct(statement[i + 1], '(')
    );
    const recorded = this.added - before;
    if (written.length > recorded) {
      const first = written[recorded] ?? written[0];
      this.unread.push({
        file: this.file,
        line: this.line(first),
        reason: `a CHECK in a "${statement.slice(0, 3).map(t => t.value).join(' ')} …" statement this law does not take apart`,
      });
    }
  }

  private line(token: SqlToken | undefined): number {
    return token ? lineAt(this.text, token.pos) : 1;
  }

  private statement(tokens: SqlToken[]): void {
    let i = 0;
    const verb = tokens[0];
    if (isWord(verb, 'create')) {
      i = 1;
      while (CREATE_MODIFIERS.has(tokens[i]?.value ?? '') && !tokens[i]?.quoted) i += 1;
      if (isWord(tokens[i], 'table')) this.createTable(tokens, i + 1);
      else if (isWord(tokens[i], 'domain')) this.createDomain(tokens, i + 1);
    } else if (isWord(verb, 'alter') && isWord(tokens[1], 'table')) {
      this.alterTable(tokens, 2);
    } else if (isWord(verb, 'alter') && isWord(tokens[1], 'domain')) {
      this.alterDomain(tokens, 2);
    } else if (isWord(verb, 'drop') && (isWord(tokens[1], 'table') || isWord(tokens[1], 'domain'))) {
      this.drop(tokens, isWord(tokens[1], 'domain'));
    }
  }

  /** Skip `IF [NOT] EXISTS` / `ONLY`; returns the next index. */
  private skipQualifiers(tokens: SqlToken[], i: number): number {
    let at = i;
    for (;;) {
      if (isWord(tokens[at], 'if') && isWord(tokens[at + 1], 'not') && isWord(tokens[at + 2], 'exists')) at += 3;
      else if (isWord(tokens[at], 'if') && isWord(tokens[at + 1], 'exists')) at += 2;
      else if (isWord(tokens[at], 'only')) at += 1;
      else return at;
    }
  }

  /** A possibly qualified name at `i`; returns the key and the next index. */
  private name(tokens: SqlToken[], i: number): { key: string; next: number } {
    const parts: string[] = [];
    let at = i;
    while (tokens[at]?.kind === 'ident') {
      parts.push(tokens[at]?.value ?? '');
      if (!isPunct(tokens[at + 1], '.')) break;
      at += 2;
    }
    return { key: tableKey(parts), next: at + 1 };
  }

  private table(key: string): SqlTable {
    let table = this.tables.get(key);
    if (!table) {
      table = { name: key, columns: new Map(), partial: OUTSIDE_THE_CHAIN };
      this.tables.set(key, table);
    }
    return table;
  }

  private createTable(tokens: SqlToken[], from: number): void {
    const { key, next } = this.name(tokens, this.skipQualifiers(tokens, from));
    const table: SqlTable = { name: key, columns: new Map(), partial: null };
    this.tables.set(key, table);
    this.dropChecksOf(key);
    if (!isPunct(tokens[next], '(')) {
      table.partial = 'its columns come from a query or another type (AS / OF / PARTITION OF)';
      return;
    }
    const close = closingParen(tokens, next);
    const pendingKeys: string[] = [];
    for (const def of splitTopLevel(tokens.slice(next + 1, close))) {
      pendingKeys.push(...this.definition(table, def));
    }
    for (const column of pendingKeys) this.setNullable(table, column, false);
  }

  /**
   * One element of a table body or an ADD: a column or a table constraint.
   * Returns the columns a PRIMARY KEY names (they become NOT NULL).
   */
  private definition(table: SqlTable, def: SqlToken[]): string[] {
    const first = def[0];
    if (!first) return [];
    if (isWord(first, 'like')) {
      table.partial = 'its columns are copied with LIKE';
      return [];
    }
    if (first.kind === 'ident' && !first.quoted && CONSTRAINT_STARTS.has(first.value)) {
      return this.tableConstraint(table, def);
    }
    this.column(table, def);
    return [];
  }

  private tableConstraint(table: SqlTable, def: SqlToken[]): string[] {
    let i = 0;
    let name = `${table.name}_check`;
    if (isWord(def[0], 'constraint')) {
      name = def[1]?.value ?? name;
      i = 2;
    }
    if (isWord(def[i], CHECK) && isPunct(def[i + 1], '(')) {
      this.addCheck(table.name, name, def, i + 1);
      return [];
    }
    if (isWord(def[i], 'primary') && isPunct(def[i + 2], '(')) {
      const close = closingParen(def, i + 2);
      return def.slice(i + 3, close).filter(t => t.kind === 'ident').map(t => t.value);
    }
    return [];
  }

  private addCheck(table: string, name: string, tokens: SqlToken[], open: number): void {
    const close = closingParen(tokens, open);
    this.added += 1;
    this.checks.push({
      table,
      name,
      tokens: tokens.slice(open + 1, close),
      file: this.file,
      line: this.line(tokens[open - 1]),
    });
  }

  /** A column definition: name, type, then constraints at depth 0. */
  private column(table: SqlTable, def: SqlToken[]): void {
    const name = def[0]?.value ?? '';
    let nullable = !NOT_NULL_TYPES.has(def[1]?.value ?? '');
    let constraintName = `${table.name}_${name}_check`;
    for (let i = 1; i < def.length; i += 1) {
      const token = def[i];
      if (isPunct(token, '(')) {
        i = closingParen(def, i);
      } else if (isWord(token, 'constraint')) {
        constraintName = def[i + 1]?.value ?? constraintName;
      } else if (isWord(token, CHECK) && isPunct(def[i + 1], '(')) {
        this.addCheck(table.name, constraintName, def, i + 1);
        i = closingParen(def, i + 1);
      } else if (this.notNullAt(def, i)) {
        nullable = false;
      }
    }
    table.columns.set(name, { nullable });
  }

  /** `NOT NULL`, `PRIMARY KEY` or `… AS IDENTITY` at `i`. */
  private notNullAt(def: SqlToken[], i: number): boolean {
    const token = def[i];
    return (
      (isWord(token, 'not') && isWord(def[i + 1], 'null')) ||
      (isWord(token, 'primary') && isWord(def[i + 1], 'key')) ||
      (isWord(token, 'as') && isWord(def[i + 1], 'identity'))
    );
  }

  private setNullable(table: SqlTable, column: string, nullable: boolean): void {
    const existing = table.columns.get(column);
    if (existing) existing.nullable = nullable;
    else if (table.partial) table.columns.set(column, { nullable });
  }

  private alterTable(tokens: SqlToken[], from: number): void {
    const { key, next } = this.name(tokens, this.skipQualifiers(tokens, from));
    const start = tokens[next]?.value === '*' ? next + 1 : next;
    for (const action of splitTopLevel(tokens.slice(start))) {
      this.alterAction(key, action);
    }
  }

  private alterAction(key: string, action: SqlToken[]): void {
    const verb = action[0]?.value;
    if (action[0]?.quoted) return;
    if (verb === 'add') this.addAction(this.table(key), action);
    else if (verb === 'alter') this.alterColumnAction(this.table(key), action);
    else if (verb === 'drop') this.dropAction(this.table(key), action);
    else if (verb === 'rename') this.renameAction(key, action);
    else if (verb === 'modify' || verb === 'change') this.modifyAction(this.table(key), action);
  }

  private addAction(table: SqlTable, action: SqlToken[]): void {
    let i = 1;
    if (isWord(action[i], 'column')) i += 1;
    i = this.skipQualifiers(action, i);
    const pk = this.definition(table, action.slice(i));
    for (const column of pk) this.setNullable(table, column, false);
  }

  private alterColumnAction(table: SqlTable, action: SqlToken[]): void {
    const i = isWord(action[1], 'column') ? 2 : 1;
    const column = action[i]?.value ?? '';
    const rest = action.slice(i + 1);
    if (isWord(rest[0], 'set') && isWord(rest[1], 'not') && isWord(rest[2], 'null')) {
      this.setNullable(table, column, false);
    } else if (isWord(rest[0], 'drop') && isWord(rest[1], 'not') && isWord(rest[2], 'null')) {
      this.setNullable(table, column, true);
    } else if (isWord(rest[0], 'add') && rest.some(t => isWord(t, 'identity'))) {
      this.setNullable(table, column, false);
    }
  }

  private dropAction(table: SqlTable, action: SqlToken[]): void {
    if (isWord(action[1], 'constraint')) {
      const name = action[this.skipQualifiers(action, 2)]?.value;
      this.removeChecks(check => check.table === table.name && check.name === name);
      return;
    }
    const i = this.skipQualifiers(action, isWord(action[1], 'column') ? 2 : 1);
    const column = action[i]?.value ?? '';
    table.columns.delete(column);
    this.removeChecks(
      check => check.table === table.name && check.tokens.some(t => t.kind === 'ident' && t.value === column)
    );
  }

  private renameAction(key: string, action: SqlToken[]): void {
    const table = this.table(key);
    if (isWord(action[1], 'to')) {
      const target = this.name(action, 2).key;
      this.tables.delete(key);
      table.name = target;
      this.tables.set(target, table);
      for (const check of this.checks) if (check.table === key) check.table = target;
      return;
    }
    if (isWord(action[1], 'constraint')) {
      const [from, to] = [action[2]?.value, action[4]?.value ?? ''];
      for (const check of this.checks) if (check.table === key && check.name === from) check.name = to;
      return;
    }
    const i = isWord(action[1], 'column') ? 2 : 1;
    this.renameColumn(table, action[i]?.value ?? '', action[i + 2]?.value ?? '');
  }

  private renameColumn(table: SqlTable, from: string, to: string): void {
    const column = table.columns.get(from);
    if (column) {
      table.columns.delete(from);
      table.columns.set(to, column);
    }
    for (const check of this.checks) {
      if (check.table !== table.name) continue;
      check.tokens = check.tokens.map(t => (t.kind === 'ident' && t.value === from ? { ...t, value: to } : t));
    }
  }

  /** MySQL: `MODIFY [COLUMN] col def` and `CHANGE [COLUMN] old new def`. */
  private modifyAction(table: SqlTable, action: SqlToken[]): void {
    let i = isWord(action[1], 'column') ? 2 : 1;
    if (isWord(action[0], 'change')) {
      this.renameColumn(table, action[i]?.value ?? '', action[i + 1]?.value ?? '');
      i += 1;
    }
    this.column(table, action.slice(i));
  }

  private drop(tokens: SqlToken[], domain: boolean): void {
    const names = splitTopLevel(tokens.slice(this.skipQualifiers(tokens, 2)));
    for (const part of names) {
      const key = this.name(part, 0).key;
      const full = domain ? `${DOMAIN_PREFIX}${key}` : key;
      this.tables.delete(full);
      this.dropChecksOf(full);
    }
  }

  private dropChecksOf(key: string): void {
    this.removeChecks(check => check.table === key);
  }

  private removeChecks(predicate: (check: SqlCheck) => boolean): void {
    for (let i = this.checks.length - 1; i >= 0; i -= 1) {
      const check = this.checks[i];
      if (check && predicate(check)) this.checks.splice(i, 1);
    }
  }

  /**
   * A domain is read as a one-column table whose column is VALUE: a CHECK on a
   * domain is NULL — and passes — for a NULL value unless the domain is NOT NULL.
   */
  private createDomain(tokens: SqlToken[], from: number): void {
    const { key, next } = this.name(tokens, this.skipQualifiers(tokens, from));
    const full = `${DOMAIN_PREFIX}${key}`;
    const table: SqlTable = { name: full, columns: new Map(), partial: null };
    this.tables.set(full, table);
    this.dropChecksOf(full);
    this.column(table, [{ kind: 'ident', value: 'value', pos: tokens[0]?.pos ?? 0, quoted: true }, ...tokens.slice(next)]);
  }

  private alterDomain(tokens: SqlToken[], from: number): void {
    const { key, next } = this.name(tokens, from);
    const table = this.table(`${DOMAIN_PREFIX}${key}`);
    table.partial = null;
    if (!table.columns.has('value')) table.columns.set('value', { nullable: true });
    const action = tokens.slice(next);
    if (isWord(action[0], 'set') && isWord(action[1], 'not')) this.setNullable(table, 'value', false);
    else if (isWord(action[0], 'drop') && isWord(action[1], 'not')) this.setNullable(table, 'value', true);
    else if (isWord(action[0], 'add')) this.tableConstraint(table, action.slice(1));
    else if (isWord(action[0], 'drop')) this.dropAction(table, action);
  }
}
