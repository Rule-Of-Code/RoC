import type { RuleOfCodeConfig } from '../../../../config/types';
import { DirectorySearcher } from '../../../../utils/directory-searcher';
import { FileUtils } from '../../../../utils/file-utils';
import { UnitTestProfessionalComponentTestingConstants } from '../constants/component-testing';

/**
 * UnitTestProfessionalComponentTestingAnalyzerService
 *
 * Orchestrates component testing analysis by coordinating:
 * - Component discovery and test file matching
 * - Test quality assessment
 * - Component testing pattern validation
 * - Mocking and isolation verification
 * - TestBed usage analysis
 *
 * Delegates all pattern matching to Constants for single source of truth.
 */
export class UnitTestProfessionalComponentTestingAnalyzerService {
  /**
   * Analyze component test coverage (discover components and their test files)
   */
  static analyzeComponentTestCoverage(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    totalComponents: number;
    testFiles: string[];
    missingTestFiles: string[];
    testCoverage: number;
  } {
    try {
      const components = this.findComponentFiles(projectRoot, config);
      const testFiles: string[] = [];
      const missingTestFiles: string[] = [];

      for (const componentFile of components) {
        const expectedTestFile = componentFile.replace(
          '.component.ts',
          '.component.spec.ts'
        );

        if (FileUtils.exists(expectedTestFile)) {
          testFiles.push(expectedTestFile);
        } else {
          missingTestFiles.push(componentFile);
        }
      }

      return {
        totalComponents: components.length,
        testFiles,
        missingTestFiles,
        testCoverage:
          components.length > 0
            ? (testFiles.length / components.length) * 100
            : 100,
      };
    } catch (_error) {
      return {
        totalComponents: 0,
        testFiles: [],
        missingTestFiles: [],
        testCoverage: 100,
      };
    }
  }

  /**
   * Analyze test quality across all test files
   */
  static analyzeTestQuality(testFiles: string[]): {
    lowQualityTests: string[];
  } {
    const lowQualityTests: string[] = [];

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          !UnitTestProfessionalComponentTestingConstants.hasQualityTestContent(
            content
          )
        ) {
          lowQualityTests.push(testFile);
        }
      } catch (_error) {
        // Skip files that can't be read
        lowQualityTests.push(testFile);
      }
    }

    return { lowQualityTests };
  }

  /**
   * Analyze component testing patterns (input/output, lifecycle, user interaction)
   */
  static analyzeComponentTestPatterns(testFiles: string[]): {
    hasProperPatterns: boolean;
    hasInputOutputTesting: boolean;
    hasLifecycleTesting: boolean;
    hasUserInteractionTesting: boolean;
    hasProperAssertions: boolean;
  } {
    let hasInputOutputTesting = false;
    let hasLifecycleTesting = false;
    let hasUserInteractionTesting = false;
    let hasProperAssertions = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          UnitTestProfessionalComponentTestingConstants.hasInputOutputTesting(
            content
          )
        ) {
          hasInputOutputTesting = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasLifecycleTesting(
            content
          )
        ) {
          hasLifecycleTesting = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasUserInteractionTesting(
            content
          )
        ) {
          hasUserInteractionTesting = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasProperAssertions(
            content
          )
        ) {
          hasProperAssertions = true;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    const hasProperPatterns =
      testFiles.length === 0 ||
      (hasProperAssertions &&
        (hasInputOutputTesting || hasUserInteractionTesting));

    return {
      hasProperPatterns,
      hasInputOutputTesting,
      hasLifecycleTesting,
      hasUserInteractionTesting,
      hasProperAssertions,
    };
  }

  /**
   * Analyze mocking and isolation patterns in tests
   */
  static analyzeMockingPatterns(testFiles: string[]): {
    hasProperMocking: boolean;
    hasTestBedMocking: boolean;
    hasSpyUsage: boolean;
    hasServiceMocking: boolean;
  } {
    let hasTestBedMocking = false;
    let hasSpyUsage = false;
    let hasServiceMocking = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          UnitTestProfessionalComponentTestingConstants.hasTestBedMocking(
            content
          )
        ) {
          hasTestBedMocking = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasSpyUsage(content)
        ) {
          hasSpyUsage = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasServiceMocking(
            content
          )
        ) {
          hasServiceMocking = true;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    const hasProperMocking =
      testFiles.length === 0 || hasTestBedMocking || hasSpyUsage;

    return {
      hasProperMocking,
      hasTestBedMocking,
      hasSpyUsage,
      hasServiceMocking,
    };
  }

  /**
   * Analyze TestBed usage and configuration patterns
   */
  static analyzeTestBedUsage(testFiles: string[]): {
    hasProperTestBedUsage: boolean;
    hasProperTestBedConfiguration: boolean;
    hasModuleConfiguration: boolean;
    hasComponentDeclaration: boolean;
  } {
    let hasProperTestBedConfiguration = false;
    let hasModuleConfiguration = false;
    let hasComponentDeclaration = false;

    for (const testFile of testFiles) {
      try {
        const content = FileUtils.readFile(testFile, { encoding: 'utf8' });

        if (
          UnitTestProfessionalComponentTestingConstants.hasProperTestBedConfiguration(
            content
          )
        ) {
          hasProperTestBedConfiguration = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasModuleConfiguration(
            content
          )
        ) {
          hasModuleConfiguration = true;
        }

        if (
          UnitTestProfessionalComponentTestingConstants.hasComponentDeclaration(
            content
          )
        ) {
          hasComponentDeclaration = true;
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    const hasProperTestBedUsage =
      testFiles.length === 0 ||
      (hasProperTestBedConfiguration && hasComponentDeclaration);

    return {
      hasProperTestBedUsage,
      hasProperTestBedConfiguration,
      hasModuleConfiguration,
      hasComponentDeclaration,
    };
  }

  /**
   * Find all component files in the project using DirectorySearcher
   */
  private static findComponentFiles(
    projectRoot: string,
    _config: RuleOfCodeConfig
  ): string[] {
    const components: string[] = [];

    DirectorySearcher.searchDirectoriesRecursively(
      DirectorySearcher.getStandardSourceDirs(projectRoot),
      filePath => {
        try {
          if (
            UnitTestProfessionalComponentTestingConstants.isComponentFile(
              filePath
            )
          ) {
            components.push(filePath);
          }
        } catch (_error) {
          // Skip files that can't be analyzed
        }
      }
    );

    return components;
  }
}
