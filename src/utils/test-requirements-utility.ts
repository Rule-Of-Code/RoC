/**
 * Test Requirements Utility
 * Consolidates duplicate patterns for test requirement checking
 */

export interface TestingRequirement {
  name: string;
  pattern: RegExp;
  isMandatory: boolean;
  description: string;
}

export class TestRequirementsUtility {
  /**
   * Common testing requirements used across multiple checkers
   */
  static readonly COMMON_TEST_REQUIREMENTS: Record<string, TestingRequirement> =
    {
      apiTesting: {
        name: 'API Testing',
        pattern: /api|endpoint|request|response/i,
        isMandatory: false,
        description: 'Tests for API endpoints and request/response handling',
      },
      performanceTesting: {
        name: 'Performance Testing',
        pattern: /performance|load|stress|benchmark/i,
        isMandatory: false,
        description: 'Tests for performance metrics and load handling',
      },
      securityTesting: {
        name: 'Security Testing',
        pattern: /security|auth|xss|sql.*injection|csrf/i,
        isMandatory: true,
        description: 'Tests for security vulnerabilities',
      },
      unitTesting: {
        name: 'Unit Testing',
        pattern: /unit.*test|\.spec\.ts|\.test\.ts/i,
        isMandatory: true,
        description: 'Unit tests for individual functions and methods',
      },
      integrationTesting: {
        name: 'Integration Testing',
        pattern: /integration.*test|\.integration\./i,
        isMandatory: false,
        description: 'Integration tests for multiple components',
      },
      e2eTesting: {
        name: 'E2E Testing',
        pattern: /e2e|end.*to.*end|\.e2e\./i,
        isMandatory: false,
        description: 'End-to-end tests for complete workflows',
      },
    };

  /**
   * Validates if a requirement is met
   */
  static validateRequirement(
    content: string,
    requirement: TestingRequirement
  ): { met: boolean; violation?: string; suggestion?: string } {
    const met = requirement.pattern.test(content);

    if (!met && requirement.isMandatory) {
      return {
        met: false,
        violation: `Missing ${requirement.name}: ${requirement.description}`,
        suggestion: `Add ${requirement.name} to project`,
      };
    }

    return { met };
  }

  /**
   * Gets all missing mandatory requirements
   */
  static getMissingMandatoryRequirements(
    content: string,
    requirements: TestingRequirement[] = Object.values(
      this.COMMON_TEST_REQUIREMENTS
    )
  ): TestingRequirement[] {
    return requirements.filter(
      req => req.isMandatory && !req.pattern.test(content)
    );
  }

  /**
   * Creates standard violation for missing test coverage
   */
  static createMissingCoverageViolation(threshold: number): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `Test coverage below ${threshold}%`,
      suggestion: `Increase test coverage to ${threshold}% or higher`,
    };
  }

  /**
   * Creates standard violation for missing test files
   */
  static createMissingTestFilesViolation(pattern: string): {
    violation: string;
    suggestion: string;
  } {
    return {
      violation: `No test files matching pattern: ${pattern}`,
      suggestion: `Create test files matching pattern: ${pattern}`,
    };
  }

  /**
   * Standard patterns for test file locations
   */
  static readonly TEST_FILE_PATTERNS = {
    unit: ['**/*.spec.ts', '**/*.test.ts', '**/tests/**/*.ts'],
    integration: ['**/*.integration.ts', '**/integration-tests/**/*.ts'],
    e2e: ['**/*.e2e.ts', '**/e2e/**/*.ts'],
    performance: ['**/*.perf.ts', '**/performance-tests/**/*.ts'],
  };

  /**
   * Gets violations for test requirements
   */
  static getRequirementViolations(
    content: string,
    isMandatoryOnly = false
  ): { violations: string[]; suggestions: string[] } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const requirements = isMandatoryOnly
      ? Object.values(this.COMMON_TEST_REQUIREMENTS).filter(r => r.isMandatory)
      : Object.values(this.COMMON_TEST_REQUIREMENTS);

    for (const req of requirements) {
      const result = this.validateRequirement(content, req);
      if (!result.met && result.violation && result.suggestion) {
        violations.push(result.violation);
        suggestions.push(result.suggestion);
      }
    }

    return { violations, suggestions };
  }
}
