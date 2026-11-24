/**
 * CoverageByReport (#599): which way the files are judged — by the line
 * coverage of a fresh report, or by the presence of a test.
 */
import fs from 'fs';
import path from 'path';

import {
  CoverageByReport,
  LINE_COVERAGE_KEY,
} from '../../../src/checkers/testing-laws/coverage-by-report';
import type { RuleOfCodeConfig } from '../../../src/config/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { project, removeProjects, writeFiles } from '../toolkit-fixture';

const SOURCE = 'export const answer = (): number => 42;\n';
const SUMMARY = 'coverage/coverage-summary.json';
const HOUR_MS = 3_600_000;

afterEach(removeProjects);

function scope(root: string, testing: Record<string, unknown> = {}) {
  return {
    projectRoot: root,
    config: {
      ...FileUtils.getMinimalDefaultConfig(),
      thresholds: { testing },
    } as RuleOfCodeConfig,
  };
}

/** A report giving each file `pct` of 100 lines, written after the sources. */
function report(root: string, pcts: Record<string, number>): void {
  const body: Record<string, unknown> = {};
  for (const [file, pct] of Object.entries(pcts)) {
    body[path.join(root, file)] = { lines: { total: 100, covered: pct } };
  }
  writeFiles(root, { [SUMMARY]: JSON.stringify(body) });
  const later = new Date(Date.now() + HOUR_MS);
  fs.utimesSync(path.join(root, SUMMARY), later, later);
}

describe('CoverageByReport.judge', () => {
  it('without a report judges by presence and names no report', () => {
    const verdict = CoverageByReport.judge(
      scope(project({ 'src/a.ts': SOURCE }))
    );

    expect(verdict.report).toBeNull();
    expect(verdict.notRead).toEqual([]);
    expect(verdict.violations.join('\n')).toMatch(/lack corresponding test/);
  });

  it('with a fresh report passes the files at or above the floor', () => {
    const root = project({ 'src/a.ts': SOURCE });
    report(root, { 'src/a.ts': 80 });

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict).toEqual({
      violations: [],
      suggestions: [],
      notRead: [],
      report: 'coverage/coverage-summary.json',
    });
  });

  it('names a file below the floor with its percentage', () => {
    const root = project({ 'src/a.ts': SOURCE, 'src/b.ts': SOURCE });
    report(root, { 'src/a.ts': 95, 'src/b.ts': 42 });

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict.violations).toEqual([
      `1 source file(s) below 80% line coverage in ${'coverage/coverage-summary.json'}: src/b.ts 42%`,
    ]);
  });

  it('takes the floor from the config key', () => {
    const root = project({ 'src/a.ts': SOURCE });
    report(root, { 'src/a.ts': 42 });

    const verdict = CoverageByReport.judge(
      scope(root, { minFileLineCoveragePercent: 40 })
    );

    expect(verdict.violations).toEqual([]);
    expect(LINE_COVERAGE_KEY).toBe(
      'thresholds.testing.minFileLineCoveragePercent'
    );
  });

  it('says a report older than the code and judges by presence', () => {
    const root = project({ 'src/a.ts': SOURCE });
    report(root, { 'src/a.ts': 95 });
    const later = new Date(Date.now() + 2 * HOUR_MS);
    fs.utimesSync(path.join(root, 'src/a.ts'), later, later);

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict.report).toBeNull();
    expect(verdict.notRead).toEqual([
      expect.stringMatching(/is older than the code .* not read/),
    ]);
  });
});

/** A report giving each file `covered` of `total` lines, written after the sources. */
function reportLines(
  root: string,
  lines: Record<string, { covered: number; total: number }>
): void {
  const body: Record<string, unknown> = {};
  for (const [file, value] of Object.entries(lines)) {
    body[path.join(root, file)] = { lines: value };
  }
  writeFiles(root, { [SUMMARY]: JSON.stringify(body) });
  const later = new Date(Date.now() + HOUR_MS);
  fs.utimesSync(path.join(root, SUMMARY), later, later);
}

const TYPES_ONLY = [
  "import type { Config } from './config';",
  'export interface Result {',
  '  passed: boolean;',
  '  config: Config;',
  '}',
  "export type Verdict = 'pass' | 'fail';",
  "export type { Config } from './config';",
  'declare const VERSION: string;',
  '',
].join('\n');

describe('CoverageByReport.judge — files with no runtime code', () => {
  it('red before the fix: a type-only file at 0 of 1 line is not a finding', () => {
    const root = project({
      'src/a.ts': SOURCE,
      'src/types.ts': TYPES_ONLY,
      'src/config.ts': 'export interface Config { name: string }\n',
    });
    reportLines(root, {
      'src/a.ts': { covered: 10, total: 10 },
      'src/types.ts': { covered: 0, total: 1 },
      'src/config.ts': { covered: 0, total: 1 },
    });

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict.violations).toEqual([]);
    expect(verdict.report).toBe('coverage/coverage-summary.json');
  });

  it('control: a file with one function at 0 of 1 line is still a finding', () => {
    const root = project({ 'src/a.ts': SOURCE, 'src/types.ts': TYPES_ONLY });
    reportLines(root, {
      'src/a.ts': { covered: 0, total: 1 },
      'src/types.ts': { covered: 0, total: 1 },
    });

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict.violations).toEqual([
      '1 source file(s) below 80% line coverage in coverage/coverage-summary.json: src/a.ts 0%',
    ]);
  });

  it('control: a type-only file the report does not name is not asked for a test', () => {
    const root = project({ 'src/a.ts': SOURCE, 'src/types.ts': TYPES_ONLY });
    reportLines(root, { 'src/a.ts': { covered: 10, total: 10 } });

    const verdict = CoverageByReport.judge(scope(root));

    expect(verdict.violations).toEqual([]);
  });
});
