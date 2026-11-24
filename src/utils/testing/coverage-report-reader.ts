/**
 * Coverage Report Reader (#599)
 *
 * Reads the per-file LINE coverage a test run wrote: Istanbul's
 * `coverage-summary.json` (Jest `json-summary`) or an `lcov.info`. The file
 * keys are resolved from the project root — absolute paths stay as they are —
 * and canonicalised the way the test import reader canonicalises sources, so
 * the two compare by the same spelling.
 *
 * Neither format records the commit it was made from, so the caller judges
 * freshness by the report's modification time (`modifiedMs`).
 */

import * as fs from 'fs';

import { PathOperations } from '../path-operations';
import { canonicalPath } from './test-import-reader';

/** The config key that names a report in another place. */
export const COVERAGE_REPORT_KEY = 'thresholds.testing.coverageReportPath';

/** Where a report is looked for when none is configured, in this order. */
export const DEFAULT_COVERAGE_REPORTS = [
  'coverage/coverage-summary.json',
  'coverage/lcov.info',
];

export interface LineCoverage {
  covered: number;
  total: number;
}

export interface CoverageReport {
  /** The report, relative to the project root. */
  path: string;
  /** Line coverage by canonical source path. */
  lines: Map<string, LineCoverage>;
  /** When the report was last written. */
  modifiedMs: number;
}

/**
 * No report at all; a report that could not be used (`note` says why, said
 * as a note, never as a finding); or the report.
 */
export type ReportLookup =
  | { kind: 'none' }
  | { kind: 'unread'; note: string }
  | { kind: 'read'; report: CoverageReport };

type Entries = Array<[string, LineCoverage]>;

/** One lcov `SF:` … `end_of_record` block while it is read. */
interface LcovRecord {
  source: string;
  found?: number;
  hit?: number;
  daTotal: number;
  daHit: number;
}

export class CoverageReportReader {
  /** The configured report, or the first default one that exists. */
  static find(projectRoot: string, configured: unknown): ReportLookup {
    if (configured !== undefined && configured !== null) {
      if (typeof configured !== 'string' || configured.trim() === '') {
        return {
          kind: 'unread',
          note: `${COVERAGE_REPORT_KEY} is ${JSON.stringify(configured)} — not a path, so no coverage report was read`,
        };
      }
      return this.readAt(projectRoot, configured, true);
    }
    for (const candidate of DEFAULT_COVERAGE_REPORTS) {
      const lookup = this.readAt(projectRoot, candidate, false);
      if (lookup.kind !== 'none') return lookup;
    }
    return { kind: 'none' };
  }

  private static readAt(
    projectRoot: string,
    reportPath: string,
    configured: boolean
  ): ReportLookup {
    const file = PathOperations.resolve(projectRoot, reportPath);
    const shown = PathOperations.getRelative(projectRoot, file) || reportPath;
    let text: string;
    let modifiedMs: number;
    try {
      modifiedMs = fs.statSync(file).mtimeMs;
      text = fs.readFileSync(file, 'utf8');
    } catch {
      if (!configured) return { kind: 'none' };
      return {
        kind: 'unread',
        note: `${COVERAGE_REPORT_KEY} names ${shown}, which could not be read, so no coverage report was read`,
      };
    }
    const entries = file.toLowerCase().endsWith('.json')
      ? this.parseSummary(text)
      : this.parseLcov(text);
    if (entries === null) {
      return {
        kind: 'unread',
        note: `coverage report ${shown} is not a ${file.toLowerCase().endsWith('.json') ? 'coverage-summary.json (json-summary)' : 'lcov'} report, not read`,
      };
    }
    const lines = new Map<string, LineCoverage>();
    for (const [source, coverage] of entries) {
      lines.set(
        canonicalPath(PathOperations.resolve(projectRoot, source)),
        coverage
      );
    }
    return { kind: 'read', report: { path: shown, lines, modifiedMs } };
  }

  /** `{ total, "<file>": { lines: { total, covered } } }`, or null. */
  static parseSummary(text: string): Entries | null {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    const entries: Entries = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (key === 'total') continue;
      const lines = (
        value as { lines?: { total?: unknown; covered?: unknown } }
      )?.lines;
      if (typeof lines?.total !== 'number' || typeof lines.covered !== 'number')
        return null;
      entries.push([key, { covered: lines.covered, total: lines.total }]);
    }
    return entries;
  }

  /**
   * `SF:` opens a file and `end_of_record` closes it; `LF`/`LH` give the
   * line totals, and the `DA:<line>,<hits>` records are counted when they
   * are missing. Null when the text holds no record.
   */
  static parseLcov(text: string): Entries | null {
    const entries: Entries = [];
    let record: LcovRecord | null = null;
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (line.startsWith('SF:')) {
        record = { source: line.slice('SF:'.length), daTotal: 0, daHit: 0 };
      } else if (line === 'end_of_record') {
        if (record) entries.push(this.closeRecord(record));
        record = null;
      } else if (record) {
        this.readRecordLine(record, line);
      }
    }
    return entries.length > 0 ? entries : null;
  }

  private static readRecordLine(record: LcovRecord, line: string): void {
    if (line.startsWith('LF:')) record.found = Number(line.slice('LF:'.length));
    else if (line.startsWith('LH:'))
      record.hit = Number(line.slice('LH:'.length));
    else if (line.startsWith('DA:')) {
      record.daTotal++;
      if (Number(line.split(',')[1]) > 0) record.daHit++;
    }
  }

  private static closeRecord(record: LcovRecord): [string, LineCoverage] {
    const total = Number.isFinite(record.found)
      ? (record.found as number)
      : record.daTotal;
    const covered = Number.isFinite(record.hit)
      ? (record.hit as number)
      : record.daHit;
    return [record.source, { covered, total }];
  }
}
