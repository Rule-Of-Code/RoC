/**
 * SqlCheckConstraintNullPasses (#196): a CHECK on a nullable column that has
 * no IS NULL / IS NOT NULL / COALESCE for it is reported; what the reader
 * cannot take apart is reported as unread — never passed.
 */
import { SqlCheckConstraintNullPassesLaw as Law } from '../../../src/checkers/integrity-laws/sql-check-constraint-null-passes';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, project, removeProjects } from '../toolkit-fixture';
import { card, gitProject } from './integrity-fixture';

afterAll(removeProjects);

const run = (files: Record<string, string>, untracked: Record<string, string> = {}) =>
  Law.check(ctx(gitProject(files, untracked))).violations ?? [];
const one = (sql: string) => run({ 'migrations/0001_init.sql': sql });

const COMPARES = /compares nullable column/;
const UNREAD = /cannot read/;

describe('SqlCheckConstraintNullPassesLaw (#196)', () => {
  it('red: the issue\'s example — both nullable columns are reported, with file, line and constraint', () => {
    const violations = one(
      "CREATE TABLE orders (\n  id serial PRIMARY KEY,\n  status text,\n  kind text,\n  CONSTRAINT status_or_kind CHECK (status = 'x' OR kind = 'y')\n);"
    );
    expect(violations).toEqual([
      expect.stringMatching(/^migrations\/0001_init\.sql:5: CHECK status_or_kind on orders compares nullable column "status"/),
      expect.stringMatching(/^migrations\/0001_init\.sql:5: CHECK status_or_kind on orders compares nullable column "kind"/),
    ]);
  });

  it.each([
    ['NOT NULL columns', "CREATE TABLE o (status text NOT NULL, kind text NOT NULL, CHECK (status = 'x' OR kind = 'y'));"],
    ['an IS NULL branch', "CREATE TABLE o (status text, CHECK (status IS NULL OR status IN ('a', 'b')));"],
    ['an IS NOT NULL conjunct', "CREATE TABLE o (status text, CHECK (status IS NOT NULL AND status <> ''));"],
    ['COALESCE', "CREATE TABLE o (qty int, CHECK (COALESCE(qty, 0) >= 0));"],
    ['IS DISTINCT FROM', "CREATE TABLE o (a int, b int, CHECK (a IS DISTINCT FROM b));"],
    ['a primary key column', "CREATE TABLE o (id int, CHECK (id > 0), PRIMARY KEY (id));"],
    ['an identity column', "CREATE TABLE o (id int GENERATED ALWAYS AS IDENTITY, CHECK (id > 0));"],
    ['a CHECK only in a comment or string', "-- CHECK (x > 0)\n/* CHECK (y > 0) */\nCREATE TABLE o (note text DEFAULT 'CHECK (z > 0); x');"],
  ])('green: %s', (_label, sql) => {
    expect(one(sql)).toEqual([]);
  });

  it('red: an inline column CHECK on a nullable column', () => {
    expect(one("CREATE TABLE o (status text CHECK (status IN ('a', 'b')));")).toEqual([
      expect.stringMatching(/CHECK o_status_check on o compares nullable column "status"/),
    ]);
  });

  it('red: drizzle-kit style — quoted, table-qualified columns, ALTER TABLE ADD CONSTRAINT', () => {
    const violations = run({
      'drizzle/0000_a.sql': 'CREATE TABLE IF NOT EXISTS "users" (\n\t"id" serial PRIMARY KEY NOT NULL,\n\t"role" text\n);',
      'drizzle/0001_b.sql':
        'ALTER TABLE "users" ADD CONSTRAINT "role_check" CHECK ("users"."role" = \'admin\' OR "users"."role" = \'member\');',
    });
    expect(violations).toEqual([expect.stringMatching(/^drizzle\/0001_b\.sql:1: CHECK role_check on users compares nullable column "role"/)]);
  });

  it('red: a column made nullable later in the chain', () => {
    const violations = run({
      'm/0001.sql': "CREATE TABLE o (status text NOT NULL, CHECK (status IN ('a')));",
      'm/0002.sql': 'ALTER TABLE o ALTER COLUMN status DROP NOT NULL;',
    });
    expect(violations).toEqual([expect.stringMatching(COMPARES)]);
  });

  it('green: a column made NOT NULL later in the chain', () => {
    const violations = run({
      'm/0001.sql': "CREATE TABLE o (status text, CHECK (status IN ('a')));",
      'm/0002.sql': 'ALTER TABLE o ALTER COLUMN status SET NOT NULL;',
    });
    expect(violations).toEqual([]);
  });

  it('replays in natural order: V2 before V10', () => {
    const violations = run({
      'db/V2__create.sql': "CREATE TABLE o (status text, CHECK (status IN ('a')));",
      'db/V10__tighten.sql': 'ALTER TABLE o ALTER COLUMN status SET NOT NULL;',
    });
    expect(violations).toEqual([]);
  });

  it('follows renames, dropped constraints, dropped columns and dropped tables', () => {
    const violations = run({
      'm/0001.sql': [
        "CREATE TABLE a (s text, CONSTRAINT a_s CHECK (s = 'x'));",
        "CREATE TABLE b (s text, CONSTRAINT b_s CHECK (s = 'x'));",
        "CREATE TABLE c (s text, CHECK (s = 'x'));",
        "CREATE TABLE d (s text, CONSTRAINT d_s CHECK (s = 'x'));",
      ].join('\n'),
      'm/0002.sql': [
        'ALTER TABLE a DROP CONSTRAINT a_s;',
        'ALTER TABLE b DROP COLUMN s;',
        'DROP TABLE IF EXISTS c;',
        'ALTER TABLE d RENAME COLUMN s TO t;',
        'ALTER TABLE d RENAME TO e;',
      ].join('\n'),
    });
    expect(violations).toEqual([expect.stringMatching(/CHECK d_s on e compares nullable column "t"/)]);
  });

  it('MySQL: MODIFY makes a column NOT NULL', () => {
    const violations = run({
      'm/0001.sql': "CREATE TABLE o (`status` varchar(8), CHECK (`status` IN ('a')));",
      'm/0002.sql': 'ALTER TABLE o MODIFY COLUMN `status` varchar(8) NOT NULL;',
    });
    expect(violations).toEqual([]);
  });

  it('a domain is a one-column table: red when nullable, green when NOT NULL', () => {
    expect(one("CREATE DOMAIN state AS text CHECK (VALUE IN ('a', 'b'));")).toEqual([
      expect.stringMatching(/on domain state compares nullable column "value"/),
    ]);
    expect(one("CREATE DOMAIN state AS text NOT NULL CHECK (VALUE IN ('a', 'b'));")).toEqual([]);
  });

  it('cannot read: a nullable column reached through a function or a cast', () => {
    expect(one('CREATE TABLE o (name text, CHECK (length(name) > 2));')).toEqual([
      expect.stringMatching(/cannot read — nullable column "name" is reached through a function/),
    ]);
    expect(one("CREATE TABLE o (name text, CHECK (name::varchar = 'x'));")).toEqual([expect.stringMatching(UNREAD)]);
  });

  it('green: the same function over a NOT NULL column', () => {
    expect(one('CREATE TABLE o (name text NOT NULL, CHECK (length(name) > 2));')).toEqual([]);
  });

  it('cannot read: a CHECK on a table created outside the tracked migrations', () => {
    expect(one("ALTER TABLE auth_users ADD CONSTRAINT c CHECK (provider = 'x');")).toEqual([
      expect.stringMatching(/CHECK c on auth_users: cannot read — "provider": the columns of auth_users are not all known \(it is not created in the tracked migrations\)/),
    ]);
  });

  it('a column added to an outside table is known', () => {
    expect(one("ALTER TABLE auth_users ADD COLUMN tier text;\nALTER TABLE auth_users ADD CHECK (tier IS NULL OR tier = 'x');")).toEqual([]);
  });

  it('cannot read: a CHECK in a statement the reader does not take apart', () => {
    expect(one('CREATE FOREIGN TABLE ft (a int CHECK (a > 0)) SERVER remote;')).toEqual([
      expect.stringMatching(/^migrations\/0001_init\.sql:1: cannot read — a CHECK in a "create foreign table …" statement/),
    ]);
  });

  it('a dollar-quoted function body is not DDL', () => {
    expect(
      one("CREATE FUNCTION f() RETURNS trigger AS $$ BEGIN IF NEW.x THEN RAISE 'CHECK (x > 0);'; END IF; END $$ LANGUAGE plpgsql;")
    ).toEqual([]);
  });

  it('fails when a .sql is on disk but git tracks none', () => {
    expect(run({ 'README.md': '#' }, { 'dump.sql': 'SELECT 1;' })).toEqual([expect.stringContaining('git tracks none')]);
  });

  it('fails when git cannot be asked', () => {
    const result = Law.check(ctx(project({ 'm/0001.sql': 'SELECT 1;' })));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining('could not list the files git tracks')]);
  });
});

describe('SQL Check Constraint NULL Passes selection (requires)', () => {
  const requires = card('SQL Check Constraint NULL Passes').requires;

  it('is selected where a .sql file exists, at any depth', () => {
    expect(lawRequirementsMet(requires, project({ 'services/api/db/migrations/0001.sql': 'SELECT 1;' }))).toBe(true);
  });

  it('is not selected without one', () => {
    expect(lawRequirementsMet(requires, project({ 'src/index.ts': 'export {};' }))).toBe(false);
  });

  it('is universal: no stack', () => {
    expect(card('SQL Check Constraint NULL Passes').stack).toBeUndefined();
  });
});
