import type { RuleOfCodeConfig } from '../../config/types';
import { DirectoryScanner } from '../directory-scanner';
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
    config: RuleOfCodeConfig
  ): {
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Find source files that should have tests
    const sourceFiles = this.findSourceFiles(projectRoot, config);
    const testFiles = this.findTestFiles(projectRoot, config);

    let missingTestCount = 0;
    const missingTestExamples: string[] = [];

    for (const sourceFile of sourceFiles) {
      if (this.shouldHaveTest(sourceFile)) {
        // A source `foo.component.ts` (or Angular-20 `home.ts`) is covered by
        // EITHER `foo.component.spec.ts` or `.test.ts`. The old check demanded
        // `.test.` exactly, so every Angular file — which uses `.spec.` — was
        // reported as lacking a test. Match by the source name with the
        // spec/test marker stripped.
        const sourceName = PathOperations.getBasename(sourceFile);
        const hasTest = testFiles.some(
          testFile =>
            PathOperations.getBasename(testFile).replace(
              /\.(spec|test)$/,
              ''
            ) === sourceName
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
      testFiles.length > 0 ? (testFiles.length / sourceFiles.length) * 100 : 0;
    const minRatio = config.thresholds?.testing?.minTestFileRatioPercent ?? 50;

    if (coverageRatio < minRatio) {
      violations.push(
        `Low test coverage ratio: ${coverageRatio.toFixed(1)}% (${testFiles.length} tests for ${sourceFiles.length} source files, minimum ${minRatio}%)`
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
    config: RuleOfCodeConfig
  ): string[] {
    const sourceFiles: string[] = [];
    this.findSourceFilesRecursively(projectRoot, sourceFiles, config);
    return sourceFiles;
  }

  /**
   * Find test files in project
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const testFiles: string[] = [];
    this.findTestFilesRecursively(projectRoot, testFiles, config);
    return testFiles;
  }

  /**
   * Generic recursive file finder helper
   * Eliminates duplicate recursion pattern between findSourceFilesRecursively and findTestFilesRecursively
   */
  private static findFilesRecursively(
    directory: string,
    files: string[],
    config: RuleOfCodeConfig,
    fileValidator: (fileName: string) => boolean
  ): void {
    try {
      const entries = DirectoryScanner.safeReadDirectory(directory, config);

      for (const entry of entries) {
        const fullPath = PathOperations.join(directory, entry.name);

        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          this.findFilesRecursively(fullPath, files, config, fileValidator);
        } else if (entry.isFile() && fileValidator(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Recursively find source files
   */
  private static findSourceFilesRecursively(
    directory: string,
    files: string[],
    config: RuleOfCodeConfig
  ): void {
    this.findFilesRecursively(
      directory,
      files,
      config,
      fileName =>
        this.isSourceFile(fileName) &&
        !this.shouldIgnoreFile(PathOperations.join(directory, fileName), config)
    );
  }

  /**
   * Recursively find test files
   */
  private static findTestFilesRecursively(
    directory: string,
    files: string[],
    config: RuleOfCodeConfig
  ): void {
    this.findFilesRecursively(directory, files, config, fileName =>
      this.isTestFile(fileName)
    );
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
   * Check if file should be ignored based on config
   */
  private static shouldIgnoreFile(
    filePath: string,
    config: RuleOfCodeConfig
  ): boolean {
    if (config.ignores.global.length === 0) {
      return false;
    }

    return config.ignores.global.some(pattern => {
      const normalizedPattern = pattern.replace('**/', '').replace('/**', '');
      return filePath.includes(normalizedPattern);
    });
  }
}
