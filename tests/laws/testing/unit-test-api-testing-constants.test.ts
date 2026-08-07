/**
 * Unit Test API Testing Constants - Tests
 * Tests for API testing patterns and helper methods
 */
import { UnitTestAPITestingConstants } from '../../../src/laws/testing/unit-test-api-testing/constants/api-testing';

describe('UnitTestAPITestingConstants', () => {
  // ============================================
  // 1. API Test Patterns
  // ============================================
  describe('API_TEST_PATTERNS', () => {
    it('should be an array', () => {
      expect(Array.isArray(UnitTestAPITestingConstants.API_TEST_PATTERNS)).toBe(
        true
      );
    });

    it('should contain regex patterns', () => {
      UnitTestAPITestingConstants.API_TEST_PATTERNS.forEach(pattern => {
        expect(pattern).toBeInstanceOf(RegExp);
      });
    });

    it('should match api.test.ts files', () => {
      const pattern = UnitTestAPITestingConstants.API_TEST_PATTERNS.find(p =>
        p.test('users.api.test.ts')
      );
      expect(pattern).toBeDefined();
    });

    it('should match api.spec.ts files', () => {
      const pattern = UnitTestAPITestingConstants.API_TEST_PATTERNS.find(p =>
        p.test('users.api.spec.ts')
      );
      expect(pattern).toBeDefined();
    });

    it('should match request.test.ts files', () => {
      const pattern = UnitTestAPITestingConstants.API_TEST_PATTERNS.find(p =>
        p.test('http.request.test.ts')
      );
      expect(pattern).toBeDefined();
    });

    it('should match endpoint.test.ts files', () => {
      const pattern = UnitTestAPITestingConstants.API_TEST_PATTERNS.find(p =>
        p.test('user.endpoint.test.ts')
      );
      expect(pattern).toBeDefined();
    });
  });

  // ============================================
  // 2. HTTP Methods
  // ============================================
  describe('HTTP_METHODS', () => {
    it('should be an array', () => {
      expect(Array.isArray(UnitTestAPITestingConstants.HTTP_METHODS)).toBe(
        true
      );
    });

    it('should contain GET', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('GET');
    });

    it('should contain POST', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('POST');
    });

    it('should contain PUT', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('PUT');
    });

    it('should contain DELETE', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('DELETE');
    });

    it('should contain PATCH', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('PATCH');
    });

    it('should contain HEAD', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('HEAD');
    });

    it('should contain OPTIONS', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toContain('OPTIONS');
    });

    it('should have 7 methods', () => {
      expect(UnitTestAPITestingConstants.HTTP_METHODS).toHaveLength(7);
    });
  });

  // ============================================
  // 3. HTTP Method Patterns
  // ============================================
  describe('HTTP_METHOD_PATTERNS', () => {
    it('should have GET pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.GET
      ).toBeInstanceOf(RegExp);
    });

    it('should match GET requests', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.GET.test(
          "http.get('/api/users')"
        )
      ).toBe(true);
    });

    it('should have POST pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.POST
      ).toBeInstanceOf(RegExp);
    });

    it('should match POST requests', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.POST.test(
          "http.post('/api/users', data)"
        )
      ).toBe(true);
    });

    it('should have PUT pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.PUT
      ).toBeInstanceOf(RegExp);
    });

    it('should have DELETE pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.DELETE
      ).toBeInstanceOf(RegExp);
    });

    it('should have PATCH pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.PATCH
      ).toBeInstanceOf(RegExp);
    });

    it('should have HEAD pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.HEAD
      ).toBeInstanceOf(RegExp);
    });

    it('should have OPTIONS pattern', () => {
      expect(
        UnitTestAPITestingConstants.HTTP_METHOD_PATTERNS.OPTIONS
      ).toBeInstanceOf(RegExp);
    });
  });

  // ============================================
  // 4. API Testing Frameworks
  // ============================================
  describe('API_TESTING_FRAMEWORKS', () => {
    it('should have SUPERTEST pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.SUPERTEST
      ).toBeInstanceOf(RegExp);
    });

    it('should match supertest', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.SUPERTEST.test(
          "import supertest from 'supertest'"
        )
      ).toBe(true);
    });

    it('should have JEST pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.JEST
      ).toBeInstanceOf(RegExp);
    });

    it('should have CYPRESS pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.CYPRESS
      ).toBeInstanceOf(RegExp);
    });

    it('should have AXIOS pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.AXIOS
      ).toBeInstanceOf(RegExp);
    });

    it('should have FETCH pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.FETCH
      ).toBeInstanceOf(RegExp);
    });

    it('should have PLAYWRIGHT pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.PLAYWRIGHT
      ).toBeInstanceOf(RegExp);
    });

    it('should have VITEST pattern', () => {
      expect(
        UnitTestAPITestingConstants.API_TESTING_FRAMEWORKS.VITEST
      ).toBeInstanceOf(RegExp);
    });
  });

  // ============================================
  // 5. Framework Dependencies
  // ============================================
  describe('FRAMEWORK_DEPENDENCIES', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(UnitTestAPITestingConstants.FRAMEWORK_DEPENDENCIES)
      ).toBe(true);
    });

    it('should include supertest', () => {
      expect(UnitTestAPITestingConstants.FRAMEWORK_DEPENDENCIES).toContain(
        'supertest'
      );
    });

    it('should include jest', () => {
      expect(UnitTestAPITestingConstants.FRAMEWORK_DEPENDENCIES).toContain(
        'jest'
      );
    });

    it('should include axios', () => {
      expect(UnitTestAPITestingConstants.FRAMEWORK_DEPENDENCIES).toContain(
        'axios'
      );
    });

    it('should include playwright', () => {
      expect(UnitTestAPITestingConstants.FRAMEWORK_DEPENDENCIES).toContain(
        'playwright'
      );
    });
  });

  // ============================================
  // 6. Error Patterns
  // ============================================
  describe('ERROR_PATTERNS', () => {
    it('should have CLIENT_ERRORS_4XX pattern', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.CLIENT_ERRORS_4XX
      ).toBeInstanceOf(RegExp);
    });

    it('should match 400 errors', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.CLIENT_ERRORS_4XX.test('400')
      ).toBe(true);
    });

    it('should match 404 errors', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.CLIENT_ERRORS_4XX.test('404')
      ).toBe(true);
    });

    it('should have SERVER_ERRORS_5XX pattern', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.SERVER_ERRORS_5XX
      ).toBeInstanceOf(RegExp);
    });

    it('should match 500 errors', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.SERVER_ERRORS_5XX.test('500')
      ).toBe(true);
    });

    it('should have GENERAL_ERROR pattern', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.GENERAL_ERROR
      ).toBeInstanceOf(RegExp);
    });

    it('should have STATUS_ASSERTION pattern', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.STATUS_ASSERTION
      ).toBeInstanceOf(RegExp);
    });

    it('should have ERROR_HANDLING pattern', () => {
      expect(
        UnitTestAPITestingConstants.ERROR_PATTERNS.ERROR_HANDLING
      ).toBeInstanceOf(RegExp);
    });
  });

  // ============================================
  // 7. Mocking Tools
  // ============================================
  describe('MOCKING_TOOLS', () => {
    it('should have MSW pattern', () => {
      expect(UnitTestAPITestingConstants.MOCKING_TOOLS.MSW).toBeInstanceOf(
        RegExp
      );
    });

    it('should match msw', () => {
      expect(
        UnitTestAPITestingConstants.MOCKING_TOOLS.MSW.test(
          "import { rest } from 'msw'"
        )
      ).toBe(true);
    });

    it('should have NOCK pattern', () => {
      expect(UnitTestAPITestingConstants.MOCKING_TOOLS.NOCK).toBeInstanceOf(
        RegExp
      );
    });

    it('should have SINON pattern', () => {
      expect(UnitTestAPITestingConstants.MOCKING_TOOLS.SINON).toBeInstanceOf(
        RegExp
      );
    });

    it('should have MIRAGE pattern', () => {
      expect(UnitTestAPITestingConstants.MOCKING_TOOLS.MIRAGE).toBeInstanceOf(
        RegExp
      );
    });
  });

  // ============================================
  // 8. Mocking Dependencies
  // ============================================
  describe('MOCKING_DEPENDENCIES', () => {
    it('should be an array', () => {
      expect(
        Array.isArray(UnitTestAPITestingConstants.MOCKING_DEPENDENCIES)
      ).toBe(true);
    });

    it('should include msw', () => {
      expect(UnitTestAPITestingConstants.MOCKING_DEPENDENCIES).toContain('msw');
    });

    it('should include nock', () => {
      expect(UnitTestAPITestingConstants.MOCKING_DEPENDENCIES).toContain(
        'nock'
      );
    });

    it('should include sinon', () => {
      expect(UnitTestAPITestingConstants.MOCKING_DEPENDENCIES).toContain(
        'sinon'
      );
    });
  });

  // ============================================
  // 9. Request/Response Patterns
  // ============================================
  describe('REQUEST_RESPONSE_PATTERNS', () => {
    it('should have REQUEST_BODY pattern', () => {
      expect(
        UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.REQUEST_BODY
      ).toBeInstanceOf(RegExp);
    });

    it('should have RESPONSE_BODY pattern', () => {
      expect(
        UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.RESPONSE_BODY
      ).toBeInstanceOf(RegExp);
    });

    it('should have HEADERS pattern', () => {
      expect(
        UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.HEADERS
      ).toBeInstanceOf(RegExp);
    });

    it('should have STATUS pattern', () => {
      expect(
        UnitTestAPITestingConstants.REQUEST_RESPONSE_PATTERNS.STATUS
      ).toBeInstanceOf(RegExp);
    });
  });

  // ============================================
  // 10. Auth Patterns
  // ============================================
  describe('AUTH_PATTERNS', () => {
    it('should have AUTH_HEADER pattern', () => {
      expect(
        UnitTestAPITestingConstants.AUTH_PATTERNS.AUTH_HEADER
      ).toBeInstanceOf(RegExp);
    });

    it('should match authorization header', () => {
      expect(
        UnitTestAPITestingConstants.AUTH_PATTERNS.AUTH_HEADER.test(
          'Authorization: Bearer token'
        )
      ).toBe(true);
    });

    it('should have JWT pattern', () => {
      expect(UnitTestAPITestingConstants.AUTH_PATTERNS.JWT).toBeInstanceOf(
        RegExp
      );
    });

    it('should have OAUTH pattern', () => {
      expect(UnitTestAPITestingConstants.AUTH_PATTERNS.OAUTH).toBeInstanceOf(
        RegExp
      );
    });

    it('should have API_KEY pattern', () => {
      expect(UnitTestAPITestingConstants.AUTH_PATTERNS.API_KEY).toBeInstanceOf(
        RegExp
      );
    });
  });

  // ============================================
  // 11. Score Deductions
  // ============================================
  describe('SCORE_DEDUCTIONS', () => {
    it('should have NO_API_TESTS deduction', () => {
      expect(UnitTestAPITestingConstants.SCORE_DEDUCTIONS.NO_API_TESTS).toBe(
        30
      );
    });

    it('should have NO_FRAMEWORK deduction', () => {
      expect(UnitTestAPITestingConstants.SCORE_DEDUCTIONS.NO_FRAMEWORK).toBe(
        25
      );
    });

    it('should have MISSING_HTTP_METHODS deduction', () => {
      expect(
        UnitTestAPITestingConstants.SCORE_DEDUCTIONS.MISSING_HTTP_METHODS
      ).toBe(15);
    });

    it('should have NO_ERROR_TESTS deduction', () => {
      expect(UnitTestAPITestingConstants.SCORE_DEDUCTIONS.NO_ERROR_TESTS).toBe(
        15
      );
    });

    it('should have NO_MOCKING deduction', () => {
      expect(UnitTestAPITestingConstants.SCORE_DEDUCTIONS.NO_MOCKING).toBe(10);
    });
  });

  // ============================================
  // Helper Methods
  // ============================================
  describe('isAPITestFile', () => {
    it('should return true for api.test.ts files', () => {
      expect(
        UnitTestAPITestingConstants.isAPITestFile('users.api.test.ts')
      ).toBe(true);
    });

    it('should return true for api.spec.ts files', () => {
      expect(
        UnitTestAPITestingConstants.isAPITestFile('users.api.spec.ts')
      ).toBe(true);
    });

    it('should return true for request.test.ts files', () => {
      expect(
        UnitTestAPITestingConstants.isAPITestFile('http.request.test.ts')
      ).toBe(true);
    });

    it('should return true for endpoint.test.ts files', () => {
      expect(
        UnitTestAPITestingConstants.isAPITestFile('user.endpoint.test.ts')
      ).toBe(true);
    });

    it('should return false for regular test files', () => {
      expect(
        UnitTestAPITestingConstants.isAPITestFile('component.test.ts')
      ).toBe(false);
    });
  });

  describe('hasTestingFramework', () => {
    it('should return true for content with supertest', () => {
      const content = "import request from 'supertest';";
      expect(UnitTestAPITestingConstants.hasTestingFramework(content)).toBe(
        true
      );
    });

    it('should return true for content with jest', () => {
      const content = "import { jest } from '@jest/globals';";
      expect(UnitTestAPITestingConstants.hasTestingFramework(content)).toBe(
        true
      );
    });

    it('should return false for content without frameworks', () => {
      const content = 'const x = 1;';
      expect(UnitTestAPITestingConstants.hasTestingFramework(content)).toBe(
        false
      );
    });
  });

  describe('getHTTPMethodsCovered', () => {
    it('should detect GET method', () => {
      const content = "http.get('/api/users')";
      expect(
        UnitTestAPITestingConstants.getHTTPMethodsCovered(content)
      ).toContain('GET');
    });

    it('should detect POST method', () => {
      const content = "http.post('/api/users', data)";
      expect(
        UnitTestAPITestingConstants.getHTTPMethodsCovered(content)
      ).toContain('POST');
    });

    it('should detect multiple methods', () => {
      const content = `
        http.get('/api/users')
        http.post('/api/users', data)
        http.delete('/api/users/1')
      `;
      const covered =
        UnitTestAPITestingConstants.getHTTPMethodsCovered(content);
      expect(covered).toContain('GET');
      expect(covered).toContain('POST');
      expect(covered).toContain('DELETE');
    });

    it('should return empty array for content without HTTP methods', () => {
      const content = 'const x = 1;';
      expect(
        UnitTestAPITestingConstants.getHTTPMethodsCovered(content)
      ).toHaveLength(0);
    });
  });

  describe('getMissingHTTPMethods', () => {
    it('should return missing methods', () => {
      const content = "http.get('/api/users')";
      const missing =
        UnitTestAPITestingConstants.getMissingHTTPMethods(content);
      expect(missing).toContain('POST');
      expect(missing).toContain('PUT');
      expect(missing).toContain('DELETE');
      expect(missing).not.toContain('GET');
    });

    it('should return all methods for empty content', () => {
      const content = '';
      const missing =
        UnitTestAPITestingConstants.getMissingHTTPMethods(content);
      expect(missing).toHaveLength(7);
    });
  });

  describe('hasErrorScenarioTesting', () => {
    it('should return true for content with 4xx errors', () => {
      const content = 'expect(response.status).toBe(404);';
      expect(UnitTestAPITestingConstants.hasErrorScenarioTesting(content)).toBe(
        true
      );
    });

    it('should return true for content with 5xx errors', () => {
      const content = 'expect(response.status).toBe(500);';
      expect(UnitTestAPITestingConstants.hasErrorScenarioTesting(content)).toBe(
        true
      );
    });

    it('should return true for content with error handling', () => {
      const content = 'catch(error)';
      expect(UnitTestAPITestingConstants.hasErrorScenarioTesting(content)).toBe(
        true
      );
    });

    it('should return false for content without error testing', () => {
      const content = 'expect(response.status).toBe(200);';
      expect(UnitTestAPITestingConstants.hasErrorScenarioTesting(content)).toBe(
        false
      );
    });
  });

  describe('hasErrorStatusAssertions', () => {
    it('should return true for content with status assertions', () => {
      const content = 'expect(response.status).toBe(404);';
      expect(
        UnitTestAPITestingConstants.hasErrorStatusAssertions(content)
      ).toBe(true);
    });

    it('should return false for content without status assertions', () => {
      const content = 'const x = 1;';
      expect(
        UnitTestAPITestingConstants.hasErrorStatusAssertions(content)
      ).toBe(false);
    });
  });

  describe('hasErrorHandling', () => {
    it('should return true for content with catch', () => {
      const content = 'catch(error) {}';
      expect(UnitTestAPITestingConstants.hasErrorHandling(content)).toBe(true);
    });

    it('should return true for content with .error', () => {
      const content = 'response.error';
      expect(UnitTestAPITestingConstants.hasErrorHandling(content)).toBe(true);
    });

    it('should return false for content without error handling', () => {
      const content = 'const x = 1;';
      expect(UnitTestAPITestingConstants.hasErrorHandling(content)).toBe(false);
    });
  });

  describe('hasRequestResponseValidation', () => {
    it('should return true for content with request and response validation', () => {
      const content = `
        request.send(data);
        expect(response.body).toBeDefined();
      `;
      expect(
        UnitTestAPITestingConstants.hasRequestResponseValidation(content)
      ).toBe(true);
    });

    it('should return false for content with only request', () => {
      const content = 'request.send(data);';
      expect(
        UnitTestAPITestingConstants.hasRequestResponseValidation(content)
      ).toBe(false);
    });

    it('should return false for content with only response', () => {
      const content = 'expect(response.body).toBeDefined();';
      expect(
        UnitTestAPITestingConstants.hasRequestResponseValidation(content)
      ).toBe(false);
    });
  });

  describe('hasAuthenticationTesting', () => {
    it('should return true for content with authorization header', () => {
      const content = "headers: { 'Authorization': 'Bearer token' }";
      expect(
        UnitTestAPITestingConstants.hasAuthenticationTesting(content)
      ).toBe(true);
    });

    it('should return true for content with jwt', () => {
      const content = 'const jwt = generateToken();';
      expect(
        UnitTestAPITestingConstants.hasAuthenticationTesting(content)
      ).toBe(true);
    });

    it('should return true for content with api key', () => {
      const content = "headers: { 'x-api-key': 'key123' }";
      expect(
        UnitTestAPITestingConstants.hasAuthenticationTesting(content)
      ).toBe(true);
    });

    it('should return false for content without auth testing', () => {
      const content = 'const x = 1;';
      expect(
        UnitTestAPITestingConstants.hasAuthenticationTesting(content)
      ).toBe(false);
    });
  });

  describe('isComprehensiveAPITesting', () => {
    it('should return true when has framework and 2+ components', () => {
      expect(
        UnitTestAPITestingConstants.isComprehensiveAPITesting(
          true,
          true,
          true,
          false
        )
      ).toBe(true);
    });

    it('should return true when has framework and all components', () => {
      expect(
        UnitTestAPITestingConstants.isComprehensiveAPITesting(
          true,
          true,
          true,
          true
        )
      ).toBe(true);
    });

    it('should return false when no framework', () => {
      expect(
        UnitTestAPITestingConstants.isComprehensiveAPITesting(
          false,
          true,
          true,
          true
        )
      ).toBe(false);
    });

    it('should return false when has framework but only 1 component', () => {
      expect(
        UnitTestAPITestingConstants.isComprehensiveAPITesting(
          true,
          true,
          false,
          false
        )
      ).toBe(false);
    });
  });
});
