import type { RuleOfCodeConfig } from '../../config/types';
import { DirectoryScanner } from '../directory-scanner';
import { FileFilterUtils } from '../file-filter-utils';
import { PARTLY_READ_TEXT } from '../judged-nothing';
import { PathOperations } from '../path-operations';
import { loadTypeScript, parserUnavailable } from '../react/tsx-source';
import { canonicalPath, TestImportReader } from './test-import-reader';
/** How many discovered test files to name before summarising the rest. */
const TEST_FILE_EXAMPLES = 5;
/** How many uncovered source files to name before summarising the rest. */
const MISSING_TEST_EXAMPLES = 5;

/**
 * Test Files Existence Checker
 * Specialized utility for analyzing test files and their relationship to source files
 */
export class TestFilesExistenceChecker {
  /**
   * Check test files existence for source files
   */
  static checkTestFilesExistence(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find source files that should have tests
    const sourceFiles = this.findSourceFiles(projectRoot, config, lawId);
    const testFiles = this.findTestFiles(projectRoot, config, lawId);

    // The files this law can actually ask a test of. A barrel, a build config or
    // a bootstrap has no behaviour a spec could assert — counting them makes the
    // ratio below a statement about project layout rather than about testing.
    const testableSources = sourceFiles.filter(file =>
      this.shouldHaveTest(file)
    );

    // A file is covered when a test is named after it OR imports it directly
    // (see TestImportReader). Without the TypeScript package the imports are
    // not read: the name rule alone decides, and the finding says so.
    const ts = loadTypeScript(projectRoot);
    const imported = ts
      ? new TestImportReader(ts, projectRoot).importedBy(testFiles)
      : new Set<string>();

    const uncovered = testableSources.filter(
      sourceFile =>
        !this.hasTestByName(sourceFile, testFiles) &&
        !imported.has(canonicalPath(sourceFile))
    );

    if (uncovered.length > 0) {
      // With no test file there are no imports to read: the note would be noise.
      const unread =
        ts || testFiles.length === 0
          ? ''
          : ` — ${parserUnavailable(projectRoot, `the imports of the ${testFiles.length} test file(s)`)}, so a file a test imports but is not named after was counted as lacking a test; ${PARTLY_READ_TEXT}`;
      violations.push(
        `${uncovered.length} source files lack corresponding test files (a test that imports a file counts)${unread}`
      );
      suggestions.push(
        `Add test files for: ${uncovered
          .slice(0, MISSING_TEST_EXAMPLES)
          .map(file => PathOperations.getRelative(projectRoot, file))
          .join(', ')}${uncovered.length > MISSING_TEST_EXAMPLES ? '...' : ''}`
      );
      suggestions.push(
        'A test covers a file when it is named after it (foo.ts ↔ foo.spec.ts / foo.test.ts) or imports it directly — a relative path or a tsconfig/jsconfig `paths`/`baseUrl` alias; an alias declared only in a Jest `moduleNameMapper` or a bundler config is not followed'
      );
    }

    // The ratio stays test files per testable source file. Counting the files
    // covered above instead would raise a NEW finding wherever tests import
    // through an alias this law does not follow, or are not named after a
    // source: a project with as many test files as before would fail a ratio
    // it passed. The rule above only ever removes findings.
    const coverageRatio =
      testableSources.length === 0
        ? 100
        : (testFiles.length / testableSources.length) * 100;
    const minRatio = config.thresholds?.testing?.minTestFileRatioPercent ?? 50;

    if (coverageRatio < minRatio) {
      violations.push(
        `Low test coverage ratio: ${coverageRatio.toFixed(1)}% (${testFiles.length} tests for ${testableSources.length} source files, minimum ${minRatio}%)`
      );
      suggestions.push(
        `Aim for at least ${minRatio}% test file coverage (1 test file per ${Math.round(100 / minRatio)} source files)`
      );
      suggestions.push(this.describeCountedTests(projectRoot, testFiles));
    }

    return { violations, suggestions };
  }

  /**
   * A test named after the source: `foo.component.ts` (or Angular-20
   * `home.ts`) is covered by EITHER `foo.component.spec.ts` or `.test.ts`.
   */
  private static hasTestByName(
    sourceFile: string,
    testFiles: string[]
  ): boolean {
    const sourceName = PathOperations.getBasename(sourceFile);
    return testFiles.some(
      testFile =>
        PathOperations.getBasename(testFile).replace(/\.(spec|test)$/, '') ===
        sourceName
    );
  }

  /**
   * Name what WAS counted.
   *
   * When this number is wrong, the only way to see it was to re-implement the
   * scan by hand against the compiled output — a reporter did exactly that to
   * show 27 test files where the audit counted one. A ratio is only a statement
   * about testing if its numerator can be checked.
   */
  private static describeCountedTests(
    projectRoot: string,
    testFiles: string[]
  ): string {
    if (testFiles.length === 0) {
      return 'No test files were found at all — if that is wrong, the scan is not seeing them, and the ratio above is not a statement about your testing';
    }

    const shown = testFiles
      .slice(0, TEST_FILE_EXAMPLES)
      .map(file => PathOperations.getRelative(projectRoot, file))
      .join(', ');
    const extra = testFiles.length - TEST_FILE_EXAMPLES;
    const more = extra > 0 ? ` (+${extra} more)` : '';

    return `Counted these test files: ${shown}${more}. If a test you have is missing from this list, the ratio is wrong rather than your coverage.`;
  }

