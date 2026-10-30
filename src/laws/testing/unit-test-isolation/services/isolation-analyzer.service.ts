import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { TestFileDiscovery } from '../../test-file-discovery';
import { UnitTestIsolationConstants } from '../constants/isolation';

/**
 * Unit Test Isolation - Analyzer Service
 * Responsible for analyzing test isolation in the project
 */
export class UnitTestIsolationAnalyzerService {
  /**
   * Analyze shared mutable state
   */
  static analyzeSharedState(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasSharedMutableState: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let hasSharedMutableState = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (UnitTestIsolationConstants.hasSharedMutableState(content)) {
          hasSharedMutableState = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasSharedMutableState };
  }

  /**
   * Analyze setup/teardown isolation
   */
  static analyzeSetupTeardown(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperIsolation: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let testsWithProperIsolation = 0;
    let totalTestFiles = 0;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        totalTestFiles++;

        if (UnitTestIsolationConstants.hasProperSetupTeardown(content)) {
          testsWithProperIsolation++;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasProperIsolation:
        totalTestFiles === 0 ||
        testsWithProperIsolation / totalTestFiles >= 0.7,
    };
  }

  /**
   * Analyze test order dependencies
   */
  static analyzeTestOrderDependencies(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasOrderDependencies: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let hasOrderDependencies = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (UnitTestIsolationConstants.hasTestOrderDependencies(content)) {
          hasOrderDependencies = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasOrderDependencies };
  }

  /**
   * Analyze resource isolation
   */
  static analyzeResourceIsolation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperResourceIsolation: boolean;
    /** `path (resource, …)` for every file that reaches one without cleanup. */
    unisolated: string[];
  } {
    // Every offending file, named. The verdict used to stop at the first one
    // and say only that "external resources" were the problem, so a reader
    // could not tell which file, or which line of it, had tripped the check.
    const unisolated: string[] = [];

    for (const testFile of this.findTestFiles(projectRoot, config)) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        const used = UnitTestIsolationConstants.resourcesUsed(content);
        if (
          used.length > 0 &&
          !UnitTestIsolationConstants.hasResourceCleanup(content)
        ) {
          unisolated.push(
            `${PathOperations.getRelative(projectRoot, testFile)} (${used.join(', ')})`
          );
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperResourceIsolation: unisolated.length === 0, unisolated };
  }

  /**
   * Analyze global state pollution
   */
  static analyzeGlobalStatePollution(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasGlobalStatePollution: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let hasGlobalStatePollution = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (UnitTestIsolationConstants.modifiesGlobalState(content)) {
          hasGlobalStatePollution = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasGlobalStatePollution };
  }

  /**
   * Analyze test framework isolation
   */
  static analyzeTestFrameworkIsolation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    usesIsolationPatterns: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let usesIsolationPatterns = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        if (
          UnitTestIsolationConstants.usesFrameworkIsolationPatterns(content)
        ) {
          usesIsolationPatterns = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      usesIsolationPatterns: usesIsolationPatterns || testFiles.length === 0,
    };
  }

  /**
   * Find all test files in project
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return TestFileDiscovery.findTestFiles(projectRoot, config, [
      PathOperations.join(projectRoot, 'src'),
      PathOperations.join(projectRoot, 'apps'),
      PathOperations.join(projectRoot, 'libs'),
    ]);
  }

  /**
   * Find test files recursively
   */
  private static findTestFilesRecursively(
    dir: string,
    testFiles: string[],
    config: RuleOfCodeConfig
  ): void {
    TestFileDiscovery.findTestFilesRecursively(dir, testFiles, config);
  }

  /**
   * Check if filename is test file
   */
  private static isTestFile(filename: string): boolean {
    return TestFileDiscovery.isTestFile(filename);
  }
}
