/**
 * The share verdict the two "find it the way a user does" laws give: the
 * user-facing share of all element queries, held to a floor, naming the files
 * that carry the most implementation-detail queries.
 */

export interface FileCount {
  file: string;
  /** Implementation-detail queries in this file. */
  count: number;
}

export type Floor = { ok: true; value: number } | { ok: false; reason: string };

/**
 * A configured percentage floor, or the default when unset. A value that is
 * not a number from 0 to 100 is reported, never replaced by a guess.
 */
export function percentFloor(configured: unknown, key: string, fallback: number): Floor {
  if (configured === undefined || configured === null) return { ok: true, value: fallback };
  if (typeof configured === 'number' && Number.isFinite(configured) && configured >= 0 && configured <= 100) {
    return { ok: true, value: configured };
  }
  return {
    ok: false,
    reason: `${key} is ${JSON.stringify(configured)} — not a percentage from 0 to 100. The law did not judge the share on a guessed floor`,
  };
}

/** How many offending files a verdict names. */
const NAMED_FILES = 5;

/** The violation when the share is below the floor, or null when it is not (or nothing was counted). */
export function shareSummary(input: {
  userFacing: number;
  byFile: FileCount[];
  floor: number;
  what: string;
  userFacingNames: string;
  implementationNames: string;
}): string | null {
  const implementation = input.byFile.reduce((sum, entry) => sum + entry.count, 0);
  const total = input.userFacing + implementation;
  if (total === 0) return null;
  const share = (input.userFacing / total) * 100;
  if (share >= input.floor) return null;
  const worst = input.byFile
    .filter(entry => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file))
    .slice(0, NAMED_FILES)
    .map(entry => `${entry.file} (${entry.count})`)
    .join(', ');
  return `${input.userFacing} of ${total} ${input.what} (${Math.floor(share)}%) find an element the way a user does (${input.userFacingNames}); the floor is ${input.floor}%. Most ${input.implementationNames}: ${worst}`;
}
