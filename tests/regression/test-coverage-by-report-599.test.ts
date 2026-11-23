/**
 * #599 — Test Coverage Constitutional Standard judges by REAL coverage.
 *
 * With a coverage report (coverage/coverage-summary.json, else
 * coverage/lcov.info, or thresholds.testing.coverageReportPath) each source
 * file is judged by its line coverage: below
 * thresholds.testing.minFileLineCoveragePercent (default 80) is a finding
 * with the percentage. Before, the law only asked for a test file named
 * after each source or importing it, so a file covered at 95% by a test
 * named otherwise failed, and a file with a test that ran 10% of it passed.
 *
 * A report older than the code is never read in silence: the note goes to
 * notRead and the files are judged by presence. Without a report the result
 * is what it was.
 */
import fs from 'fs';
import path from 'path';

import { TestCoverageConstitutionalStandardLaw } from '../../src/checkers/testing-laws/test-coverage-constitutional-standard';
import { TestFilesExistenceChecker } from '../../src/utils/testing/test-files-existence-checker';
import { TESTING_LAWS } from '../../src/data/testing-laws';
import { FileUtils } from '../../src/utils/file-utils';
import type { RuleOfCodeConfig } from '../../src/config/types';
import {
  project,
  removeProjects,
  writeFiles,
} from '../checkers/toolkit-fixture';

const SOURCE = 'export const answer = (): number => 42;\n';
const SUMMARY = 'coverage/coverage-summary.json';
const LCOV = 'coverage/lcov.info';
const HOUR_MS = 3_600_000;

/** A Jest project the configuration inspectors accept, with two sources and no test. */
const JEST_PROJECT = {
  'package.json': JSON.stringify({
    name: 'fixture',
    scripts: { test: 'jest' },
    devDependencies: { jest: '30.0.0' },
  }),
  'jest.config.js':
    'module.exports = { collectCoverage: true, coverageThreshold: { global: { lines: 80 } } };\n',
  'src/a.ts': SOURCE,
  'src/b.ts': SOURCE,
};

/** A json-summary report giving each file `pct`% of 100 lines. */
function summary(root: string, pcts: Record<string, number>): string {
  const report: Record<string, unknown> = {
    total: { lines: { total: 0, covered: 0, skipped: 0, pct: 100 } },
  };
  for (const [file, pct] of Object.entries(pcts)) {
    report[path.join(root, file)] = {
      lines: { total: 100, covered: pct, skipped: 0, pct },
    };
  }
  return JSON.stringify(report);
}

/** Set a file's modification time `offsetMs` from now. */
function touch(root: string, file: string, offsetMs: number): void {
  const at = new Date(Date.now() + offsetMs);
  fs.utimesSync(path.join(root, file), at, at);
}

/** Write the report, and make it newer than every source. */
function withReport(root: string, file: string, content: string): void {
  writeFiles(root, { [file]: content });
  touch(root, file, HOUR_MS);
}

function check(root: string, testing: Record<string, unknown> = {}) {
  const config = {
    ...FileUtils.getMinimalDefaultConfig(),
    thresholds: { testing },
  } as RuleOfCodeConfig;
  const result = TestCoverageConstitutionalStandardLaw.check({
    projectRoot: root,
    config,
  });
  return {
    ...result,
    violations: result.violations ?? [],
    suggestions: result.suggestions ?? [],
  };
}

const LACKING = /lack corresponding test files/;

