import { CheckerUtils } from '../../../../utils/checker-utils';
import { ConfigFileUtils } from '../../../../utils/config-file-utils';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { UnitTestCoverageFileDiscoveryConstants } from '../constants/file-discovery';

/**
 * Unit Test Coverage - File Discovery Service
 * Responsible for discovering source and test files in the project
 */
export class UnitTestCoverageFileDiscoveryService {
  /**
   * Discover all source and test files
   */
  static discoverProjectFiles(projectRoot: string): {
    sourceFiles: string[];
    testFiles: string[];
  } {
    const sourceFiles = this.findSourceFiles(projectRoot);
    const testFiles = sourceFiles.filter(f =>
      UnitTestCoverageFileDiscoveryConstants.isTestFile(f)
    );
    const actualSourceFiles = sourceFiles.filter(
      f => !UnitTestCoverageFileDiscoveryConstants.isTestFile(f)
    );

    return {
      sourceFiles: actualSourceFiles,
      testFiles,
    };
  }

  /**
   * Find all source files recursively
   */
  private static findSourceFiles(projectRoot: string): string[] {
    const sourceFiles: string[] = [];
    const searchDirs =
      UnitTestCoverageFileDiscoveryConstants.getScanDirectories();

    for (const dir of searchDirs) {
      const fullPath = PathOperations.join(projectRoot, dir);
      if (FileUtils.exists(fullPath)) {
        this.scanDirectoryRecursively(fullPath, sourceFiles);
      }
    }

    return sourceFiles;
  }

  /**
   * Recursively scan directory for code files
   */
  private static scanDirectoryRecursively(dir: string, files: string[]): void {
    try {
      const allFiles = CheckerUtils.findFilesByExtension(
        dir,
        CheckerUtils.getCommonExtensions().ALL_CODE,
        ConfigFileUtils.getMinimalDefaultConfig()
      );

      for (const filePath of allFiles) {
        if (!UnitTestCoverageFileDiscoveryConstants.shouldExclude(filePath)) {
          files.push(filePath);
        }
      }
    } catch (_error) {
      // Skip directories that can't be read
    }
  }

  /**
   * Find test file variants for a source file
   */
  static findTestForSourceFile(
    sourceFile: string,
    testFiles: string[]
  ): string | undefined {
    const variants =
      UnitTestCoverageFileDiscoveryConstants.findTestVariants(sourceFile);

    for (const variant of variants) {
      const found = testFiles.find(tf => tf.includes(variant));
      if (found) return found;
    }

    return undefined;
  }

  /**
   * Analyze file lists for coverage
   */
  static analyzeFileCoverage(
    sourceFiles: string[],
    testFiles: string[]
  ): {
    coveredFiles: string[];
    uncoveredFiles: string[];
    coverage: number;
  } {
    const uncoveredFiles = sourceFiles.filter(
      sf => !this.findTestForSourceFile(sf, testFiles)
    );

    const coverage =
      sourceFiles.length > 0
        ? Math.round(
            ((sourceFiles.length - uncoveredFiles.length) /
              sourceFiles.length) *
              100
          )
        : 100;

    return {
      coveredFiles: sourceFiles.filter(sf =>
        this.findTestForSourceFile(sf, testFiles)
      ),
      uncoveredFiles,
      coverage,
    };
  }
}
