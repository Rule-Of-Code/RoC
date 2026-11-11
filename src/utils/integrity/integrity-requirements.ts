/**
 * The `requires` of the integrity laws.
 *
 * The migration laws are gated on a FILE whose location the project chooses
 * (drizzle-kit writes its journal under whatever `out` says; SQL migrations
 * live wherever the tool keeps them), so their `anyFile` entries are glob
 * patterns: `anyFile` is resolved with glob at the workspace root and in each
 * workspace project directory, and node_modules, dist and dot-directories are
 * never walked. The selection tests pin that these patterns select.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';

/** Where drizzle-kit keeps the journal: `<out>/meta/_journal.json`. */
export const DRIZZLE_JOURNAL_PATTERN = '**/meta/_journal.json';

/** drizzle-orm declared, and a drizzle-kit journal on disk. */
export const REQUIRES_DRIZZLE_MIGRATIONS: LawRequirement = {
  anyDependency: ['drizzle-orm'],
  anyFile: [DRIZZLE_JOURNAL_PATTERN],
};

/** A .sql file anywhere in the tree (the law then reads the ones git tracks). */
export const REQUIRES_SQL_FILES: LawRequirement = {
  anyFile: ['**/*.sql'],
};
