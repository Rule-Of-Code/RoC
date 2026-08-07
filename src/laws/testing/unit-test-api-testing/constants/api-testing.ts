import { ProjectTypeDetectorValidation } from '../../../../utils/config/project-type-detector/project-type-detector-validation';

/**
 * UnitTestAPITestingConstants
 *
 * Centralized configuration for API testing validation.
 * All API testing rules, patterns, frameworks, and HTTP methods.
 *
 * Covers:
 * - API test file discovery and patterns
 * - API testing frameworks detection
 * - HTTP method coverage (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
 * - Error scenario patterns (4xx, 5xx status codes)
 * - API mocking tools (MSW, nock, Sinon, Mirage)
 * - Request/response validation patterns
 * - Authentication and security testing patterns
 *
 * Single source of truth for all API testing validation rules.
 */
export class UnitTestAPITestingConstants {
  // API test file patterns. The `api[.-_]…spec` form (preceded by a separator or
  // start) catches real-world names like `bot-api.service.spec.ts` and
  // `api.integration.spec.ts`, not just the strict `api.spec.ts`.
  static readonly API_TEST_PATTERNS = [
    /api\.test\.ts$/,
    /api\.spec\.ts$/,
    /\.api\.ts$/,
    /(^|[.\-_/])api[.\-_][\w.\-]*\.(spec|test)\.ts$/i,
    /request\.test\.ts$/,
    /request\.spec\.ts$/,
    /endpoint\.test\.ts$/,
    /endpoint\.spec\.ts$/,
  ];

  // HTTP methods
  static readonly HTTP_METHODS = [
    'GET',
    'POST',
    'PUT',
    'DELETE',
    'PATCH',
    'HEAD',
    'OPTIONS',
  ];

