/**
 * SQL Check Constraint NULL Passes
 *
 * `CHECK (status = 'x' OR kind = 'y')` looks like an invariant. A CHECK fails
 * only when its expression is FALSE, and with a nullable column holding NULL
 * the expression is NULL — so the row is accepted. The constraint is present,
 * reviewed and green, and guards nothing for exactly the row nobody thought
 * about.
 *
 * The tracked .sql migrations are replayed in order (natural sort of their
 * paths, the order the tools number them in) to learn which columns are
 * nullable at the end of the chain; each CHECK still in force is then read
 * against that. A column the expression reaches through a function, a cast or
 * arithmetic is reported as unread, and so is a CHECK in a statement the
 * reader does not take apart: this law does not pass what it did not read.
 */

import * as fs from 'fs';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { readCheckExpression } from '../../utils/integrity/sql-check-expression';
import { type SqlCheck, SqlSchema, type SqlTable } from '../../utils/integrity/sql-schema';
import { relativePath, trackedFiles } from '../../utils/integrity/tracked-files';
import { LawBase } from '../law-base';

const NULL_BRANCH = 'add an explicit IS NULL / IS NOT NULL branch for it, or make the column NOT NULL';

export class SqlCheckConstraintNullPassesLaw extends LawBase {
  static readonly LAW_NAME = 'SQL Check Constraint NULL Passes';

  static check(context: LawCheckContext): LawResult {
    return this.createResult(
      this.findings(context.projectRoot),
      this.LAW_NAME,
      'CODE_QUALITY',
      [
        "Say what NULL means: CHECK (status IS NULL OR status IN ('a','b')), or CHECK (status IS NOT NULL AND …)",
        'Or declare the column NOT NULL, so NULL cannot reach the CHECK',
      ],
      context
    );
  }

  private static findings(root: string): string[] {
    const listed = trackedFiles(root, ['*.sql']);
    if (!listed.ok) return [`${listed.reason} — the SQL migrations were NOT read`];
    if (listed.files.length === 0) {
      return [
        'a .sql file is on disk but git tracks none — this law reads the committed migrations, and there are none to read',
      ];
    }
    const files = listed.files
      .map(file => ({ file, where: relativePath(root, file) }))
      .sort((a, b) => a.where.localeCompare(b.where, undefined, { numeric: true }));
    const schema = new SqlSchema();
    const findings: string[] = [];
    for (const { file, where } of files) {
      let text: string;
      try {
        text = fs.readFileSync(file, 'utf8');
      } catch {
        findings.push(`${where}: could not be read — its CHECK constraints were NOT inspected`);
        continue;
      }
      schema.apply(where, text);
    }
    for (const unread of schema.unread) {
      findings.push(`${unread.file}:${unread.line}: cannot read — ${unread.reason}; a CHECK nobody judged is not a pass`);
    }
    for (const check of schema.checks) {
      findings.push(...this.judge(check, schema.tables.get(check.table)));
    }
    return findings;
  }

  private static judge(check: SqlCheck, table: SqlTable | undefined): string[] {
    const at = `${check.file}:${check.line}: CHECK ${check.name} on ${check.table}`;
    const columns = table?.columns ?? new Map();
    const reading = readCheckExpression(check.tokens, new Set(columns.keys()));
    const findings: string[] = [];
    if (reading.unknown.length > 0) {
      const why = table?.partial
        ? `the columns of ${check.table} are not all known (${table.partial})`
        : `${check.table} has no such column in the tracked migrations`;
      findings.push(
        `${at}: cannot read — ${reading.unknown.map(name => `"${name}"`).join(', ')}: ${why}. Nullability of what it compares is unknown, so it is not passed`
      );
    }
    for (const [name, use] of reading.columns) {
      if (use.nullAware || columns.get(name)?.nullable !== true) continue;
      findings.push(
        use.direct
          ? `${at} compares nullable column "${name}" with no IS NULL / IS NOT NULL / COALESCE for it — when it is NULL the expression is NULL, a CHECK rejects only FALSE, and the row is accepted; ${NULL_BRANCH}`
          : `${at}: cannot read — nullable column "${name}" is reached through a function, a cast or arithmetic, which may pass NULL through; ${NULL_BRANCH}`
      );
    }
    return findings;
  }
}
