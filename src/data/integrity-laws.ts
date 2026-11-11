/**
 * Integrity Laws Data Module
 *
 * Places where every gate is green and the thing it vouches for is not there:
 * a migration the migrator skips with exit 0, a CHECK that accepts the NULL
 * row, a guard only the tests call, a directory no tsconfig compiles, a table
 * no retention rule covers. Each reads what the committed tree actually says
 * (git's tracked files, the compiler's own tsconfig resolution, the syntax
 * tree) and reports what it could not read as a finding, never as a pass.
 * legacyId range: 591–599.
 */

import type { EnhancedConstitutionalLaw } from '../types/enhanced-law.types';
import { generateLawId } from '../utils/id-generator';
import {
  REQUIRES_DRIZZLE_MIGRATIONS,
  REQUIRES_SQL_FILES,
  REQUIRES_TSCONFIG,
  REQUIRES_TYPESCRIPT,
} from '../utils/integrity/integrity-requirements';

/** The laws that judge the committed tree say so once. */
const TRACKED_ONLY =
  'Reads the files git tracks: a file that exists only on the auditing machine is not part of what CI and production run, and is not read.';

export const INTEGRITY_LAWS: EnhancedConstitutionalLaw[] = [
  {
    id: generateLawId(
      'Drizzle Migration Journal Integrity',
      'The drizzle-kit journal is in order: when strictly increases, idx is 0..n-1, every tag has its .sql, the snapshot chain is unbroken and no snapshot has a duplicate key',
      'integrity'
    ),
    legacyId: 591,
    article: 'XXVII',
    subsection: '27.1',
    title: 'Drizzle Migration Journal Integrity',
    rationale:
      "drizzle-orm's migrator reads the last applied migration's created_at once and runs a migration only if Number(created_at) < folderMillis, where folderMillis is the entry's `when` in meta/_journal.json (pg-core/dialect.js:62 in drizzle-orm 0.45.3; the mysql and sqlite dialects compare the same way). An entry whose `when` is not above its predecessor is skipped on every database that already ran the predecessor, and the command exits 0 with the schema missing the change. git merges the journal as text and knows nothing about its order, so two branches that merge cleanly produce exactly this — and a text merge of a snapshot can leave one table in it twice, which JSON.parse hides by keeping the last copy.",
    satisfiedBy: {
      typescript:
        'After merging branches that both ran `drizzle-kit generate`, regenerate the later migration on the merged tree so its `when` is above every entry before it and its snapshot\'s prevId is the previous snapshot\'s id. Commit the journal, every .sql and every snapshot.',
    },
    detectionLimits: [
      TRACKED_ONLY,
      'Reads the merged tree; a collision between two branches before they merge is invisible until it is merged.',
      'Does not know the state of any real database, nor whether a snapshot describes the .sql beside it.',
      'A journal found on disk but not tracked is reported (the migrator in CI reads a journal the repository does not contain); a project that uses `drizzle-kit push` with no generated migrations has no journal and is not selected.',
      'The snapshot of an entry is located as drizzle-kit names it (`meta/<tag prefix>_snapshot.json`); an entry whose snapshot is missing or unreadable is reported, and the prevId chain restarts after it.',
      '`drizzle-kit drop` of a migration other than the last leaves a gap in idx; the law reports it, because idx must be exactly 0..n-1.',
    ],
    emoji: '🧾',
    description:
      'The drizzle-kit journal is in order: when strictly increases, idx is 0..n-1, every tag has its .sql, the snapshot chain is unbroken and no snapshot has a duplicate key',
    priority: 'HIGH',
    category: 'DEPLOYMENT',
    stack: 'typescript',
    requires: REQUIRES_DRIZZLE_MIGRATIONS,
    defaultEnabled: true,
    defaultSeverity: 'error',
    automation: 'AUTOMATED',
    checkFunction: 'DrizzleMigrationJournalIntegrityLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXVII.27.1: the drizzle migration journal is out of order or inconsistent',
    remediation:
      'Regenerate the colliding migration on the merged tree; keep idx contiguous, one .sql per tag, an unbroken prevId chain',
  },

  {
    id: generateLawId(
      'SQL Check Constraint NULL Passes',
      'A CHECK constraint on a nullable column says what NULL means: IS NULL, IS NOT NULL or COALESCE for every nullable column it compares',
      'integrity'
    ),
    legacyId: 592,
    article: 'XXVII',
    subsection: '27.2',
    title: 'SQL Check Constraint NULL Passes',
    rationale:
      "A CHECK fails only when its expression is FALSE, and NULL is not FALSE (SQL standard; PostgreSQL, MySQL and SQLite all behave this way). `CHECK (status = 'x' OR kind = 'y')` on nullable columns holding NULL evaluates to NULL and the row is accepted. The constraint is present, reviewed and green, and guards nothing for exactly the row nobody thought about — a disarmed gate written in SQL.",
    satisfiedBy: {
      typescript:
        "In the migration: `CHECK (status IS NULL OR status IN ('a','b'))` when NULL is allowed, `CHECK (status IS NOT NULL AND status IN ('a','b'))` when it is not — or declare the column NOT NULL.",
      python:
        "In the migration: `CHECK (status IS NULL OR status IN ('a','b'))` when NULL is allowed, `CHECK (status IS NOT NULL AND status IN ('a','b'))` when it is not — or declare the column NOT NULL.",
    },
    detectionLimits: [
      TRACKED_ONLY,
      'Replays the tracked .sql files in natural path order (0001_, 0002_ …; V2 before V10); a chain whose order is not its path order is replayed in the wrong order.',
      'Reads the DDL migration tools write: CREATE TABLE, ALTER TABLE ADD / ALTER COLUMN SET|DROP NOT NULL / DROP / RENAME / MODIFY / CHANGE, DROP TABLE, CREATE and ALTER DOMAIN. A CHECK in any other statement is reported as unread, never skipped.',
      'A column reached through a function, a cast or arithmetic is reported as unread (it may pass NULL through); so is an identifier that is not a column the migrations define, which includes every column of a table created outside the tracked migrations.',
      'Nullability changed outside the tracked migrations (by hand, by an ORM at runtime, by Python migration code) is not seen.',
      'A deliberate "NULL is allowed" written without an explicit IS NULL branch is reported; the explicit branch is what makes it pass.',
      'A comparison inside a CASE WHEN condition is reported even though CASE sends NULL to ELSE.',
      'Migrations written as code (Alembic, Knex, TypeORM) are not read; only .sql files are.',
    ],
    emoji: '🕳️',
    description:
      'A CHECK constraint on a nullable column says what NULL means: IS NULL, IS NOT NULL or COALESCE for every nullable column it compares',
    priority: 'HIGH',
    category: 'CODE_QUALITY',
    requires: REQUIRES_SQL_FILES,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'SqlCheckConstraintNullPassesLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXVII.27.2: a CHECK constraint accepts NULL for a nullable column it compares',
    remediation:
      'Add an explicit IS NULL / IS NOT NULL branch for each nullable column the CHECK compares, or make the column NOT NULL',
  },

  {
    id: generateLawId(
      'Guard Function Has Production Caller',
      'An exported guard function (assert*, require*, enforce*, verify*, check*, schedule*) is referenced outside the tests',
      'integrity'
    ),
    legacyId: 593,
    article: 'XXVII',
    subsection: '27.3',
    title: 'Guard Function Has Production Caller',
    rationale:
      'A function such as requirePermission or scheduleDeletion gets written and thoroughly tested: coverage is high and review is green. The call in the real path never lands, because it was on another branch or was dropped in a conflict. The suite proves the guard works; nothing proves the guard runs. Unused-export tools stay quiet because the test file imports it, and Dead Code Elimination checks for that tooling, not for who calls what.',
    satisfiedBy: {
      typescript:
        'Call the guard on the path it protects (`requirePermission(user, "admin")` in the handler), or delete it with the feature it belonged to. Name the prefixes your project uses in `thresholds.integrity.guardPrefixes` (default: assert, require, enforce, verify, check, schedule).',
    },
    detectionLimits: [
      'Presence is not coverage: a guard called on one path and missing on another passes, and so does a call behind a condition that is never true.',
      'Only exported function declarations and exported `const x = () => …` / function expressions whose name is a prefix followed by an upper-case letter, digit, _ or $ (requireAdmin, not requirement); class methods and default-exported functions imported under another name are not followed.',
      'Names outside the prefix list are not checked. thresholds.integrity.guardPrefixes replaces the default list; it must be a non-empty list of identifier prefixes, and an invalid or empty list is a finding.',
      'References are matched by name in the syntax tree (comments and strings never count; import/export lists, declarations, object keys and recursion inside the guard do not count). Two guards with one name share their callers, and an unrelated `obj.requireX` counts as a reference.',
      'A function passed by reference counts as referenced (dynamic dispatch is not followed further).',
      'Test files are *.spec|test|cy|e2e.* and *.stories.* files, and anything under a __tests__, __mocks__, __fixtures__, test, tests, e2e, cypress, spec or specs directory; a test helper elsewhere counts as production.',
    ],
    emoji: '🛡️',
    description:
      'An exported guard function (assert*, require*, enforce*, verify*, check*, schedule*) is referenced outside the tests',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'typescript',
    requires: REQUIRES_TYPESCRIPT,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'GuardFunctionHasProductionCallerLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXVII.27.3: a guard function is referenced only by tests',
    remediation:
      'Call the guard on the real path it protects, or delete it',
  },

  {
    id: generateLawId(
      'Tsconfig Exclude Leaves Code Untyped',
      'Every TypeScript file a tsconfig excludes is included by some other tsconfig',
      'integrity'
    ),
    legacyId: 594,
    article: 'XXVII',
    subsection: '27.4',
    title: 'Tsconfig Exclude Leaves Code Untyped',
    rationale:
      '`"exclude": ["node_modules", "e2e"]` is a common setup, and a test runner that strips types at runtime does not check them. The excluded specs are then in no compilation at all: `tsc --noEmit` is green, and an undefined identifier reaches CI as a runtime failure — or never, if that line is not reached. The typecheck reports a pass over a subset without saying so; in the reported case 24 spec files across 6 tsconfigs were in none, and hid a real undefined identifier.',
    satisfiedBy: {
      typescript:
        'Give the excluded directory a tsconfig of its own that includes it (`e2e/tsconfig.json` with `"include": ["**/*.ts"]`) and run it in the typecheck, or stop excluding it.',
    },
    detectionLimits: [
      TRACKED_ONLY,
      'Whether the tsconfig that includes a file is actually run by any script is not checked.',
      "Configs are resolved with the project's own TypeScript (extends, include, files, exclude, references). A config, an extends or a reference it cannot resolve is a finding, and the files it would have included are not counted as covered.",
      'A config that sets neither include nor files (itself or through extends) and is extended by another tsconfig is treated as a shared base: its implicit include of everything beneath it is not counted as covering.',
      'Exclude entries naming a dependency or build folder (node_modules, dist, build, out, tmp, .next, coverage, www, android, ios …) or the config\'s outDir are skipped. Counted files are .ts, .tsx, .mts and .cts (a jest.config.cts is code); .d.ts files are not counted.',
      'Only `exclude` is read: a directory that no include ever reached, without being excluded, is out of scope. `// @ts-nocheck` inside an included file is not seen.',
    ],
    emoji: '🙈',
    description: 'Every TypeScript file a tsconfig excludes is included by some other tsconfig',
    priority: 'MEDIUM',
    category: 'CODE_QUALITY',
    stack: 'typescript',
    requires: REQUIRES_TSCONFIG,
    defaultEnabled: true,
    defaultSeverity: 'warning',
    automation: 'AUTOMATED',
    checkFunction: 'TsconfigExcludeLeavesCodeUntypedLaw.check',
    violationMessage:
      'CONSTITUTIONAL VIOLATION Article XXVII.27.4: an excluded directory is type-checked by no tsconfig',
    remediation:
      'Include the excluded files in a tsconfig of their own and run it, or stop excluding them',
  },
];