describe('#599 Test Coverage Constitutional Standard judges by line coverage', () => {
  afterEach(removeProjects);

  it('red before #599: files covered by a fresh report are not asked for a test named after them', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 90 })
    );

    const result = check(root);

    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.notRead).toBeUndefined();
    expect(result.message).toContain(
      'files judged by their line coverage in coverage/coverage-summary.json'
    );
  });

  it('red before #599: a file below 80% is a finding with its percentage, even with a test named after it', () => {
    const root = project({
      ...JEST_PROJECT,
      'src/a.test.ts': "import { answer } from './a';\n",
      'src/b.test.ts': "import { answer } from './b';\n",
    });
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 42.38 })
    );

    const result = check(root);

    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^1 source file\(s\) below 80% line coverage in coverage\/coverage-summary\.json: src[\\/]b\.ts 42\.3%$/
      ),
    ]);
  });

  it('the floor is thresholds.testing.minFileLineCoveragePercent', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 42 })
    );

    expect(check(root, { minFileLineCoveragePercent: 40 }).violations).toEqual(
      []
    );
    expect(check(root, { minFileLineCoveragePercent: 96 }).violations).toEqual([
      expect.stringMatching(/^2 source file\(s\) below 96%/),
    ]);
  });

  it('a floor outside 0–100 is reported, and the files are judged by presence', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 95 })
    );

    const result = check(root, { minFileLineCoveragePercent: 150 });

    expect(result.violations[0]).toMatch(
      /thresholds\.testing\.minFileLineCoveragePercent is 150 — not a percentage from 0 to 100/
    );
    expect(result.violations.some(v => LACKING.test(v))).toBe(true);
  });

  it('red before #599: a report older than the code is not read — said in notRead, judged by presence, not passed', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 95 })
    );
    touch(root, 'src/b.ts', 2 * HOUR_MS);

    const result = check(root);

    expect(result.notRead).toEqual([
      expect.stringMatching(
        /^coverage report coverage\/coverage-summary\.json is older than the code \(src[\\/]b\.ts changed after it was written\), not read/
      ),
    ]);
    expect(result.violations.some(v => LACKING.test(v))).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('…and a stale report never passes, even when presence finds nothing', () => {
    const root = project({
      ...JEST_PROJECT,
      'src/a.test.ts': "import { answer } from './a';\n",
      'src/b.test.ts': "import { answer } from './b';\n",
    });
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 10, 'src/b.ts': 10 })
    );
    touch(root, 'src/a.ts', 2 * HOUR_MS);

    const result = check(root);

    expect(result.violations).toEqual([]);
    expect(result.notRead).toHaveLength(1);
    expect(result.passed).toBe(false);
  });

  it('green control: without a report the result is the presence verdict, unchanged', () => {
    const root = project(JEST_PROJECT);

    const result = check(root);
    const presence = TestFilesExistenceChecker.checkTestFilesExistence(
      root,
      FileUtils.getMinimalDefaultConfig()
    );

    expect(result.violations).toEqual(presence.violations);
    expect(result.violations.some(v => LACKING.test(v))).toBe(true);
    expect(result.notRead).toBeUndefined();
    expect(result.message).not.toContain('line coverage');
  });

  it('reads lcov.info, with relative SF paths and DA records when LF/LH are missing', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      LCOV,
      [
        'TN:',
        'SF:src/a.ts',
        'LF:10',
        'LH:9',
        'end_of_record',
        'SF:src/b.ts',
        'DA:1,1',
        'DA:2,0',
        'DA:3,0',
        'DA:4,0',
        'end_of_record',
        '',
      ].join('\n')
    );

    expect(check(root).violations).toEqual([
      expect.stringMatching(
        /^1 source file\(s\) below 80% line coverage in coverage\/lcov\.info: src[\\/]b\.ts 25%$/
      ),
    ]);
  });

  it('thresholds.testing.coverageReportPath names another report; one that cannot be read is a note', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      'reports/cov.json',
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 50 })
    );

    expect(
      check(root, { coverageReportPath: 'reports/cov.json' }).violations
    ).toEqual([
      expect.stringMatching(/below 80% line coverage in reports[\\/]cov\.json/),
    ]);

    const missing = check(root, { coverageReportPath: 'reports/none.json' });
    expect(missing.notRead).toEqual([
      expect.stringMatching(
        /thresholds\.testing\.coverageReportPath names reports[\\/]none\.json, which could not be read/
      ),
    ]);
    expect(missing.violations.some(v => LACKING.test(v))).toBe(true);
  });

  it('a source file the report does not name is judged by presence, and the finding names the report', () => {
    const root = project({ ...JEST_PROJECT, 'src/c.ts': SOURCE });
    withReport(
      root,
      SUMMARY,
      summary(root, { 'src/a.ts': 95, 'src/b.ts': 95 })
    );

    const result = check(root);

    expect(result.violations).toEqual([
      expect.stringMatching(
        /^1 source files are not in coverage\/coverage-summary\.json and lack corresponding test files/
      ),
    ]);
    expect(result.suggestions.join('\n')).toMatch(
      /Add test files for: src[\\/]c\.ts/
    );
  });

  it('a report that names none of the source files is a note, not a pass', () => {
    const root = project(JEST_PROJECT);
    withReport(
      root,
      SUMMARY,
      summary(path.join(root, 'elsewhere'), { 'src/a.ts': 95, 'src/b.ts': 95 })
    );

    const result = check(root);

    expect(result.notRead).toEqual([
      expect.stringMatching(/names none of the 2 source files/),
    ]);
    expect(result.violations.some(v => LACKING.test(v))).toBe(true);
  });

  it('a report that is not json-summary is a note', () => {
    const root = project(JEST_PROJECT);
    withReport(root, SUMMARY, '{ "not": "a summary" }');

    expect(check(root).notRead).toEqual([
      expect.stringMatching(
        /is not a coverage-summary\.json \(json-summary\) report, not read/
      ),
    ]);
  });

  it('the card names both keys and says the mode is in the result', () => {
    const card = TESTING_LAWS.find(
      law => law.title === 'Test Coverage Constitutional Standard'
    );
    const text = JSON.stringify(card);
    expect(text).toContain('thresholds.testing.minFileLineCoveragePercent');
    expect(text).toContain('thresholds.testing.coverageReportPath');
    expect(text).toContain('older than the code');
  });
});
