import type { LawCheckContext, LawResult } from '../../types/law.types';
import { PythonSatisfaction } from '../../utils/python-satisfaction';
import { TestingLawUtilities } from './shared-testing-utilities';
import { UnitTestAPITestingAnalyzerService } from './unit-test-api-testing/services/api-testing-analyzer.service';

/**
 * API Testing Standards Law
 *
 * Validates comprehensive API testing implementation including:
 * - API test file coverage (Jest, Supertest, Cypress, Playwright)
 * - API testing framework setup and configuration
 * - HTTP method coverage testing (GET, POST, PUT, DELETE, PATCH, etc.)
 * - Error scenario testing (4xx, 5xx status codes, error handling)
 * - API mocking setup (MSW, nock, Sinon, Mirage)
 * - Request/response validation patterns
 * - Authentication testing (JWT, OAuth, API keys)
 *
 * Delegates all analysis to the specialized analyzer service.
 * Pure coordinator - only aggregates results and returns LawResult.
 */
export class APITestingStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    try {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;
      const { projectRoot } = context;

      // The detectors below only know supertest/jest/cypress and MSW/nock. A
      // Python project tests its API with pytest and a Flask/FastAPI test
      // client — the same concern, satisfied natively. Asking the JS question
      // alone there reports the absence of a substrate the project does not
      // use, so ask the Python question too before pushing a violation.
      const pythonSatisfied = this.isApiTestingSatisfiedByPython(projectRoot);

      // 1. Analyze API test files
      const apiTestAnalysis =
        UnitTestAPITestingAnalyzerService.analyzeAPITestFiles(
          projectRoot,
          context.config
        );

      if (apiTestAnalysis.testCount === 0 && !pythonSatisfied) {
        violations.push('No API test files found');
        suggestions.push(
          'Create API test files using Jest, Cypress, or Supertest'
        );
        score -= 30;
      }

      // 2. Analyze testing framework setup
      const frameworkAnalysis =
        UnitTestAPITestingAnalyzerService.analyzeFrameworkSetup(projectRoot);

      if (!frameworkAnalysis.hasFramework && !pythonSatisfied) {
        violations.push('No API testing framework configured');
        suggestions.push(
          'Install API testing framework (supertest, jest, cypress)'
        );
        score -= 25;
      }

      // 3 + 4 + 6. Analyze the discovered API test files
      score -= this.analyzeTestFileQuality(
        apiTestAnalysis.testFiles,
        violations,
        suggestions
      );

      // 5. Analyze API mocking setup
      const mockingAnalysis =
        UnitTestAPITestingAnalyzerService.analyzeMockingSetup(projectRoot);

      if (!mockingAnalysis.hasMocking && !pythonSatisfied) {
        suggestions.push(
          'Consider implementing API mocking with tools like MSW or nock'
        );
        score -= 10;
      }

      return TestingLawUtilities.createTestResult({
        lawName: 'API Testing Standards',
        violations,
        suggestions,
        score,
        analysisData: apiTestAnalysis,
        config: context.config,
        messageGenerator: this.generateMessage.bind(this),
      });
    } catch (error) {
      return TestingLawUtilities.createTestingErrorResult(
        'API Testing Standards',
        error,
        context.config
      );
    }
  }

  /**
   * Are the API tests written the Python way?
   * (a `tests/api` tree, or pytest tests driving a Flask/FastAPI test client)
   */
  private static isApiTestingSatisfiedByPython(projectRoot: string): boolean {
    return (
      PythonSatisfaction.isPython(projectRoot) &&
      PythonSatisfaction.hasApiTests(projectRoot)
    );
  }

  /**
   * Analyze the discovered API test files: HTTP method coverage, error
   * scenarios and request/response validation. Returns the score penalty.
   */
  private static analyzeTestFileQuality(
    testFiles: string[],
    violations: string[],
    suggestions: string[]
  ): number {
    if (testFiles.length === 0) {
      return 0;
    }

    let penalty = 0;

    const httpMethodAnalysis =
      UnitTestAPITestingAnalyzerService.analyzeHTTPMethodCoverage(testFiles);

    if (httpMethodAnalysis.missingMethods.length > 0) {
      violations.push(
        `Missing HTTP method tests: ${httpMethodAnalysis.missingMethods.join(', ')}`
      );
      suggestions.push(
        'Add tests for all HTTP methods (GET, POST, PUT, DELETE)'
      );
      penalty += 15;
    }

    const errorAnalysis =
      UnitTestAPITestingAnalyzerService.analyzeErrorScenarioTesting(testFiles);

    if (!errorAnalysis.hasErrorTests) {
      violations.push('Error scenario testing not implemented');
      suggestions.push('Add tests for 4xx and 5xx error responses');
      penalty += 15;
    }

    UnitTestAPITestingAnalyzerService.analyzeRequestResponseValidation(
      testFiles
    );

    return penalty;
  }

  private static generateMessage(
    violations: string[],
    apiTestAnalysis: { testCount: number }
  ): string {
    if (violations.length === 0) {
      return '✅ API Testing Standards: Comprehensive API testing implemented';
    }

    if (apiTestAnalysis.testCount === 0) {
      return '⚠️ API Testing: No API test files found';
    }

    return `⚠️ API Testing: ${violations.length} issues found`;
  }
}
