/**
 * What the Next.js client laws share: reading an allow list whose entries
 * must carry a reason, and matching a path against config globs.
 *
 * An allow list entry without a reason is a silent waiver; it is reported as
 * a violation and not honoured, so the list cannot grow by copy-paste.
 */

import { minimatch } from 'minimatch';
import type { LawCheckContext } from '../../types/law.types';

export interface ReasonedEntry {
  /** The value the entry allows (a host, a path glob). */
  value: string;
}

/**
 * The honoured entries of an allow list, and a violation for each entry that
 * names no value or gives no reason.
 */
export function reasonedEntries<T extends { reason?: unknown }>(
  entries: readonly T[] | undefined,
  key: keyof T & string,
  where: string
): { allowed: string[]; problems: string[] } {
  const allowed: string[] = [];
  const problems: string[] = [];
  for (const [index, entry] of (entries ?? []).entries()) {
    const value = entry?.[key];
    const reason = entry?.reason;
    if (typeof value !== 'string' || value.trim() === '') {
      problems.push(`${where}[${index}]: no ${key} — the entry allows nothing and is ignored`);
      continue;
    }
    if (typeof reason !== 'string' || reason.trim() === '') {
      problems.push(`${where}[${index}] (${value}): no reason given — an allow list entry must say why, so it is not honoured`);
      continue;
    }
    allowed.push(value);
  }
  return { allowed, problems };
}

/** True when `path` matches one of the globs. */
export function matchesAny(path: string, globs: readonly string[]): boolean {
  return globs.some(glob => minimatch(path, glob, { dot: true }));
}

/** The `thresholds.next` block of the config. */
export function nextThresholds(context: LawCheckContext) {
  return context.config.thresholds?.next ?? {};
}
