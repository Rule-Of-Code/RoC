/**
 * Retention Registry Covers Schema
 *
 * A project declares what it deletes and when. A new table holding personal
 * data lands in a feature branch: tests pass, review reads the feature, and
 * no rule ever deletes those rows — it surfaces at an audit or a data-subject
 * request (GDPR art. 5(1)(e), storage limitation). Nothing connects the
 * schema to the retention decision; this law does.
 *
 * Opt-in: the project names its registry in
 * `thresholds.integrity.retentionRegistry`, a JSON file of the form
 *   { "tables": { "<table>": "<the deletion rule>" },
 *     "noPersonalData": { "<table>": "<why it holds none>" } }
 * Every Drizzle table (pgTable / mysqlTable / sqliteTable / singlestoreTable,
 * `schema.table(…)` of a pgSchema / mysqlSchema, and a *TableCreator's
 * builder) must be in exactly one of the two, with a non-empty reason; a
 * registry row naming a table the schema no longer has fails too. A registry
 * that is not declared, not found or not readable fails — it never passes.
 */

import * as fs from 'fs';
import * as path from 'path';
import type * as TS from 'typescript';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';
import type { TsxSource } from '../../utils/react/tsx-source';
import { LawBase } from '../law-base';

const TABLE_BUILDERS = new Set(['pgTable', 'mysqlTable', 'sqliteTable', 'singlestoreTable']);
const SCHEMA_BUILDERS = new Set(['pgSchema', 'mysqlSchema']);
const TABLE_CREATORS = new Set(['pgTableCreator', 'mysqlTableCreator', 'sqliteTableCreator', 'singlestoreTableCreator']);
const DRIZZLE_CORE = /^drizzle-orm\/[a-z0-9]+-core$/;
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];
const REGISTRY_KEY = 'thresholds.integrity.retentionRegistry';

interface Registry {
  tables: Map<string, string>;
  noPersonalData: Map<string, string>;
}

interface SchemaTables {
  /** Table name → where it is declared. */
  tables: Map<string, string>;
  unreadable: string[];
}

export class RetentionRegistryCoversSchemaLaw extends LawBase {
  static readonly LAW_NAME = 'Retention Registry Covers Schema';

  static check(context: LawCheckContext): LawResult {
    return this.createResult(
      this.findings(context),
      this.LAW_NAME,
      'SECURITY',
      [
        'Add each new table to the registry with its deletion rule, or to noPersonalData with the reason it holds none',
        'Remove registry rows for tables that no longer exist',
      ],
      context
    );
  }

  private static findings(context: LawCheckContext): string[] {
    const registry = this.registry(context);
    if (typeof registry === 'string') return [registry];
    const schema = this.schemaTables(context);
    if (schema.tables.size === 0 && schema.unreadable.length === 0) {
      return ['no Drizzle table was found in the scanned source — a registry checked against nothing does not pass'];
    }
    return [...schema.unreadable, ...this.unlisted(schema, registry), ...this.stale(schema, registry)];
  }

  /** Tables in neither section, or in both. */
  private static unlisted(schema: SchemaTables, registry: Registry): string[] {
    const findings: string[] = [];
    for (const [table, where] of schema.tables) {
      const kept = registry.tables.has(table);
      const exempt = registry.noPersonalData.has(table);
      if (kept && exempt) {
        findings.push(`${table} (${where}) is in both "tables" and "noPersonalData" — it holds personal data or it does not`);
      } else if (!kept && !exempt) {
        findings.push(
          `${table} (${where}) is in neither "tables" nor "noPersonalData" of the retention registry — no rule deletes its rows, and nobody has said it holds no personal data`
        );
      }
    }
    return findings;
  }

  /** Registry rows naming a table the schema no longer has. */
  private static stale(schema: SchemaTables, registry: Registry): string[] {
    const sections = [['tables', registry.tables], ['noPersonalData', registry.noPersonalData]] as const;
    return sections.flatMap(([section, entries]) =>
      [...entries.keys()]
        .filter(table => !schema.tables.has(table))
        .map(table => `registry ${section}."${table}" names a table the schema does not have`)
    );
  }

