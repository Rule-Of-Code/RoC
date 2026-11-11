/**
 * RetentionRegistryCoversSchema (#202): opt-in; every Drizzle table is in the
 * registry or in noPersonalData with a reason; a stale row fails; a registry
 * that is not declared, not there or not readable fails — never passes.
 */
import { RetentionRegistryCoversSchemaLaw as Law } from '../../../src/checkers/integrity-laws/retention-registry-covers-schema';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { card } from './integrity-fixture';

afterAll(removeProjects);

const SCHEMA = [
  "import { pgTable, serial, text } from 'drizzle-orm/pg-core';",
  "export const users = pgTable('users', { id: serial('id').primaryKey(), email: text('email') });",
  "export const countries = pgTable('countries', { code: text('code') });",
].join('\n');
const REGISTRY_PATH = 'docs/retention.json';
const registry = (value: unknown): Record<string, string> => ({ [REGISTRY_PATH]: JSON.stringify(value) });
const withRegistry = { integrity: { retentionRegistry: REGISTRY_PATH } };

const run = (files: Record<string, string>, thresholds: Record<string, unknown> = withRegistry) =>
  Law.check(ctx(project({ 'src/db/schema.ts': SCHEMA, ...files }), { thresholds })).violations ?? [];

const COVERED = { tables: { users: 'deleted 30 days after account closure' }, noPersonalData: { countries: 'ISO reference data' } };

describe('RetentionRegistryCoversSchemaLaw (#202)', () => {
  it('green: every table in exactly one section, with a reason', () => {
    expect(run(registry(COVERED))).toEqual([]);
  });

  it('red: a table in neither section is named', () => {
    expect(run(registry({ tables: COVERED.tables }))).toEqual([
      expect.stringMatching(/^countries \(src\/db\/schema\.ts:3\) is in neither "tables" nor "noPersonalData"/),
    ]);
  });

  it('red: a registry row naming a table that no longer exists', () => {
    expect(run(registry({ ...COVERED, tables: { ...COVERED.tables, sessions: '7 days' } }))).toEqual([
      'registry tables."sessions" names a table the schema does not have',
    ]);
  });

  it('red: a table in both sections', () => {
    expect(run(registry({ ...COVERED, noPersonalData: { ...COVERED.noPersonalData, users: 'none' } }))).toEqual([
      expect.stringMatching(/^users .* is in both/),
    ]);
  });

  it('red: an entry without a reason is a checkbox, not a decision', () => {
    expect(run(registry({ ...COVERED, noPersonalData: { countries: ' ' } }))).toEqual([expect.stringMatching(/"noPersonalData"."countries" has no reason/)]);
  });

  it('a "tables" rule may be an object of fields', () => {
    expect(run(registry({ ...COVERED, tables: { users: { after: '30d', job: 'purge-users' } } }))).toEqual([]);
  });

  it.each([
    ['not declared', {}, /retentionRegistry is not set/],
    ['missing', withRegistry, /docs\/retention\.json .* does not exist/],
  ])('fails when the registry is %s', (_label, thresholds, message) => {
    expect(run({}, thresholds)).toEqual([expect.stringMatching(message)]);
  });

  it('fails when the registry is not valid JSON', () => {
    expect(run({ [REGISTRY_PATH]: '{ "tables": ' })).toEqual([expect.stringMatching(/is not valid JSON/)]);
  });

  it('reads pgSchema(…).table, a pgTableCreator builder, mysqlTable and sqliteTable', () => {
    const schema = [
      "import { pgSchema, pgTableCreator } from 'drizzle-orm/pg-core';",
      "import { mysqlTable as table } from 'drizzle-orm/mysql-core';",
      "import { sqliteTable } from 'drizzle-orm/sqlite-core';",
      "const audit = pgSchema('audit');",
      "const createTable = pgTableCreator(name => `app_${name}`);",
      "export const log = audit.table('log', {});",
      "export const posts = createTable('posts', {});",
      "export const carts = table('carts', {});",
      "export const notes = sqliteTable(`notes`, {});",
    ].join('\n');
    const violations = run({ 'src/db/schema.ts': schema, ...registry({ tables: {} }) });
    expect(violations.map(v => v.split(' ')[0]).sort()).toEqual(['carts', 'log', 'notes', 'posts']);
  });

  it('a local function named pgTable is not a Drizzle table', () => {
    const schema = "import { x } from 'drizzle-orm';\nconst pgTable = (n: string) => n;\nexport const a = pgTable('a');\n";
    expect(run({ 'src/db/schema.ts': schema, ...registry({}) })).toEqual([expect.stringMatching(/no Drizzle table was found/)]);
  });

  it('cannot read: a table whose name is not a string literal', () => {
    const schema = `${SCHEMA}\nconst name = 'dyn';\nexport const dyn = pgTable(name, {});\n`;
    expect(run({ 'src/db/schema.ts': schema, ...registry(COVERED) })).toEqual([
      expect.stringMatching(/^src\/db\/schema\.ts:5: cannot read the table name/),
    ]);
  });

  it('fails when no table was found at all', () => {
    expect(run({ 'src/db/schema.ts': 'export const nothing = 1;\n', ...registry(COVERED) })).toEqual([
      expect.stringMatching(/no Drizzle table was found/),
    ]);
  });
});

describe('Retention Registry Covers Schema card and selection', () => {
  const law = card('Retention Registry Covers Schema');

  it('is opt-in', () => {
    expect(law.defaultEnabled).toBe(false);
  });

  it('is selected where drizzle-orm is declared, and not elsewhere', () => {
    expect(lawRequirementsMet(law.requires, project({ 'package.json': manifest({ 'drizzle-orm': '0.45.3' }) }))).toBe(true);
    expect(lawRequirementsMet(law.requires, project({ 'package.json': manifest({ typeorm: '0.3.0' }) }))).toBe(false);
  });
});
