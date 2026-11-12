import type { RuleOfCodeConfig } from '../../../../types/law.types';
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
  static analyzeTestDataPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperSetup: boolean;
    hasHardcodedData: boolean;
    hasSharedState: boolean;
    /** The files behind each finding — a finding must say what to fix. */
    missingSetupFiles: string[];
    hardcodedDataFiles: string[];
    sharedStateFiles: string[];
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    const missingSetupFiles: string[] = [];
    const hardcodedDataFiles: string[] = [];
    const sharedStateFiles: string[] = [];

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        const relative = PathOperations.getRelative(projectRoot, testFile);

        // A setup/teardown hook exists to reset what tests share. A file
        // with no module-scope mutable state has nothing to reset — the
        // twin's rule (Test Isolation Enforcement). This used to pass the
        // whole project when ANY file had a hook and fail it, naming no
        // file, when none did — a pure-function spec included (#310).
        if (
          UnitTestDataManagementConstants.hasSharedMutableState(content) &&
          !UnitTestDataManagementConstants.hasProperSetupTeardown(content)
        ) {
          missingSetupFiles.push(relative);
        }

        if (UnitTestDataManagementConstants.hasHardcodedTestData(content)) {
          hardcodedDataFiles.push(relative);
        }

        if (UnitTestDataManagementConstants.hasSharedMutableState(content)) {
          sharedStateFiles.push(relative);
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasProperSetup: missingSetupFiles.length === 0,
      hasHardcodedData: hardcodedDataFiles.length > 0,
      hasSharedState: sharedStateFiles.length > 0,
      missingSetupFiles,
      hardcodedDataFiles,
      sharedStateFiles,
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
  static analyzeCleanupPatterns(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperCleanup: boolean;
    /** `path (resource, …)` for every file that reaches one without cleanup. */
    uncleaned: string[];
  } {
    // Every offending file, named — see the same note in the isolation law.
    const uncleaned: string[] = [];

    for (const testFile of this.findTestFiles(projectRoot, config)) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        const used = UnitTestDataManagementConstants.resourcesUsed(content);
        if (
          used.length > 0 &&
          !UnitTestDataManagementConstants.hasResourceCleanup(content)
        ) {
          uncleaned.push(
            `${PathOperations.getRelative(projectRoot, testFile)} (${used.join(', ')})`
          );
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperCleanup: uncleaned.length === 0, uncleaned };
  }

  /**
   * Analyze mocking usage
   */
  static analyzeMockingUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperMocking: boolean;
    /** False when no test imports an external client: nothing to judge. */
    judged: boolean;
    /** `path (module, …)` for every test that imports an external client. */
    externalImports: string[];
  } {
    // Judged only where a test imports an external client. Before, any
    // `import … from` counted as an external dependency, so a spec importing
    // only the code under test failed "not properly mocked" (#310). The
    // suite-level reading stays: a project whose tests use doubles somewhere
    // has a mocking strategy, and some tests may use a real in-memory
    // implementation on purpose (#29).
    const externalImports: string[] = [];
    let anyDouble = false;

    for (const testFile of this.findTestFiles(projectRoot, config)) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (UnitTestDataManagementConstants.hasTestDouble(content)) {
          anyDouble = true;
        }
        const clients =
          UnitTestDataManagementConstants.externalClientsImported(content);
        if (clients.length > 0) {
          externalImports.push(
            `${PathOperations.getRelative(projectRoot, testFile)} (${clients.join(', ')})`
          );
        }
      } catch (_error) {
        // Named by the law as unreadable (TestFileDiscovery.unreadable).
      }
    }

    const judged = externalImports.length > 0;
    return {
      hasProperMocking: !judged || anyDouble,
      judged,
      externalImports,
    };
  }

  /**
   * Analyze data factory usage
   */
  static analyzeDataFactoryUsage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    filesUsingFactories: number;
    totalTestFiles: number;
    factoryCoverage: number;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
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
   * Find all test files in project, with the PROJECT's config so its
   * ignores apply, through the same discovery as test-isolation-enforcement,
   * which carries the same resource check (#192).
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return TestFileDiscovery.findTestFiles(projectRoot, config);
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
