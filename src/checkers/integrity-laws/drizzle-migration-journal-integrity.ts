/**
 * Drizzle Migration Journal Integrity
 *
 * drizzle-orm's migrator reads the last applied migration's `created_at` once
 * and runs a migration only if `Number(created_at) < folderMillis`, where
 * `folderMillis` is the entry's `when` in `meta/_journal.json`
 * (pg-core/dialect.js; the mysql and sqlite dialects compare the same way).
 * An entry whose `when` is not above the one before it is skipped on every
 * database that already ran its predecessor, and the command exits 0.
 *
 * git merges the journal as text and knows nothing of its order, so two
 * branches that merge cleanly produce exactly this. The law reads the merged
 * tree: `when` strictly increasing, `idx` exactly 0..n-1, a tag for every .sql
 * and a .sql for every tag, an unbroken snapshot prevId chain, and no
 * duplicate key in any snapshot — read from the text, because JSON.parse
 * keeps the last value and hides the first.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { DRIZZLE_JOURNAL_PATTERN } from '../../utils/integrity/integrity-requirements';
import { duplicateJsonKeys } from '../../utils/integrity/json-duplicate-keys';
import { relativePath, trackedFiles } from '../../utils/integrity/tracked-files';
import { presentRequiredFiles } from '../../utils/law-requirements';
import { LawBase } from '../law-base';

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

/** One journal and the tracked files of its migrations folder. */
interface MigrationsFolder {
  journal: string;
  folder: string;
  tracked: Set<string>;
}

const JOURNAL_SUFFIX = '/meta/_journal.json';
const norm = (file: string): string => file.replace(/\\/g, '/');

export class DrizzleMigrationJournalIntegrityLaw extends LawBase {
  static readonly LAW_NAME = 'Drizzle Migration Journal Integrity';

  static check(context: LawCheckContext): LawResult {
    return this.createResult(
      this.findings(context.projectRoot),
      this.LAW_NAME,
      'DEPLOYMENT',
      [
        'Regenerate the colliding migration after the merge (drizzle-kit generate) so its when is above every entry before it',
        'Keep idx contiguous, one .sql per journal tag, and an unbroken snapshot prevId chain',
      ],
      context
    );
  }

  private static findings(root: string): string[] {
    const listed = trackedFiles(root, ['*meta/_journal.json', '*.sql', '*_snapshot.json']);
    if (!listed.ok) {
      return [`${listed.reason} — the migration journal was NOT read`];
    }
    const tracked = new Set(listed.files.map(norm));
    const journals = [...tracked].filter(file => file.endsWith(JOURNAL_SUFFIX));
    if (journals.length === 0) {
      const onDisk = presentRequiredFiles(root, [DRIZZLE_JOURNAL_PATTERN]).map(file =>
        relativePath(root, file)
      );
      return [
        `no tracked meta/_journal.json — ${onDisk.join(', ') || 'a journal'} exists on disk but git does not track it, so the migrator in CI and production reads a journal this repository does not contain`,
      ];
    }
    return journals.flatMap(journal =>
      this.checkFolder(root, {
        journal,
        folder: journal.slice(0, -JOURNAL_SUFFIX.length),
        tracked,
      })
    );
  }

  private static checkFolder(root: string, folder: MigrationsFolder): string[] {
    const where = relativePath(root, folder.journal);
    const read = this.readJson(folder.journal);
    if (!read.ok) return [`${where}: cannot read — ${read.reason}`];
    const entries = this.entries(read.value);
    if (typeof entries === 'string') return [`${where}: cannot read — ${entries}`];
    return [
      ...this.duplicateKeys(where, read.text),
      ...this.order(where, entries),
      ...this.files(root, where, folder, entries),
      ...this.snapshots(root, folder, entries),
    ];
  }

