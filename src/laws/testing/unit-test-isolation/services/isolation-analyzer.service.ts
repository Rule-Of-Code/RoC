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
  /**
   * The test files (relative paths) whose content satisfies `predicate`, and
   * how many test files were read. A finding that does not name its files
   * cannot be acted on; each analysis below returns them, not only a flag.
   */
  private static filesWhere(
    projectRoot: string,
    config: RuleOfCodeConfig,
    predicate: (content: string) => boolean
  ): { files: string[]; read: number } {
    const files: string[] = [];
    let read = 0;
    for (const testFile of this.findTestFiles(projectRoot, config)) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });
        read++;
        if (predicate(content)) files.push(PathOperations.getRelative(projectRoot, testFile));
      } catch (_error) {
        // Skip files that can't be read
      }
    }
    return { files, read };
  }

  static analyzeSharedState(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasSharedMutableState: boolean;
    files: string[];
  } {
    const { files } = this.filesWhere(projectRoot, config, content =>
      UnitTestIsolationConstants.hasSharedMutableState(content)
    );
    return { hasSharedMutableState: files.length > 0, files };
  }

  /**
   * Analyze setup/teardown isolation. A hook exists to reset what tests share;
   * a file with no module-scope mutable state has nothing to reset, and
   * demanding a `beforeEach` there asks for ceremony (Angular's TestBed is
   * torn down per test by the framework). So a file needs isolation only when
   * it shares mutable state and has no hook. Fails below 70% of test files;
   * `files` are the ones to fix.
   */
  static analyzeSetupTeardown(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasProperIsolation: boolean;
    files: string[];
  } {
    const { files, read } = this.filesWhere(
      projectRoot,
      config,
      content =>
        UnitTestIsolationConstants.hasSharedMutableState(content) &&
        !UnitTestIsolationConstants.hasProperSetupTeardown(content)
    );
    return {
      hasProperIsolation: read === 0 || (read - files.length) / read >= 0.7,
      files,
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
    files: string[];
  } {
    const { files } = this.filesWhere(projectRoot, config, content =>
      UnitTestIsolationConstants.hasTestOrderDependencies(content)
    );
    return { hasOrderDependencies: files.length > 0, files };
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
    files: string[];
  } {
    const { files } = this.filesWhere(projectRoot, config, content =>
      UnitTestIsolationConstants.modifiesGlobalState(content)
    );
    return { hasGlobalStatePollution: files.length > 0, files };
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
   * Find all test files in project — the same discovery, roots and config as
   * test-data-management, which carries the same resource check (#192).
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return TestFileDiscovery.findTestFiles(projectRoot, config);
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
