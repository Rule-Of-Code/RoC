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
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let hasProperResourceIsolation = true;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        // If test uses external resources, check for proper cleanup
        if (
          UnitTestIsolationConstants.usesExternalResources(content) &&
          !UnitTestIsolationConstants.hasResourceCleanup(content)
        ) {
          hasProperResourceIsolation = false;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasProperResourceIsolation };
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
