/**
 * Test Coverage Constitutional Standard — which files are tested (#599).
 *
 * With a coverage report the law judges each source file by the line coverage
 * the report gives it: below `thresholds.testing.minFileLineCoveragePercent`
 * (default 80) is a finding, with the percentage. A source file the report
 * does not name is judged as before, by the presence of a test.
 *
 * Without a report — or with one that cannot be used — the law judges by
 * presence alone: a test named after the file or importing it (#539), and
 * the test-file ratio. A report that cannot be used is never passed over in
 * silence: why it was not read is a note (`notRead`), so the result cannot
 * pass on old or foreign numbers.
 *
 * Neither coverage-summary.json nor lcov.info records the commit it was made
 * from, so a report is older than the code when any judged source file was
 * modified after it. A checkout rewrites the files it changes, so after a
 * branch switch the report reads as old and the law falls back to presence;
 * it never reads numbers that predate the code.
 */

import * as fs from 'fs';

import type { RuleOfCodeConfig } from '../../config/types';
import { PathOperations } from '../../utils/path-operations';
import {
  type CoverageReport,
  CoverageReportReader,
  type LineCoverage,
} from '../../utils/testing/coverage-report-reader';
import { canonicalPath } from '../../utils/testing/test-import-reader';
import { TestFilesExistenceChecker } from '../../utils/testing/test-files-existence-checker';
import { percentFloor } from './query-share';

export const LINE_COVERAGE_KEY =
  'thresholds.testing.minFileLineCoveragePercent';
const DEFAULT_LINE_COVERAGE = 80;
/** How many files a finding names before summarising the rest. */
const NAMED_FILES = 5;
const PERCENT = 100;

export interface CoverageVerdict {
  violations: string[];
  suggestions: string[];
  notRead: string[];
  /** The report the files were judged by; null when judged by presence. */
  report: string | null;
}

interface Scope {
  projectRoot: string;
  config: RuleOfCodeConfig;
  lawId?: string | undefined;
}

export class CoverageByReport {
  static judge(scope: Scope): CoverageVerdict {
    const testing = scope.config.thresholds?.testing;
    const lookup = CoverageReportReader.find(
      scope.projectRoot,
      testing?.coverageReportPath
    );
    if (lookup.kind === 'none') return this.byPresence(scope, []);
    if (lookup.kind === 'unread') return this.byPresence(scope, [lookup.note]);

    const report = lookup.report;
    const sources = TestFilesExistenceChecker.findTestableSources(
      scope.projectRoot,
      scope.config,
      scope.lawId
    );
    const unusable = this.unusable(scope.projectRoot, report, sources);
    if (unusable) return this.byPresence(scope, [unusable]);

    const floor = percentFloor(
      testing?.minFileLineCoveragePercent,
      LINE_COVERAGE_KEY,
      DEFAULT_LINE_COVERAGE
    );
    if (!floor.ok) {
      const verdict = this.byPresence(scope, []);
      verdict.violations.unshift(
        `${LINE_COVERAGE_KEY} is ${JSON.stringify(testing?.minFileLineCoveragePercent)} — not a percentage from 0 to 100, so the files were judged by the presence of a test, not by ${report.path} on a guessed floor`
      );
      return verdict;
    }
    return this.byReport(scope, report, sources, floor.value);
  }

  /** Why the report cannot be used, or null when it can. */
  private static unusable(
    projectRoot: string,
    report: CoverageReport,
    sources: string[]
  ): string | null {
    const newer = sources.find(
      file => this.modifiedMs(file) > report.modifiedMs
    );
    if (newer) {
      return `coverage report ${report.path} is older than the code (${PathOperations.getRelative(projectRoot, newer)} changed after it was written), not read — the files were judged by the presence of a test`;
    }
    if (sources.length > 0 && !sources.some(file => this.entry(report, file))) {
      return `coverage report ${report.path} names none of the ${sources.length} source files (written on another machine or for another project?), not read — the files were judged by the presence of a test`;
    }
    return null;
  }

  private static byReport(
    scope: Scope,
    report: CoverageReport,
    sources: string[],
    floor: number
  ): CoverageVerdict {
    const violations: string[] = [];
    const suggestions: string[] = [];
    const below = sources
      .map(file => ({ file, pct: this.percent(this.entry(report, file)) }))
      .filter(
        (item): item is { file: string; pct: number } =>
          item.pct !== null && item.pct < floor
      )
      .sort((a, b) => a.pct - b.pct);
    if (below.length > 0) {
      const named = below.map(
        ({ file, pct }) =>
          `${PathOperations.getRelative(scope.projectRoot, file)} ${Math.floor(pct * 10) / 10}%`
      );
      violations.push(
        `${below.length} source file(s) below ${floor}% line coverage in ${report.path}: ${named.slice(0, NAMED_FILES).join(', ')}${below.length > NAMED_FILES ? ` (+${below.length - NAMED_FILES} more)` : ''}`
      );
      suggestions.push(
        `Raise line coverage to ${floor}% (${LINE_COVERAGE_KEY}) in: ${named.join(', ')}`
      );
    }

    const absent = sources.filter(file => !this.entry(report, file));
    if (absent.length > 0) {
      const { uncovered, unread } =
        TestFilesExistenceChecker.uncoveredByPresence(
          scope.projectRoot,
          scope.config,
          absent,
          scope.lawId
        );
      if (uncovered.length > 0) {
        violations.push(
          `${uncovered.length} source files are not in ${report.path} and lack corresponding test files (a test that imports a file counts)${unread}`
        );
        suggestions.push(
          ...TestFilesExistenceChecker.presenceSuggestions(
            scope.projectRoot,
            uncovered
          ),
          `Or let the test run report them (Jest: collectCoverageFrom) — ${report.path} judges only the files it names`
        );
      }
    }
    return { violations, suggestions, notRead: [], report: report.path };
  }

  private static byPresence(scope: Scope, notRead: string[]): CoverageVerdict {
    const { violations, suggestions } =
      TestFilesExistenceChecker.checkTestFilesExistence(
        scope.projectRoot,
        scope.config,
        scope.lawId
      );
    return { violations, suggestions, notRead, report: null };
  }

  private static entry(
    report: CoverageReport,
    file: string
  ): LineCoverage | undefined {
    return report.lines.get(canonicalPath(file));
  }

  /** Line coverage in percent; null for a file with no executable line. */
  private static percent(coverage: LineCoverage | undefined): number | null {
    if (!coverage || coverage.total === 0) return null;
    return (coverage.covered / coverage.total) * PERCENT;
  }

  private static modifiedMs(file: string): number {
    try {
      return fs.statSync(file).mtimeMs;
    } catch {
      return 0;
    }
  }
}
