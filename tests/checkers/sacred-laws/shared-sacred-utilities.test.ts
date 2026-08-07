/**
 * Shared Sacred Utilities - Tests
 * Comprehensive tests for SacredLawUtilities class
 */
import { SacredLawUtilities } from '../../../src/checkers/sacred-laws/shared-sacred-utilities';
import type { RuleOfCodeConfig } from '../../../src/types/law.types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('SacredLawUtilities', () => {
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  const createMockConfig = (): RuleOfCodeConfig => ({
    project: {
      name: 'test-project',
      root: '',
      componentPrefix: 'app',
      type: 'generic',
    },
    ignores: {
      global: ['node_modules/**', 'dist/**'],
      tests: [],
      build: [],
      design: [],
    },
    laws: { paretoMode: false, severity: {} },
    hooks: { preCommit: false, prePush: false, commitMsg: false },
    includes: { global: [] },
    excludes: {},
    reporting: {
      format: 'console',
      verbose: false,
      onlyFailures: false,
      scoring: false,
    },
    performance: {
      parallel: false,
      maxConcurrent: 3,
      cache: true,
    },
  });

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('shared-sacred-utils-test-');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
    consoleErrorSpy.mockRestore();
  });

  // ============================================
  // initializeSacredValidation()
  // ============================================
  describe('initializeSacredValidation()', () => {
    it('should return empty violations array', () => {
      const result = SacredLawUtilities.initializeSacredValidation();
      expect(result.violations).toEqual([]);
    });

    it('should return empty suggestions array', () => {
      const result = SacredLawUtilities.initializeSacredValidation();
      expect(result.suggestions).toEqual([]);
    });

    it('should return passed=true', () => {
      const result = SacredLawUtilities.initializeSacredValidation();
      expect(result.passed).toBe(true);
    });

    it('should return independent object each call', () => {
      const result1 = SacredLawUtilities.initializeSacredValidation();
      const result2 = SacredLawUtilities.initializeSacredValidation();

      result1.violations.push('test');
      expect(result2.violations.length).toBe(0);
    });
  });

  // ============================================
  // createQualityAssuranceCheck()
  // ============================================
  describe('createQualityAssuranceCheck()', () => {
    it('should return a check function', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        () => true,
        'Violation message',
        'Suggestion message'
      );

      expect(typeof checkFn).toBe('function');
    });

    it('should return passed=true when validator passes', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        () => true,
        'Violation message',
        'Suggestion message'
      );

      const result = checkFn(tempDir, createMockConfig());
      expect(result.passed).toBe(true);
      expect(result.violations!.length).toBe(0);
    });

    it('should return passed=false when validator fails', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        () => false,
        'Violation message',
        'Suggestion message'
      );

      const result = checkFn(tempDir, createMockConfig());
      expect(result.passed).toBe(false);
    });

    it('should add violation message when validator fails', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        () => false,
        'Expected violation message',
        'Suggestion'
      );

      const result = checkFn(tempDir, createMockConfig());
      expect(result.violations).toContain('Expected violation message');
    });

    it('should add suggestion message when validator fails', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        () => false,
        'Violation',
        'Expected suggestion message'
      );

      const result = checkFn(tempDir, createMockConfig());
      expect(result.suggestions).toContain('Expected suggestion message');
    });

    it('should handle validator that throws error', () => {
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'ErrorCheck',
        () => {
          throw new Error('Test error');
        },
        'Violation',
        'Suggestion'
      );

      const result = checkFn(tempDir, createMockConfig());
      expect(result.passed).toBe(false);
      expect(result.violations!.some(v => v.includes('ErrorCheck'))).toBe(true);
    });

    it('should pass projectRoot to validator', () => {
      let receivedRoot: string | null = null;
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        projectRoot => {
          receivedRoot = projectRoot;
          return true;
        },
        'Violation',
        'Suggestion'
      );

      checkFn(tempDir, createMockConfig());
      expect(receivedRoot).toBe(tempDir);
    });

    it('should pass config to validator', () => {
      let receivedConfig: RuleOfCodeConfig | null = null;
      const mockConfig = createMockConfig();
      const checkFn = SacredLawUtilities.createQualityAssuranceCheck(
        'TestCheck',
        (_root, config) => {
          receivedConfig = config;
          return true;
        },
        'Violation',
        'Suggestion'
      );

      checkFn(tempDir, mockConfig);
      expect(receivedConfig).toBe(mockConfig);
    });
  });

  // ============================================
  // createSacredLawResult()
  // ============================================
  describe('createSacredLawResult()', () => {
    it('should return a LawResult object', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        [],
        [],
        'Success message',
        'failure suffix'
      );

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('score');
    });

    it('should return passed=true when no violations', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        [],
        ['Some suggestion'],
        'Success message',
        'failure suffix'
      );

      expect(result.passed).toBe(true);
    });

    it('should return passed=false when violations exist', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['Violation 1'],
        ['Suggestion 1'],
        'Success message',
        'failure suffix'
      );

      expect(result.passed).toBe(false);
    });

    it('should use success message when no violations', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        [],
        [],
        'Custom success message',
        'failure suffix'
      );

      expect(result.message).toBe('Custom success message');
    });

    it('should include failure suffix in message when violations exist', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['V1', 'V2'],
        [],
        'Success',
        'errors found'
      );

      expect(result.message).toContain('2');
      expect(result.message).toContain('errors found');
    });

    it('should include violations in result', () => {
      const violations = ['Error A', 'Error B'];
      const result = SacredLawUtilities.createSacredLawResult(
        violations,
        [],
        'Success',
        'failure'
      );

      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions when violations exist', () => {
      const suggestions = ['Fix A', 'Fix B'];
      const result = SacredLawUtilities.createSacredLawResult(
        ['Violation'],
        suggestions,
        'Success',
        'failure'
      );

      expect(result.suggestions).toEqual(suggestions);
    });

    it('should return score 100 when no violations', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        [],
        [],
        'Success',
        'failure'
      );

      expect(result.score).toBe(100);
    });

    it('should deduct points for violations', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['V1', 'V2', 'V3'],
        [],
        'Success',
        'failure'
      );

      expect(result.score).toBeLessThan(100);
    });

    it('should accept custom base score', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        [],
        [],
        'Success',
        'failure',
        80
      );

      expect(result.score).toBe(80);
    });
  });

  // ============================================
  // checkPackageScripts()
  // ============================================
  describe('checkPackageScripts()', () => {
    it('should return violation when package.json does not exist', () => {
      const result = SacredLawUtilities.checkPackageScripts(tempDir, () => {});

      expect(result.violations).toContain('No package.json found');
    });

    it('should return suggestion when package.json does not exist', () => {
      const result = SacredLawUtilities.checkPackageScripts(tempDir, () => {});

      expect(result.suggestions!.some(s => s.includes('package.json'))).toBe(
        true
      );
    });

    it('should call checker with scripts', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          scripts: {
            test: 'jest',
            build: 'tsc',
          },
        })
      );

      let receivedScripts: Record<string, string> | null = null;
      SacredLawUtilities.checkPackageScripts(tempDir, scripts => {
        receivedScripts = scripts;
      });

      expect(receivedScripts).not.toBeNull();
      expect((receivedScripts as unknown as Record<string, string>).test).toBe(
        'jest'
      );
      expect((receivedScripts as unknown as Record<string, string>).build).toBe(
        'tsc'
      );
    });

    it('should pass empty scripts object when scripts missing', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
        })
      );

      let receivedScripts: Record<string, string> | null = null;
      SacredLawUtilities.checkPackageScripts(tempDir, scripts => {
        receivedScripts = scripts;
      });

      expect(receivedScripts).toEqual({});
    });

    it('should collect violations from checker', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          scripts: {},
        })
      );

      const result = SacredLawUtilities.checkPackageScripts(
        tempDir,
        (_scripts, violations) => {
          violations.push('Missing test script');
        }
      );

      expect(result.violations).toContain('Missing test script');
    });

    it('should collect suggestions from checker', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          scripts: {},
        })
      );

      const result = SacredLawUtilities.checkPackageScripts(
        tempDir,
        (_scripts, _violations, suggestions) => {
          suggestions.push('Add test script');
        }
      );

      expect(result.suggestions).toContain('Add test script');
    });

    it('should handle checker that throws error', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          version: '1.0.0',
          scripts: {},
        })
      );

      const result = SacredLawUtilities.checkPackageScripts(tempDir, () => {
        throw new Error('Test error');
      });

      expect(result.violations!.length).toBeGreaterThan(0);
    });

    it('should handle invalid JSON in package.json', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'package.json'),
        'not valid json'
      );

      const result = SacredLawUtilities.checkPackageScripts(tempDir, () => {});

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  // ============================================
  // checkProfessionalStandards()
  // ============================================
  describe('checkProfessionalStandards()', () => {
    it('should return passed=true when all standards pass', () => {
      const standards = [
        {
          name: 'Standard1',
          validator: () => true,
          violationMessage: 'Standard1 failed',
          suggestionMessage: 'Fix Standard1',
        },
        {
          name: 'Standard2',
          validator: () => true,
          violationMessage: 'Standard2 failed',
          suggestionMessage: 'Fix Standard2',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.passed).toBe(true);
      expect(result.violations!.length).toBe(0);
    });

    it('should return passed=false when any standard fails', () => {
      const standards = [
        {
          name: 'Standard1',
          validator: () => true,
          violationMessage: 'Standard1 failed',
          suggestionMessage: 'Fix Standard1',
        },
        {
          name: 'Standard2',
          validator: () => false,
          violationMessage: 'Standard2 failed',
          suggestionMessage: 'Fix Standard2',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.passed).toBe(false);
    });

    it('should add violation message for failed standard', () => {
      const standards = [
        {
          name: 'FailingStandard',
          validator: () => false,
          violationMessage: 'Expected violation',
          suggestionMessage: 'Suggestion',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.violations).toContain('Expected violation');
    });

    it('should add suggestion for failed standard', () => {
      const standards = [
        {
          name: 'FailingStandard',
          validator: () => false,
          violationMessage: 'Violation',
          suggestionMessage: 'Expected suggestion',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.suggestions).toContain('Expected suggestion');
    });

    it('should pass projectRoot to validator', () => {
      let receivedRoot: string | null = null;
      const standards = [
        {
          name: 'Test',
          validator: (projectRoot: string) => {
            receivedRoot = projectRoot;
            return true;
          },
          violationMessage: 'V',
          suggestionMessage: 'S',
        },
      ];

      SacredLawUtilities.checkProfessionalStandards(tempDir, standards);
      expect(receivedRoot).toBe(tempDir);
    });

    it('should handle validator that throws error', () => {
      const standards = [
        {
          name: 'ErrorStandard',
          validator: () => {
            throw new Error('Test error');
          },
          violationMessage: 'V',
          suggestionMessage: 'S',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.passed).toBe(false);
      expect(result.violations!.some(v => v.includes('ErrorStandard'))).toBe(
        true
      );
    });

    it('should handle empty standards array', () => {
      const result = SacredLawUtilities.checkProfessionalStandards(tempDir, []);
      expect(result.passed).toBe(true);
      expect(result.violations!.length).toBe(0);
    });

    it('should check multiple failing standards', () => {
      const standards = [
        {
          name: 'S1',
          validator: () => false,
          violationMessage: 'Violation 1',
          suggestionMessage: 'Suggestion 1',
        },
        {
          name: 'S2',
          validator: () => false,
          violationMessage: 'Violation 2',
          suggestionMessage: 'Suggestion 2',
        },
      ];

      const result = SacredLawUtilities.checkProfessionalStandards(
        tempDir,
        standards
      );
      expect(result.violations!.length).toBe(2);
      expect(result.suggestions!.length).toBe(2);
    });
  });

  // ============================================
  // executeComplianceMonitoring()
  // ============================================
  describe('executeComplianceMonitoring()', () => {
    it('should return passed=true when all checks pass', () => {
      const checks = [
        {
          name: 'Check1',
          check: () => ({ passed: true }),
        },
        {
          name: 'Check2',
          check: () => ({ passed: true }),
        },
      ];

      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        checks
      );
      expect(result.passed).toBe(true);
    });

    it('should return passed=false when any check fails', () => {
      const checks = [
        {
          name: 'Check1',
          check: () => ({ passed: true }),
        },
        {
          name: 'Check2',
          check: () => ({ passed: false }),
        },
      ];

      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        checks
      );
      expect(result.passed).toBe(false);
    });

    it('should include custom message from failed check', () => {
      const checks = [
        {
          name: 'FailedCheck',
          check: () => ({ passed: false, message: 'Custom failure message' }),
        },
      ];

      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        checks
      );
      expect(result.violations).toContain('Custom failure message');
    });

    it('should include custom suggestion from failed check', () => {
      const checks = [
        {
          name: 'FailedCheck',
          check: () => ({ passed: false, suggestion: 'Custom suggestion' }),
        },
      ];

      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        checks
      );
      expect(result.suggestions).toContain('Custom suggestion');
    });

    it('should use default message when none provided', () => {
      const checks = [
        {
          name: 'TestCheck',
          check: () => ({ passed: false }),
        },
      ];

      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        checks
      );
      expect(result.violations!.some(v => v.includes('TestCheck'))).toBe(true);
    });

    it('should pass projectRoot to check function', () => {
      let receivedRoot: string | null = null;
      const checks = [
        {
          name: 'Test',
          check: (projectRoot: string) => {
            receivedRoot = projectRoot;
            return { passed: true };
          },
        },
      ];

      SacredLawUtilities.executeComplianceMonitoring(tempDir, checks);
      expect(receivedRoot).toBe(tempDir);
    });

    it('should handle empty checks array', () => {
      const result = SacredLawUtilities.executeComplianceMonitoring(
        tempDir,
        []
      );
      expect(result.passed).toBe(true);
    });
  });

  // ============================================
  // Edge Cases
  // ============================================
  describe('Edge Cases', () => {
    it('should handle special characters in messages', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['Error with "quotes" and <angle>'],
        ['Suggestion with & ampersand'],
        'Success',
        'failure'
      );

      expect(result.violations![0]).toContain('"quotes"');
      expect(result.suggestions![0]).toContain('& ampersand');
    });

    it('should handle unicode in messages', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['Érrör with ünicode 🔥'],
        ['Süggèstiön'],
        'Success',
        'failure'
      );

      expect(result.violations![0]).toContain('🔥');
    });

    it('should handle empty string violations', () => {
      const result = SacredLawUtilities.createSacredLawResult(
        ['', 'Valid', ''],
        [],
        'Success',
        'failure'
      );

      expect(result.violations!.length).toBe(3);
    });
  });
});
