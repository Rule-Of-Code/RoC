import fs from 'fs';
import path from 'path';

import { JestUnitTest100CoverageMandateLaw as Law } from '../../src/checkers/testing-laws/jest-unit-test-100-coverage-mandate';
import type { LawResult } from '../../src/types/law.types';
import { ctx, project, removeProjects } from '../checkers/toolkit-fixture';

afterAll(removeProjects);

/**
 * #605 — Jest Unit Test 100% Coverage Mandate read coverage/coverage-summary.json
 * whenever it existed: a report from an older tree decided the verdict, a file
 * that did not parse passed in silence, and an lcov.info or a configured
 * report path was never read. It now reads the report through the reader
 * Test Coverage uses (#599), with the same rules: older than the code, naming
 * none of the source files, or not a report goes to notRead and the law does
 * not pass; a usable report is measured as before.
 */
describe('#605 Jest 100% Coverage Mandate reads only a report it can use', () => {
  const PACKAGE = JSON.stringify({
    name: 'f',
    version: '1.0.0',
    scripts: { test: 'jest' },
    devDependencies: { jest: '^29.7.0' },
  });
  const JEST_100 =
    'module.exports = { coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } } };\n';
  const SOURCE = 'export const a = (x: number): number => x + 1;\n';
  const HOUR_MS = 3_600_000;

  const summary = (pct: number, file = 'src/a.ts'): string => {
    const metric = { total: 10, covered: pct / 10, skipped: 0, pct };
    const all = {
      lines: metric,
      statements: metric,
      functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
      branches: { total: 0, covered: 0, skipped: 0, pct: 100 },
    };
    return JSON.stringify({ total: all, [file]: all });
  };

  /** A project whose report was written `reportAgeMs` before the source changed (negative: after). */
  const projectWith = (
    report: Record<string, string>,
    reportAgeMs = -HOUR_MS
  ): string => {
    const root = project({
      'package.json': PACKAGE,
      'jest.config.js': JEST_100,
      'src/a.ts': SOURCE,
      ...report,
    });
    const sourceTime = new Date(Date.now() - 2 * HOUR_MS);
    fs.utimesSync(path.join(root, 'src/a.ts'), sourceTime, sourceTime);
    const reportTime = new Date(sourceTime.getTime() - reportAgeMs);
    for (const file of Object.keys(report)) {
      fs.utimesSync(path.join(root, file), reportTime, reportTime);
    }
    return root;
  };
  const check = (root: string, overrides = {}): LawResult =>
    Law.check(ctx(root, overrides));
  const coverageLines = (result: LawResult): string[] =>
    (result.violations ?? []).filter(v => v.startsWith('Coverage below'));

  describe('red on develop', () => {
    it('a report older than the code is not read, and the law does not pass', () => {
      const result = check(
        projectWith({ 'coverage/coverage-summary.json': summary(50) }, HOUR_MS)
      );

      expect(coverageLines(result)).toEqual([]);
      expect(result.notRead).toEqual([
        expect.stringMatching(
          /^coverage report coverage\/coverage-summary\.json is older than the code \(src\/a\.ts changed after it was written\), not read — the coverage it gives was not judged$/
        ),
      ]);
      expect(result.passed).toBe(false);
    });

    it('a coverage-summary.json that is not JSON is not read, and the law does not pass', () => {
      const result = check(
        projectWith({ 'coverage/coverage-summary.json': '{ not json' })
      );

      expect(result.notRead).toEqual([
        'coverage report coverage/coverage-summary.json is not a coverage-summary.json (json-summary) report, not read',
      ]);
      expect(result.passed).toBe(false);
    });

    it('a report that names none of the source files is not read', () => {
      const result = check(
        projectWith({
          'coverage/coverage-summary.json': summary(100, 'elsewhere/b.ts'),
        })
      );

      expect(result.notRead).toEqual([
        expect.stringMatching(
          /^coverage report coverage\/coverage-summary\.json names none of the 1 source files .*, not read — the coverage it gives was not judged$/
        ),
      ]);
      expect(result.passed).toBe(false);
    });

    it('an lcov.info is measured', () => {
      const result = check(
        projectWith({
          'coverage/lcov.info': 'SF:src/a.ts\nLF:10\nLH:5\nend_of_record\n',
        })
      );

      expect(result.violations).toContain(
        'Coverage below 100% in: lines (50%)'
      );
      expect(result.passed).toBe(false);
    });

    it('the report named by thresholds.testing.coverageReportPath is measured', () => {
      const result = check(
        projectWith({ 'reports/coverage.json': summary(50) }),
        {
          thresholds: {
            testing: { coverageReportPath: 'reports/coverage.json' },
          },
        }
      );

      expect(coverageLines(result)).toEqual([
        'Coverage below 100% in: lines (50%), statements (50%)',
      ]);
    });
  });

  describe('as before', () => {
    it('a fresh coverage-summary.json below 100% gives the same finding', () => {
      const result = check(
        projectWith({ 'coverage/coverage-summary.json': summary(50) })
      );

      expect(result.violations).toEqual([
        'Coverage below 100% in: lines (50%), statements (50%)',
      ]);
      expect(result.notRead).toBeUndefined();
      expect(result.passed).toBe(false);
      expect(result.score).toBe(80);
    });

    it('a fresh coverage-summary.json at 100% passes', () => {
      const result = check(
        projectWith({ 'coverage/coverage-summary.json': summary(100) })
      );

      expect(result.violations).toEqual([]);
      expect(result.notRead).toBeUndefined();
      expect(result.passed).toBe(true);
    });

    it('no report: passes and asks for one, as before', () => {
      const result = check(projectWith({}));

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toContain(
        'Run tests with coverage to generate coverage reports'
      );
      expect(result.passed).toBe(true);
    });
  });
});