  private static readJson(
    file: string
  ): { ok: true; text: string; value: unknown } | { ok: false; reason: string } {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
    } catch {
      return { ok: false, reason: 'the file could not be opened' };
    }
    try {
      return { ok: true, text, value: JSON.parse(text) };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, reason: `not valid JSON (${detail}) — a merge conflict left in it reads the same way` };
    }
  }

  /** The entries, or why they cannot be read. */
  private static entries(journal: unknown): JournalEntry[] | string {
    const list = (journal as { entries?: unknown } | null)?.entries;
    if (!Array.isArray(list)) return 'it has no "entries" array';
    const entries: JournalEntry[] = [];
    for (const [position, item] of list.entries()) {
      const entry = item as Partial<JournalEntry> | null;
      if (
        typeof entry?.idx !== 'number' ||
        typeof entry.when !== 'number' ||
        typeof entry.tag !== 'string'
      ) {
        return `entry at position ${position} lacks a numeric idx, a numeric when or a string tag`;
      }
      entries.push({ idx: entry.idx, when: entry.when, tag: entry.tag });
    }
    return entries;
  }

  private static duplicateKeys(where: string, text: string): string[] {
    return duplicateJsonKeys(text).map(
      dup =>
        `${where}:${dup.line}: duplicate key "${dup.key}"${dup.path ? ` in ${dup.path}` : ''} — JSON.parse keeps the last one and hides the first, which is what a text merge leaves behind`
    );
  }

  /** Checks 1 and 2: `when` strictly increases, `idx` is exactly 0..n-1. */
  private static order(where: string, entries: JournalEntry[]): string[] {
    const findings: string[] = [];
    entries.forEach((entry, position) => {
      if (entry.idx !== position) {
        findings.push(
          `${where}: entry "${entry.tag}" has idx ${entry.idx} at position ${position} — idx must be exactly 0..${entries.length - 1} in order`
        );
      }
      const previous = entries[position - 1];
      if (previous && !(entry.when > previous.when)) {
        findings.push(
          `${where}: entry "${entry.tag}" has when ${entry.when}, not above "${previous.tag}" (${previous.when}) — drizzle-orm applies a migration only when its when is above the last applied one, so "${entry.tag}" is skipped, with exit 0, on every database that already ran "${previous.tag}"`
        );
      }
    });
    return findings;
  }

  /** Check 3: every tag has a tracked .sql, every tracked .sql has a tag. */
  private static files(
    root: string,
    where: string,
    folder: MigrationsFolder,
    entries: JournalEntry[]
  ): string[] {
    const findings: string[] = [];
    const tags = new Set(entries.map(entry => entry.tag));
    for (const tag of tags) {
      if (!folder.tracked.has(`${folder.folder}/${tag}.sql`)) {
        findings.push(`${where}: entry "${tag}" has no tracked ${tag}.sql beside the journal`);
      }
    }
    for (const file of folder.tracked) {
      if (!file.endsWith('.sql') || norm(path.dirname(file)) !== folder.folder) continue;
      const tag = path.basename(file, '.sql');
      if (!tags.has(tag)) {
        findings.push(
          `${relativePath(root, file)}: no journal entry names "${tag}" — the migrator runs only what the journal lists, so this migration never runs`
        );
      }
    }
    return findings;
  }

  /** Check 5: no duplicate key in any tracked snapshot of the folder. */
  private static snapshotDuplicates(root: string, folder: MigrationsFolder): string[] {
    const meta = `${folder.folder}/meta`;
    return [...folder.tracked]
      .filter(file => file.endsWith('_snapshot.json') && norm(path.dirname(file)) === meta)
      .flatMap(file => {
        const read = this.readJson(file);
        return read.ok ? this.duplicateKeys(relativePath(root, file), read.text) : [];
      });
  }

  /** The id and prevId of an entry's snapshot, or why they cannot be read. */
  private static snapshotIds(
    folder: MigrationsFolder,
    entry: JournalEntry
  ): { file: string; ids: { id: string; prevId: string } | string } {
    const file = `${folder.folder}/meta/${entry.tag.split('_')[0]}_snapshot.json`;
    if (!folder.tracked.has(file)) return { file, ids: `the snapshot of "${entry.tag}" is not tracked` };
    const read = this.readJson(file);
    if (!read.ok) return { file, ids: `the snapshot of "${entry.tag}" is unreadable (${read.reason})` };
    const { id, prevId } = read.value as { id?: unknown; prevId?: unknown };
    if (typeof id !== 'string' || typeof prevId !== 'string') {
      return { file, ids: `the snapshot of "${entry.tag}" has no string id and prevId` };
    }
    return { file, ids: { id, prevId } };
  }

  /** Checks 4 and 5: the prevId chain along the journal, and duplicate keys in every snapshot. */
  private static snapshots(root: string, folder: MigrationsFolder, entries: JournalEntry[]): string[] {
    const findings = this.snapshotDuplicates(root, folder);
    let previous: { tag: string; id: string } | null = null;
    for (const entry of entries) {
      const { file, ids } = this.snapshotIds(folder, entry);
      const where = relativePath(root, file);
      if (typeof ids === 'string') {
        findings.push(`${where}: cannot read — ${ids}; the prevId chain cannot be verified past it`);
        previous = null;
        continue;
      }
      if (previous && ids.prevId !== previous.id) {
        findings.push(
          `${where}: prevId ${ids.prevId} is not the id of the previous snapshot ("${previous.tag}", ${previous.id}) — two branches generated from the same parent`
        );
      }
      previous = { tag: entry.tag, id: ids.id };
    }
    return findings;
  }
}
