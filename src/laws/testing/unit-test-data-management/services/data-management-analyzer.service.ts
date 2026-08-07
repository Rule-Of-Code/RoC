import { ConfigFileUtils } from '../../../../utils/config-file-utils';
import { DirectorySearcher } from '../../../../utils/directory-searcher';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { TestFileDiscovery } from '../../test-file-discovery';
import { UnitTestDataManagementConstants } from '../constants/data-management';

/**
 * Unit Test Data Management Analyzer Service
 *
 * Orchestrates comprehensive test data management analysis across the project.
 * Checks for proper setup/teardown, data factories, hardcoded data,
 * shared state, and resource cleanup patterns.
 */
export class UnitTestDataManagementAnalyzerService {
  /**
   * Analyze test data patterns in test files
   */
  static analyzeTestDataPatterns(projectRoot: string): {
    hasProperSetup: boolean;
    hasHardcodedData: boolean;
    hasSharedState: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot);
    let hasProperSetup = false;
    let hasHardcodedData = false;
    let hasSharedState = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (UnitTestDataManagementConstants.hasProperSetupTeardown(content)) {
          hasProperSetup = true;
        }

        if (UnitTestDataManagementConstants.hasHardcodedTestData(content)) {
          hasHardcodedData = true;
        }

        if (UnitTestDataManagementConstants.hasSharedMutableState(content)) {
          hasSharedState = true;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasProperSetup: hasProperSetup || testFiles.length === 0,
      hasHardcodedData,
      hasSharedState,
    };
  }

  /**
   * Analyze test data structure organization
   */
  static analyzeTestDataStructure(projectRoot: string): {
    hasOrganizedData: boolean;
    hasFactories: boolean;
  } {
    // Check for test fixtures/mock data directories
    const fixturesDir = PathOperations.join(projectRoot, 'src/test/fixtures');
    const mockDataDir = PathOperations.join(projectRoot, 'src/test/mock-data');
    const testUtilsDir = PathOperations.join(projectRoot, 'src/test/utils');

    const hasOrganizedData =
      FileUtils.exists(fixturesDir) ||
      FileUtils.exists(mockDataDir) ||
      FileUtils.exists(testUtilsDir);

    // Check for data factories
    const hasFactories = this.hasTestDataFactories(projectRoot);

    return {
      hasOrganizedData,
      hasFactories,
    };
  }

  /**
   * Analyze resource cleanup patterns
   */
  static analyzeCleanupPatterns(projectRoot: string): {
    hasProperCleanup: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot);
    let hasProperCleanup = true;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        // If test uses external resources, it should have cleanup
        if (
          UnitTestDataManagementConstants.usesExternalResources(content) &&
          !UnitTestDataManagementConstants.hasResourceCleanup(content)
        ) {
          hasProperCleanup = false;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperCleanup };
  }

  /**
   * Analyze mocking usage
   */
  static analyzeMockingUsage(projectRoot: string): {
    hasProperMocking: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot);
    let hasMockingFramework = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (UnitTestDataManagementConstants.hasProperMocking(content)) {
          hasMockingFramework = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperMocking: hasMockingFramework || testFiles.length === 0 };
  }

  /**
   * Analyze data factory usage
   */
  static analyzeDataFactoryUsage(projectRoot: string): {
    filesUsingFactories: number;
    totalTestFiles: number;
    factoryCoverage: number;
  } {
    const testFiles = this.findTestFiles(projectRoot);
    let filesUsingFactories = 0;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (UnitTestDataManagementConstants.usesTestDataFactories(content)) {
          filesUsingFactories++;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      filesUsingFactories,
      totalTestFiles: testFiles.length,
      factoryCoverage:
        testFiles.length > 0
          ? (filesUsingFactories / testFiles.length) * 100
          : 100,
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Find all test files in project
   */
  private static findTestFiles(projectRoot: string): string[] {
    return TestFileDiscovery.findTestFiles(
      projectRoot,
      ConfigFileUtils.getMinimalDefaultConfig()
    );
  }

  /**
   * Recursively find test files in directory
   */
  private static findTestFilesRecursively(
    dir: string,
    testFiles: string[]
  ): void {
    TestFileDiscovery.findTestFilesRecursively(
      dir,
      testFiles,
      ConfigFileUtils.getMinimalDefaultConfig()
    );
  }

  /**
   * Check if project has test data factories
   */
  private static hasTestDataFactories(projectRoot: string): boolean {
    const factoryPatterns = [
      'factory.ts',
      'builder.ts',
      'fixture.ts',
      'mock.ts',
      'test-data.ts',
    ];

    for (const pattern of factoryPatterns) {
      const files = this.findFilesByPattern(projectRoot, pattern);
      if (files.length > 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find files by pattern using DirectorySearcher utility
   */
  private static findFilesByPattern(
    projectRoot: string,
    pattern: string
  ): string[] {
    const matches: string[] = [];

    DirectorySearcher.searchDirectoriesRecursively(
      DirectorySearcher.getStandardSourceDirs(projectRoot),
      filePath => {
        const fileName = PathOperations.getBasename(filePath);
        if (fileName.includes(pattern)) {
          matches.push(filePath);
        }
      }
    );

    return matches;
  }
}
