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
];