  /**
   * Find source files that should be tested
   */
  private static findSourceFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    const sourceFiles: string[] = [];
    this.findFilesRecursively(
      projectRoot,
      sourceFiles,
      config,
      (fullPath, fileName) =>
        this.isSourceFile(fileName) &&
        !this.shouldIgnoreFile(projectRoot, fullPath, config, false, lawId),
      // Test directories are correctly pruned for the SOURCE scan: a spec is
      // not a source file this law can ask a test of.
      false,
      lawId
    );
    return sourceFiles;
  }

  /**
   * Find test files in project
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): string[] {
    const testFiles: string[] = [];
    this.findFilesRecursively(
      projectRoot,
      testFiles,
      config,
      (fullPath, fileName) =>
        this.isTestFile(fileName) &&
        !this.shouldIgnoreFile(projectRoot, fullPath, config, true, lawId),
      // The scan that COUNTS tests must be allowed into the directories tests
      // live in. The walk pruned them before the validator was ever consulted.
      true,
      lawId
    );
    return testFiles;
  }

  /**
   * Generic recursive file finder helper
   * Eliminates duplicate recursion pattern between source and test discovery.
   *
   * The validator receives the FULL path: it used to be handed a bare file name
   * which the caller joined to the top-level directory, so every file below the
   * first level was ignore-checked against a path it did not have.
   *
   * `includeTests` is threaded through to the DIRECTORY filter, and that is the
   * whole point of it being a parameter. The walk asked with the default —
   * false — while the test scan's file validator asked with true, so the two
   * scans resolved different ignore sets. `**​/*-e2e/**`, `**​/e2e/**`,
   * `**​/test/**`, `**​/tests/**` and `**​/cypress/**` are added when tests are
   * excluded, so entire directories of specs were pruned before the validator
   * that was meant to accept them ever ran. The ratio was then computed from a
   * numerator that had never seen most of the tests, and the advice —
   * "add tests" — could not move it.
   */
  private static findFilesRecursively(
    directory: string,
    files: string[],
    config: RuleOfCodeConfig,
    fileValidator: (fullPath: string, fileName: string) => boolean,
    includeTests: boolean,
    lawId?: string
  ): void {
    try {
      const entries = DirectoryScanner.safeReadDirectory(
        directory,
        config,
        lawId,
        includeTests
      );

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          this.findFilesRecursively(
            fullPath,
            files,
            config,
            fileValidator,
            includeTests,
            lawId
          );
        } else if (entry.isFile() && fileValidator(fullPath, entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Check if file is a source file
   */
  private static isSourceFile(fileName: string): boolean {
    return (
      (fileName.endsWith('.ts') ||
        fileName.endsWith('.js') ||
        fileName.endsWith('.tsx') ||
        fileName.endsWith('.jsx')) &&
      !fileName.includes('.test.') &&
      !fileName.includes('.spec.') &&
      !fileName.includes('.d.ts')
    );
  }

  /**
   * Check if file is a test file
   */
  private static isTestFile(fileName: string): boolean {
    return (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.includes('__tests__')
    );
  }

  /**
   * Check if source file should have a test
   */
  private static shouldHaveTest(fileName: string): boolean {
    // Skip certain types of files that don't typically need tests
    const skipPatterns = [
      /\.d\.ts$/,
      /\.config\./,
      // A Jest preset IS test configuration. Reporting `jest.preset.js` as a
      // source file lacking a test was this law asking the test runner to test
      // itself.
      /\.preset\./,
      /\.types\./,
      /\.constants\./,
      /\.interfaces\./,
      /index\.(ts|js)$/,
      /main\.(ts|js)$/,
      /polyfills\.(ts|js)$/,
    ];

    return !skipPatterns.some(pattern => pattern.test(fileName));
  }

  /**
   * Check if directory should be skipped
   */
  private static shouldSkipDirectory(dirname: string): boolean {
    const skipDirs = [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '.nx',
      '.angular',
      'tmp',
      'temp',
    ];
    return skipDirs.includes(dirname);
  }

  /**
   * Check if file should be ignored based on config.
   *
   * Delegated to the shared filter, which is what every other law consults — so
   * `ignores.byRule["test-coverage-constitutional-standard"]` (and `includes`)
   * mean here exactly what they mean elsewhere. The check that lived here read
   * only `ignores.global`, and read it by stripping the glob wildcards and
   * testing `path.includes(...)`: `ignores.byRule` had no code path at all, and a
   * pattern like `**​/index.ts` degraded to a substring match.
   *
   * @param includeTests - true when scanning FOR test files, so the shared
   * filter does not ignore them as it does for source scans.
   */
  private static shouldIgnoreFile(
    projectRoot: string,
    filePath: string,
    config: RuleOfCodeConfig,
    includeTests: boolean,
    lawId?: string
  ): boolean {
    // The shared filter matches root-relative patterns; it cannot judge an
    // absolute path and would silently pass everything.
    const relativePath = PathOperations.getRelative(projectRoot, filePath);

    return FileFilterUtils.shouldIgnoreFile(
      relativePath,
      config,
      lawId,
      includeTests
    );
  }
}
