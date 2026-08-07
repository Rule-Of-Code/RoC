import type { RuleOfCodeConfig } from '../../../../types';
import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';
import { FileUtils } from '../../../../utils/file-utils';
import { TestAnalyzerMixin } from '../../test-analyzer-mixin';
import { UnitTestAPITestingConstants } from '../constants/api-testing';

/**
 * UnitTestAPITestingAnalyzerService
 *
 * Orchestrates API testing analysis by coordinating:
 * - API test file discovery and analysis
 * - API testing framework detection
 * - HTTP method coverage verification
 * - Error scenario testing validation
 * - API mocking setup detection
 * - Request/response validation checking
 * - Authentication testing verification
 *
 * Delegates all pattern matching to Constants for single source of truth.
 */
export class UnitTestAPITestingAnalyzerService extends TestAnalyzerMixin {
  /**
   * Analyze API test file coverage
   */
  static analyzeAPITestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    testFiles: string[];
    testCount: number;
  } {
    try {
      const testFiles = this.findAPITestFiles(projectRoot, config);

      return {
        testFiles,
        testCount: testFiles.length,
      };
    } catch (_error) {
      return { testFiles: [], testCount: 0 };
    }
  }

  /**
   * Analyze API testing framework setup
   */
  static analyzeFrameworkSetup(projectRoot: string): {
    hasFramework: boolean;
    frameworks: string[];
  } {
    try {
      const allDeps =
        ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
      const frameworks: string[] = [];

      if (allDeps['supertest']) frameworks.push('supertest');
      if (allDeps['jest']) frameworks.push('jest');
      if (allDeps['cypress']) frameworks.push('cypress');
      if (allDeps['axios']) frameworks.push('axios');
      if (allDeps['playwright']) frameworks.push('playwright');
      if (allDeps['vitest']) frameworks.push('vitest');

      return {
        hasFramework: frameworks.length > 0,
        frameworks,
      };
    } catch (_error) {
      return { hasFramework: false, frameworks: [] };
    }
  }

  /**
   * Analyze HTTP method coverage in test files
   */
  static analyzeHTTPMethodCoverage(testFiles: string[]): {
    coveredMethods: string[];
    missingMethods: string[];
  } {
    const coveredMethods = new Set<string>();

    for (const file of testFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const methods =
          UnitTestAPITestingConstants.getHTTPMethodsCovered(content);
        methods.forEach(method => coveredMethods.add(method));
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    const missingMethods = UnitTestAPITestingConstants.HTTP_METHODS.filter(
      method => !coveredMethods.has(method)
    );

    return {
      coveredMethods: Array.from(coveredMethods),
      missingMethods,
    };
  }

  /**
   * Analyze error scenario testing
   */
  static analyzeErrorScenarioTesting(testFiles: string[]): {
    hasErrorTests: boolean;
    errorTestTypes: string[];
  } {
    const errorTestTypes: string[] = [];

    for (const file of testFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });

        if (UnitTestAPITestingConstants.hasErrorStatusAssertions(content)) {
          errorTestTypes.push('status assertions');
        }

        if (
          UnitTestAPITestingConstants.ERROR_PATTERNS.CLIENT_ERRORS_4XX.test(
            content
          )
        ) {
          errorTestTypes.push('4xx errors');
        }

        if (
          UnitTestAPITestingConstants.ERROR_PATTERNS.SERVER_ERRORS_5XX.test(
            content
          )
        ) {
          errorTestTypes.push('5xx errors');
        }

        if (UnitTestAPITestingConstants.hasErrorHandling(content)) {
          errorTestTypes.push('error handling');
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasErrorTests: errorTestTypes.length > 0,
      errorTestTypes: Array.from(new Set(errorTestTypes)),
    };
  }

  /**
   * Analyze API mocking setup
   */
  static analyzeMockingSetup(projectRoot: string): {
    hasMocking: boolean;
    mockingTools: string[];
  } {
    try {
      const mockingTools =
        UnitTestAPITestingConstants.getMockingLibraries(projectRoot);

      return {
        hasMocking: mockingTools.length > 0,
        mockingTools,
      };
    } catch (_error) {
      return { hasMocking: false, mockingTools: [] };
    }
  }

  /**
   * Analyze request/response validation
   */
  static analyzeRequestResponseValidation(testFiles: string[]): {
    hasValidation: boolean;
    validationTypes: string[];
  } {
    const validationTypes: string[] = [];

    for (const file of testFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });

        if (
          UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.REQUEST_BODY.test(
            content
          )
        ) {
          validationTypes.push('request body');
        }

        if (
          UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.RESPONSE_BODY.test(
            content
          )
        ) {
          validationTypes.push('response body');
        }

        if (
          UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.HEADERS.test(
            content
          )
        ) {
          validationTypes.push('headers');
        }

        if (
          UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.STATUS.test(
            content
          )
        ) {
          validationTypes.push('status codes');
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasValidation: validationTypes.length > 0,
      validationTypes: Array.from(new Set(validationTypes)),
    };
  }

  /**
   * Analyze authentication testing
   */
  static analyzeAuthenticationTesting(testFiles: string[]): {
    hasAuthTesting: boolean;
    authPatterns: string[];
  } {
    const authPatterns: string[] = [];

    for (const file of testFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });

        if (
          UnitTestAPITestingConstants.AUTH_PATTERNS.AUTH_HEADER.test(content)
        ) {
          authPatterns.push('authorization header');
        }

        if (UnitTestAPITestingConstants.AUTH_PATTERNS.JWT.test(content)) {
          authPatterns.push('JWT tokens');
        }

        if (UnitTestAPITestingConstants.AUTH_PATTERNS.OAUTH.test(content)) {
          authPatterns.push('OAuth');
        }

        if (UnitTestAPITestingConstants.AUTH_PATTERNS.API_KEY.test(content)) {
          authPatterns.push('API keys');
        }
      } catch (_error) {
        // Skip files that can't be read
      }
    }

    return {
      hasAuthTesting: authPatterns.length > 0,
      authPatterns: Array.from(new Set(authPatterns)),
    };
  }

  /**
   * Find API test files in the project
   */
  private static findAPITestFiles(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): string[] {
    const searchDirs = this.buildTestSearchDirs(projectRoot, ['api']);
    return this.findTestFilesInDirectories(
      projectRoot,
      searchDirs,
      UnitTestAPITestingConstants.isAPITestFile.bind(
        UnitTestAPITestingConstants
      ),
      config
    );
  }
}