  /** The declared registry, or why it cannot be used. */
  private static registry(context: LawCheckContext): Registry | string {
    const declared = (context.config.thresholds as { integrity?: { retentionRegistry?: unknown } } | undefined)
      ?.integrity?.retentionRegistry;
    if (typeof declared !== 'string' || declared.trim() === '') {
      return `${REGISTRY_KEY} is not set — this opt-in law needs the path of the retention registry, and does not pass without one`;
    }
    const file = path.resolve(context.projectRoot, declared);
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
    } catch (error) {
      const reason = fs.existsSync(file) ? `is not valid JSON (${error instanceof Error ? error.message : String(error)})` : 'does not exist';
      return `the retention registry ${declared} (${REGISTRY_KEY}) ${reason} — nothing was checked`;
    }
    const tables = this.section(parsed, 'tables', true);
    const noPersonalData = this.section(parsed, 'noPersonalData', false);
    if (typeof tables === 'string') return `the retention registry ${declared}: ${tables}`;
    if (typeof noPersonalData === 'string') return `the retention registry ${declared}: ${noPersonalData}`;
    return { tables, noPersonalData };
  }

  /** One section: table → reason. `tables` values may be an object (the rule's fields). */
  private static section(registry: unknown, name: string, allowObjects: boolean): Map<string, string> | string {
    const value = (registry as Record<string, unknown> | null)?.[name];
    if (value === undefined) return new Map();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return `"${name}" must be an object of table → reason`;
    const entries = new Map<string, string>();
    for (const [table, reason] of Object.entries(value)) {
      const text = typeof reason === 'string' ? reason.trim() : '';
      const object = allowObjects && reason !== null && typeof reason === 'object' && Object.keys(reason).length > 0;
      if (!text && !object) return `"${name}"."${table}" has no reason — an empty entry is a checkbox, not a decision`;
      entries.set(table, text || JSON.stringify(reason));
    }
    return entries;
  }

  private static schemaTables(context: LawCheckContext): SchemaTables {
    const files = ReactProject.sourceFiles(context, SOURCE_EXTENSIONS).filter(file => {
      try {
        return fs.readFileSync(file, 'utf8').includes('drizzle-orm');
      } catch {
        return true; // let parse() report it unread
      }
    });
    const { sources, unread } = ReactProject.parse(context, files);
    const result: SchemaTables = { tables: new Map(), unreadable: unread.map(reason => `${reason} — its tables were NOT read`) };
    for (const source of sources) this.tablesIn(context, source, result);
    return result;
  }

  private static tablesIn(context: LawCheckContext, source: TsxSource, result: SchemaTables): void {
    const ts = source.ts;
    const builders = this.builders(source);
    if (builders.direct.size === 0 && builders.schemas.size === 0 && builders.creators.size === 0) return;
    const schemaVars = new Set<string>();
    const creatorVars = new Set<string>();
    source.walk(node => {
      if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
      const callee = this.calleeName(ts, node.initializer);
      if (callee && builders.schemas.has(callee)) schemaVars.add(node.name.text);
      if (callee && builders.creators.has(callee)) creatorVars.add(node.name.text);
    });
    source.walk(node => {
      if (!ts.isCallExpression(node)) return;
      const isTable =
        (ts.isIdentifier(node.expression) &&
          (builders.direct.has(node.expression.text) || creatorVars.has(node.expression.text))) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          node.expression.name.text === 'table' &&
          ts.isIdentifier(node.expression.expression) &&
          schemaVars.has(node.expression.expression.text));
      if (!isTable) return;
      const where = `${ReactProject.relative(context, source.fileName)}:${source.lineOf(node)}`;
      const name = node.arguments[0];
      if (name && (ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name))) {
        result.tables.set(name.text, where);
      } else {
        result.unreadable.push(`${where}: cannot read the table name (not a string literal) — this table is not checked against the registry, so the law does not pass`);
      }
    });
  }

  /** Local names bound to drizzle's table builders by this file's imports. */
  private static builders(source: TsxSource): { direct: Set<string>; schemas: Set<string>; creators: Set<string> } {
    const found = { direct: new Set<string>(), schemas: new Set<string>(), creators: new Set<string>() };
    for (const imported of source.imports()) {
      if (!DRIZZLE_CORE.test(imported.module) || imported.typeOnly) continue;
      for (const { imported: name, local } of imported.named) {
        if (TABLE_BUILDERS.has(name)) found.direct.add(local);
        if (SCHEMA_BUILDERS.has(name)) found.schemas.add(local);
        if (TABLE_CREATORS.has(name)) found.creators.add(local);
      }
    }
    return found;
  }

  private static calleeName(ts: TsxSource['ts'], expression: TS.Expression): string | null {
    return ts.isCallExpression(expression) && ts.isIdentifier(expression.expression) ? expression.expression.text : null;
  }
}
