import type { RuleOfCodeConfig } from '../../../../config/types';
import { FileUtils } from '../../../../utils/file-utils';
import { PathOperations } from '../../../../utils/path-operations';
import { TestFileDiscovery } from '../../test-file-discovery';
import { UnitTestDocumentationConstants } from '../constants/documentation';

/**
 * Unit Test Documentation Analyzer Service
 *
 * Orchestrates comprehensive test documentation analysis across the project.
 * Coordinates documentation file checks, test file documentation validation,
 * and test description quality assessment.
 */
export class UnitTestDocumentationAnalyzerService {
  /**
   * Analyze test documentation files (README, TESTING.md, etc.)
   */
  static analyzeTestDocumentationFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasTestDocumentation: boolean;
  } {
    let hasTestDocumentation = false;

    for (const filename of UnitTestDocumentationConstants.TEST_DOCUMENTATION_FILES) {
      const filePath = PathOperations.join(projectRoot, filename);
      if (FileUtils.exists(filePath)) {
        try {
          const content = FileUtils.readFile(filePath, { encoding: 'utf8' });
          const minLength =
            config.thresholds?.documentation?.minSetupDocumentationLength ??
            100;
          if (
            UnitTestDocumentationConstants.containsTestDocumentation(
              content,
              minLength
            )
          ) {
            hasTestDocumentation = true;
            break;
          }
        } catch (_error) {
          // Skip files that can't be read
        }
      }
    }

    return { hasTestDocumentation };
  }

  /**
   * Analyze individual test files for documentation quality
   */
  static analyzeTestFileDocumentation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    totalTestFiles: number;
    poorlyDocumentedFiles: string[];
    documentationCoverage: number;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    const poorlyDocumentedFiles: string[] = [];

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          !UnitTestDocumentationConstants.hasProperFileDocumentation(content)
        ) {
          poorlyDocumentedFiles.push(testFile);
        }
      } catch (_error) {
        poorlyDocumentedFiles.push(testFile);
      }
    }

    return {
      totalTestFiles: testFiles.length,
      poorlyDocumentedFiles,
      documentationCoverage: UnitTestDocumentationConstants.calculateCoverage(
        testFiles.length - poorlyDocumentedFiles.length,
        testFiles.length
      ),
    };
  }

  /**
   * Analyze test descriptions for quality and clarity
   */
  static analyzeTestDescriptions(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    totalTestCases: number;
    poorDescriptions: number;
    descriptionQuality: number;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let totalTestCases = 0;
    let poorDescriptions = 0;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        const testCases =
          UnitTestDocumentationConstants.extractTestCases(content);
        totalTestCases += testCases.length;

        poorDescriptions += testCases.filter(testCase =>
          UnitTestDocumentationConstants.hasPoorDescription(
            testCase,
            config.thresholds?.testing?.minTestDescriptionLength ?? 10
          )
        ).length;
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      totalTestCases,
      poorDescriptions,
      descriptionQuality: UnitTestDocumentationConstants.calculateCoverage(
        totalTestCases - poorDescriptions,
        totalTestCases
      ),
    };
  }

  /**
   * Analyze setup and teardown documentation
   */
  static analyzeSetupDocumentation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    hasSetupDocumentation: boolean;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let hasSetupDocumentation = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (UnitTestDocumentationConstants.hasSetupDocumentation(content)) {
          hasSetupDocumentation = true;
          break;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return { hasSetupDocumentation };
  }

  /**
   * Analyze testing strategy documentation
   */
  static analyzeTestingStrategyDocumentation(projectRoot: string): {
    hasStrategyDocs: boolean;
  } {
    let hasStrategyDocs = false;

    for (const filename of UnitTestDocumentationConstants.STRATEGY_DOCUMENTATION_FILES) {
      const filePath = PathOperations.join(projectRoot, filename);
      if (FileUtils.exists(filePath)) {
        hasStrategyDocs = true;
        break;
      }
    }

    return { hasStrategyDocs };
  }

  /**
   * Analyze test structure documentation
   */
  static analyzeTestStructureDocumentation(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    totalTestFiles: number;
    filesWithStructureDoc: number;
    structureDocCoverage: number;
  } {
    const testFiles = this.findTestFiles(projectRoot, config);
    let filesWithStructureDoc = 0;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          UnitTestDocumentationConstants.hasTestStructureDocumentation(content)
        ) {
          filesWithStructureDoc++;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      totalTestFiles: testFiles.length,
      filesWithStructureDoc,
      structureDocCoverage: UnitTestDocumentationConstants.calculateCoverage(
        filesWithStructureDoc,
        testFiles.length
      ),
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Find all test files in project
   */
  private static findTestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    return TestFileDiscovery.findTestFiles(projectRoot, config);
  }

  /**
   * Recursively find test files in directory
   */
  private static findTestFilesRecursively(
    dir: string,
    testFiles: string[],
    config: RuleOfCodeConfig
  ): void {
    TestFileDiscovery.findTestFilesRecursively(dir, testFiles, config);
  }

  /**
   * Check if file is a test file
   */
  private static isTestFile(filename: string): boolean {
    return TestFileDiscovery.isTestFile(filename);
  }
}
