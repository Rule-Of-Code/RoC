import type { RuleOfCodeConfig } from '../../config/types';
import { DirectoryScanner } from '../directory-scanner';
import { FileFilterUtils } from '../file-filter-utils';
import { PathOperations } from '../path-operations';
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
    const testableSources = sourceFiles.filter(file => this.shouldHaveTest(file));

    let missingTestCount = 0;
    const missingTestExamples: string[] = [];

    for (const sourceFile of testableSources) {
      // A source `foo.component.ts` (or Angular-20 `home.ts`) is covered by
      // EITHER `foo.component.spec.ts` or `.test.ts`. The old check demanded
      // `.test.` exactly, so every Angular file — which uses `.spec.` — was
      // reported as lacking a test. Match by the source name with the
      // spec/test marker stripped.
      const sourceName = PathOperations.getBasename(sourceFile);
      const hasTest = testFiles.some(
        testFile =>
          PathOperations.getBasename(testFile).replace(/\.(spec|test)$/, '') ===
          sourceName
      );

      if (!hasTest) {
        missingTestCount++;
        if (missingTestExamples.length < 5) {
          // Limit examples for readability
          missingTestExamples.push(
            PathOperations.getRelative(projectRoot, sourceFile)
          );
        }
      }
    }

    if (missingTestCount > 0) {
      violations.push(
        `${missingTestCount} source files lack corresponding test files`
      );
      suggestions.push(
        `Add test files for: ${missingTestExamples.join(', ')}${missingTestCount > 5 ? '...' : ''}`
      );
    }

    // Check test coverage ratio
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
    }

    return { violations, suggestions };
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
        !this.shouldIgnoreFile(projectRoot, fullPath, config, false, lawId)
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
        !this.shouldIgnoreFile(projectRoot, fullPath, config, true, lawId)
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
   */
  private static findFilesRecursively(
    directory: string,
    files: string[],
    config: RuleOfCodeConfig,
    fileValidator: (fullPath: string, fileName: string) => boolean
  ): void {
    try {
      const entries = DirectoryScanner.safeReadDirectory(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          this.findFilesRecursively(fullPath, files, config, fileValidator);
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
