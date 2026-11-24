/**
 * CoverageReportReader (#599): finds and parses a json-summary or lcov
 * report. A report that cannot be used is a note, never a silent "none".
 */
import path from 'path';

import {
  COVERAGE_REPORT_KEY,
  CoverageReportReader,
} from '../../../src/utils/testing/coverage-report-reader';
import { canonicalPath } from '../../../src/utils/testing/test-import-reader';
import {
  project,
  removeProjects,
  writeFiles,
} from '../../checkers/toolkit-fixture';

afterEach(removeProjects);

describe('CoverageReportReader.parseSummary', () => {
  it('reads each file’s line totals and skips the total entry', () => {
    const entries = CoverageReportReader.parseSummary(
      JSON.stringify({
        total: { lines: { total: 200, covered: 150 } },
        '/p/src/a.ts': { lines: { total: 100, covered: 90 } },
        '/p/src/b.ts': { lines: { total: 100, covered: 60 } },
      })
    );
    expect(entries).toEqual([
      ['/p/src/a.ts', { covered: 90, total: 100 }],
      ['/p/src/b.ts', { covered: 60, total: 100 }],
    ]);
  });

  it('is null for text that is not JSON', () => {
    expect(CoverageReportReader.parseSummary('not json')).toBeNull();
  });

  it('is null for JSON that is not an object', () => {
    expect(CoverageReportReader.parseSummary('42')).toBeNull();
    expect(CoverageReportReader.parseSummary('null')).toBeNull();
  });

  it('is null when a file has no numeric line totals', () => {
    expect(
      CoverageReportReader.parseSummary(
        JSON.stringify({ '/p/src/a.ts': { statements: { total: 1 } } })
      )
    ).toBeNull();
  });
});

describe('CoverageReportReader.parseLcov', () => {
  it('reads LF / LH when they are present', () => {
    const entries = CoverageReportReader.parseLcov(
      ['SF:src/a.ts', 'DA:1,1', 'LF:10', 'LH:7', 'end_of_record', ''].join('\n')
    );
    expect(entries).toEqual([['src/a.ts', { covered: 7, total: 10 }]]);
  });

  it('counts the DA records when LF / LH are missing', () => {
    const entries = CoverageReportReader.parseLcov(
      ['SF:src/a.ts', 'DA:1,3', 'DA:2,0', 'DA:3,1', 'end_of_record'].join(
        '\r\n'
      )
    );
    expect(entries).toEqual([['src/a.ts', { covered: 2, total: 3 }]]);
  });

  it('is null for text with no record', () => {
    expect(CoverageReportReader.parseLcov('')).toBeNull();
    expect(CoverageReportReader.parseLcov('TN:\nDA:1,1\n')).toBeNull();
  });
});

describe('CoverageReportReader.find', () => {
  it('is none when the project has no report and none is configured', () => {
    expect(CoverageReportReader.find(project({}), undefined)).toEqual({
      kind: 'none',
    });
  });

  it('reads the default json-summary report, keyed by canonical path', () => {
    const root = project({});
    writeFiles(root, {
      'coverage/coverage-summary.json': JSON.stringify({
        'src/a.ts': { lines: { total: 4, covered: 3 } },
      }),
    });

    const lookup = CoverageReportReader.find(root, undefined);

    expect(lookup.kind).toBe('read');
    if (lookup.kind !== 'read') return;
    expect(lookup.report.path).toBe('coverage/coverage-summary.json');
    expect(
      lookup.report.lines.get(canonicalPath(path.join(root, 'src/a.ts')))
    ).toEqual({ covered: 3, total: 4 });
  });

  it('falls back to lcov.info when there is no json-summary report', () => {
    const root = project({});
    writeFiles(root, {
      'coverage/lcov.info': 'SF:src/a.ts\nLF:2\nLH:1\nend_of_record\n',
    });

    const lookup = CoverageReportReader.find(root, undefined);

    expect(lookup.kind).toBe('read');
  });

  it('says a configured value that is not a path, naming the key', () => {
    const lookup = CoverageReportReader.find(project({}), 42);

    expect(lookup).toEqual({
      kind: 'unread',
      note: `${COVERAGE_REPORT_KEY} is 42 — not a path, so no coverage report was read`,
    });
  });

  it('says a configured report that cannot be read', () => {
    const lookup = CoverageReportReader.find(project({}), 'out/missing.json');

    expect(lookup.kind).toBe('unread');
    if (lookup.kind !== 'unread') return;
    expect(lookup.note).toMatch(/could not be read, so no coverage report/);
  });

  it('says a report in neither format', () => {
    const root = project({});
    writeFiles(root, { 'coverage/coverage-summary.json': '{"a":{}}' });

    expect(CoverageReportReader.find(root, undefined)).toEqual({
      kind: 'unread',
      note: `coverage report ${'coverage/coverage-summary.json'} is not a coverage-summary.json (json-summary) report, not read`,
    });
  });
});
