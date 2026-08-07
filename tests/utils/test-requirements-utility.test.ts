/**
 * @fileoverview Tests for test-requirements-utility.ts
 * @description Tests for test requirements checking utilities
 */

import {
  TestingRequirement,
  TestRequirementsUtility,
} from '../../src/utils/test-requirements-utility';

describe('utils/test-requirements-utility', () => {
  describe('COMMON_TEST_REQUIREMENTS', () => {
    it('should have apiTesting requirement', () => {
      const apiTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['apiTesting'];
      expect(apiTesting).toBeDefined();
      expect(apiTesting?.name).toBe('API Testing');
    });

    it('should have performanceTesting requirement', () => {
      const performanceTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['performanceTesting'];
      expect(performanceTesting).toBeDefined();
    });

    it('should have securityTesting requirement as mandatory', () => {
      const securityTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['securityTesting'];
      expect(securityTesting?.isMandatory).toBe(true);
    });

    it('should have unitTesting requirement as mandatory', () => {
      const unitTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['unitTesting'];
      expect(unitTesting?.isMandatory).toBe(true);
    });

    it('should have integrationTesting requirement', () => {
      const integrationTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['integrationTesting'];
      expect(integrationTesting).toBeDefined();
    });

    it('should have e2eTesting requirement', () => {
      const e2eTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['e2eTesting'];
      expect(e2eTesting).toBeDefined();
    });

    it('should have pattern for each requirement', () => {
      Object.values(TestRequirementsUtility.COMMON_TEST_REQUIREMENTS).forEach(
        req => {
          expect(req.pattern).toBeInstanceOf(RegExp);
        }
      );
    });

    it('should have description for each requirement', () => {
      Object.values(TestRequirementsUtility.COMMON_TEST_REQUIREMENTS).forEach(
        req => {
          expect(typeof req.description).toBe('string');
          expect(req.description.length).toBeGreaterThan(0);
        }
      );
    });
  });

  describe('validateRequirement', () => {
    it('should return met: true when content matches pattern', () => {
      const requirement: TestingRequirement = {
        name: 'API Testing',
        pattern: /api/i,
        isMandatory: false,
        description: 'Test description',
      };

      const result = TestRequirementsUtility.validateRequirement(
        'testing api endpoints',
        requirement
      );

      expect(result.met).toBe(true);
    });

    it('should return met: false when content does not match pattern', () => {
      const requirement: TestingRequirement = {
        name: 'API Testing',
        pattern: /api/i,
        isMandatory: false,
        description: 'Test description',
      };

      const result = TestRequirementsUtility.validateRequirement(
        'testing unit functions',
        requirement
      );

      expect(result.met).toBe(false);
    });

    it('should return violation and suggestion for unmet mandatory requirement', () => {
      const requirement: TestingRequirement = {
        name: 'Security Testing',
        pattern: /security/i,
        isMandatory: true,
        description: 'Security tests required',
      };

      const result = TestRequirementsUtility.validateRequirement(
        'no matching content',
        requirement
      );

      expect(result.met).toBe(false);
      expect(result.violation).toContain('Security Testing');
      expect(result.suggestion).toContain('Security Testing');
    });

    it('should not return violation for unmet optional requirement', () => {
      const requirement: TestingRequirement = {
        name: 'Performance Testing',
        pattern: /performance/i,
        isMandatory: false,
        description: 'Optional performance tests',
      };

      const result = TestRequirementsUtility.validateRequirement(
        'no matching content',
        requirement
      );

      expect(result.met).toBe(false);
      expect(result.violation).toBeUndefined();
      expect(result.suggestion).toBeUndefined();
    });

    it('should be case insensitive for common requirements', () => {
      const apiTesting =
        TestRequirementsUtility.COMMON_TEST_REQUIREMENTS['apiTesting'];
      if (apiTesting) {
        const result = TestRequirementsUtility.validateRequirement(
          'API ENDPOINT TESTING',
          apiTesting
        );
        expect(result.met).toBe(true);
      }
    });
  });

  describe('getMissingMandatoryRequirements', () => {
    it('should return empty array when all mandatory requirements are met', () => {
      const content = 'security testing with unit test and .spec.ts files';

      const missing =
        TestRequirementsUtility.getMissingMandatoryRequirements(content);

      expect(missing).toEqual([]);
    });

    it('should return missing mandatory requirements', () => {
      const content = 'just some random content';

      const missing =
        TestRequirementsUtility.getMissingMandatoryRequirements(content);

      expect(missing.length).toBeGreaterThan(0);
      expect(missing.every(r => r.isMandatory)).toBe(true);
    });

    it('should accept custom requirements array', () => {
      const customRequirements: TestingRequirement[] = [
        {
          name: 'Custom Test',
          pattern: /custom/i,
          isMandatory: true,
          description: 'Custom requirement',
        },
      ];

      const missing = TestRequirementsUtility.getMissingMandatoryRequirements(
        'no match',
        customRequirements
      );

      expect(missing).toHaveLength(1);
      expect(missing[0]?.name).toBe('Custom Test');
    });

    it('should return empty array when custom requirements are met', () => {
      const customRequirements: TestingRequirement[] = [
        {
          name: 'Custom Test',
          pattern: /custom/i,
          isMandatory: true,
          description: 'Custom requirement',
        },
      ];

      const missing = TestRequirementsUtility.getMissingMandatoryRequirements(
        'this has custom content',
        customRequirements
      );

      expect(missing).toHaveLength(0);
    });
  });

  describe('createMissingCoverageViolation', () => {
    it('should create violation with threshold', () => {
      const result = TestRequirementsUtility.createMissingCoverageViolation(80);

      expect(result.violation).toContain('80%');
      expect(result.suggestion).toContain('80%');
    });

    it('should create violation with different thresholds', () => {
      const result50 =
        TestRequirementsUtility.createMissingCoverageViolation(50);
      const result90 =
        TestRequirementsUtility.createMissingCoverageViolation(90);

      expect(result50.violation).toContain('50%');
      expect(result90.violation).toContain('90%');
    });

    it('should mention test coverage in violation', () => {
      const result = TestRequirementsUtility.createMissingCoverageViolation(75);

      expect(result.violation.toLowerCase()).toContain('coverage');
    });
  });

  describe('createMissingTestFilesViolation', () => {
    it('should create violation with pattern', () => {
      const result =
        TestRequirementsUtility.createMissingTestFilesViolation('**/*.spec.ts');

      expect(result.violation).toContain('**/*.spec.ts');
      expect(result.suggestion).toContain('**/*.spec.ts');
    });

    it('should mention test files in violation', () => {
      const result =
        TestRequirementsUtility.createMissingTestFilesViolation('*.test.ts');

      expect(result.violation.toLowerCase()).toContain('test files');
    });
  });

  describe('TEST_FILE_PATTERNS', () => {
    it('should have unit test patterns', () => {
      expect(TestRequirementsUtility.TEST_FILE_PATTERNS.unit).toBeDefined();
      expect(
        Array.isArray(TestRequirementsUtility.TEST_FILE_PATTERNS.unit)
      ).toBe(true);
    });

    it('should have integration test patterns', () => {
      expect(
        TestRequirementsUtility.TEST_FILE_PATTERNS.integration
      ).toBeDefined();
    });

    it('should have e2e test patterns', () => {
      expect(TestRequirementsUtility.TEST_FILE_PATTERNS.e2e).toBeDefined();
    });

    it('should have performance test patterns', () => {
      expect(
        TestRequirementsUtility.TEST_FILE_PATTERNS.performance
      ).toBeDefined();
    });

    it('should have glob patterns for each type', () => {
      Object.values(TestRequirementsUtility.TEST_FILE_PATTERNS).forEach(
        patterns => {
          expect(patterns.length).toBeGreaterThan(0);
          patterns.forEach(p => {
            expect(typeof p).toBe('string');
          });
        }
      );
    });
  });

  describe('getRequirementViolations', () => {
    it('should return empty violations when all requirements are met', () => {
      const content =
        'security testing unit test api endpoint performance integration e2e';

      const result = TestRequirementsUtility.getRequirementViolations(
        content,
        false
      );

      expect(result.violations).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should return violations for unmet mandatory requirements', () => {
      const content = 'no relevant content';

      const result = TestRequirementsUtility.getRequirementViolations(
        content,
        true
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.suggestions.length).toBe(result.violations.length);
    });

    it('should check only mandatory when isMandatoryOnly is true', () => {
      const content = 'security testing and unit test with .spec.ts';

      const result = TestRequirementsUtility.getRequirementViolations(
        content,
        true
      );

      expect(result.violations).toHaveLength(0);
    });

    it('should return same number of violations and suggestions', () => {
      const content = '';

      const result = TestRequirementsUtility.getRequirementViolations(
        content,
        false
      );

      expect(result.violations.length).toBe(result.suggestions.length);
    });
  });
});