  // HTTP method patterns in code
  static readonly HTTP_METHOD_PATTERNS = {
    GET: /\.get\s*\(|GET|request\.get/i,
    POST: /\.post\s*\(|POST|request\.post/i,
    PUT: /\.put\s*\(|PUT|request\.put/i,
    DELETE: /\.delete\s*\(|DELETE|request\.delete/i,
    PATCH: /\.patch\s*\(|PATCH|request\.patch/i,
    HEAD: /\.head\s*\(|HEAD|request\.head/i,
    OPTIONS: /\.options\s*\(|OPTIONS|request\.options/i,
  };

  // API testing frameworks
  static readonly API_TESTING_FRAMEWORKS = {
    SUPERTEST: /supertest/i,
    JEST: /jest/i,
    CYPRESS: /cypress/i,
    AXIOS: /axios/i,
    FETCH: /fetch-mock|node-fetch/i,
    PLAYWRIGHT: /playwright/i,
    VITEST: /vitest/i,
  };

  // API testing framework dependencies
  static readonly FRAMEWORK_DEPENDENCIES = [
    'supertest',
    'jest',
    'cypress',
    'axios',
    'fetch-mock',
    'node-fetch',
    'playwright',
    'vitest',
  ];

  // Error status code patterns
  static readonly ERROR_PATTERNS = {
    CLIENT_ERRORS_4XX: /4\d{2}|400|401|403|404|405|422|429/,
    SERVER_ERRORS_5XX: /5\d{2}|500|502|503|504/,
    GENERAL_ERROR: /error|Error|ERROR|catch|throw/,
    STATUS_ASSERTION: /\.status\s*\(|expect.*status|statusCode/i,
    ERROR_HANDLING: /catch|\.error|\.fail|reject/i,
  };

  // API mocking tools
  static readonly MOCKING_TOOLS = {
    MSW: /msw|mock-service-worker/i,
    NOCK: /nock/i,
    SINON: /sinon/i,
    MIRAGE: /miragejs|mirage/i,
  };

  // Mocking tool dependencies
  static readonly MOCKING_DEPENDENCIES = [
    'msw',
    'mock-service-worker',
    'nock',
    'sinon',
    'miragejs',
    'mirage',
  ];

  // Request/response validation patterns
  static readonly REQUEST_RESPONSE_PATTERNS = {
    REQUEST_BODY: /\.send\s*\(|\.data\s*=|request\.body|\.json\s*\(/i,
    RESPONSE_BODY: /\.body|res\.data|response\.json|\.json\s*\(/i,
    HEADERS: /\.set\s*\(|headers|\.headers\s*=/i,
    STATUS: /\.status\s*\(|statusCode|status/i,
  };

  // Authentication testing patterns
  static readonly AUTH_PATTERNS = {
    AUTH_HEADER: /authorization|bearer|token|auth/i,
    JWT: /jwt|token|\.auth/i,
    OAUTH: /oauth|\.oauth/i,
    API_KEY: /api.?key|x-api-key/i,
  };

  // Score deductions
  static readonly SCORE_DEDUCTIONS = {
    NO_API_TESTS: 30,
    NO_FRAMEWORK: 25,
    MISSING_HTTP_METHODS: 15,
    NO_ERROR_TESTS: 15,
    NO_MOCKING: 10,
  };

  /**
   * Check if filename is an API test file
   */
  static isAPITestFile(filename: string): boolean {
    return this.API_TEST_PATTERNS.some(pattern => pattern.test(filename));
  }

  /**
   * Check if file contains API testing framework
   */
  static hasTestingFramework(content: string): boolean {
    return Object.values(this.API_TESTING_FRAMEWORKS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Check HTTP method coverage in content
   */
  static getHTTPMethodsCovered(content: string): string[] {
    const covered: string[] = [];

    for (const method of this.HTTP_METHODS) {
      const pattern =
        this.HTTP_METHOD_PATTERNS[
          method as keyof typeof this.HTTP_METHOD_PATTERNS
        ];
      if (pattern.test(content)) {
        covered.push(method);
      }
    }

    return covered;
  }

  /**
   * Get missing HTTP methods
   */
  static getMissingHTTPMethods(content: string): string[] {
    const covered = this.getHTTPMethodsCovered(content);
    return this.HTTP_METHODS.filter(method => !covered.includes(method));
  }

  /**
   * Check if content has error scenario testing
   */
  static hasErrorScenarioTesting(content: string): boolean {
    return (
      this.ERROR_PATTERNS.CLIENT_ERRORS_4XX.test(content) ||
      this.ERROR_PATTERNS.SERVER_ERRORS_5XX.test(content) ||
      this.ERROR_PATTERNS.ERROR_HANDLING.test(content)
    );
  }

  /**
   * Check for error status assertions
   */
  static hasErrorStatusAssertions(content: string): boolean {
    return this.ERROR_PATTERNS.STATUS_ASSERTION.test(content);
  }

  /**
   * Check for error handling
   */
  static hasErrorHandling(content: string): boolean {
    return this.ERROR_PATTERNS.ERROR_HANDLING.test(content);
  }

  /**
   * Check if mocking library is present
   */
  static hasMockingLibrary(projectRoot: string): boolean {
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
    return this.MOCKING_DEPENDENCIES.some(dep => dep in allDeps);
  }

  /**
   * Get mocking libraries used
   */
  static getMockingLibraries(projectRoot: string): string[] {
    const allDeps =
      ProjectTypeDetectorValidation.getProjectDependencies(projectRoot);
    return this.MOCKING_DEPENDENCIES.filter(dep => dep in allDeps);
  }

  /**
   * Check for request/response validation
   */
  static hasRequestResponseValidation(content: string): boolean {
    const hasRequest =
      this.REQUEST_RESPONSE_PATTERNS.REQUEST_BODY.test(content);
    const hasResponse =
      this.REQUEST_RESPONSE_PATTERNS.RESPONSE_BODY.test(content);

    return hasRequest && hasResponse;
  }

  /**
   * Check for authentication testing
   */
  static hasAuthenticationTesting(content: string): boolean {
    return Object.values(this.AUTH_PATTERNS).some(pattern =>
      pattern.test(content)
    );
  }

  /**
   * Determine if API testing is comprehensive
   */
  static isComprehensiveAPITesting(
    hasFramework: boolean,
    hasErrorTests: boolean,
    hasMocking: boolean,
    hasRequestResponseValidation: boolean
  ): boolean {
    // Must have framework and at least 2 other components
    const components = [
      hasErrorTests,
      hasMocking,
      hasRequestResponseValidation,
    ].filter(Boolean).length;

    return hasFramework && components >= 2;
  }
}
