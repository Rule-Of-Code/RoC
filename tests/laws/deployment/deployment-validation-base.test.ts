/**
 * Deployment Validation Base - Tests
 * Tests for DeploymentValidationBase class and interfaces
 */
import {
  DeploymentValidationBase,
  DeploymentValidationResult,
  DeploymentValidator,
} from '../../../src/laws/deployment/deployment-validation-base';
import type { RuleOfCodeConfig } from '../../../src/types';

// Create a concrete subclass to test protected methods
class TestableDeploymentValidation extends DeploymentValidationBase {
  static testInitializeValidation(): DeploymentValidationResult {
    return this.initializeValidation();
  }

  static testValidateChecklistFile<T>(
    projectRoot: string,
    config: RuleOfCodeConfig,
    validator: DeploymentValidator<T>,
    options: {
      missingFileMessage: string;
      missingFileSuggestion: string;
      criticalScoreDeduction?: number;
    }
  ): DeploymentValidationResult {
    return this.validateChecklistFile(projectRoot, config, validator, options);
  }
}

describe('DeploymentValidationBase', () => {
  const mockConfig: RuleOfCodeConfig = {
    project: {
      name: 'test',
      root: '',
      componentPrefix: 'app',
      type: 'generic',
    },
    ignores: { global: [], tests: [], build: [], design: [] },
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
  };

  // ============================================
  // DeploymentValidationResult interface
  // ============================================
  describe('DeploymentValidationResult interface', () => {
    it('should define violations array', () => {
      const result: DeploymentValidationResult = {
        violations: ['Violation 1'],
        suggestions: [],
        scoreDeduction: 0,
      };
      expect(result.violations).toEqual(['Violation 1']);
    });

    it('should define suggestions array', () => {
      const result: DeploymentValidationResult = {
        violations: [],
        suggestions: ['Suggestion 1'],
        scoreDeduction: 0,
      };
      expect(result.suggestions).toEqual(['Suggestion 1']);
    });

    it('should define scoreDeduction number', () => {
      const result: DeploymentValidationResult = {
        violations: [],
        suggestions: [],
        scoreDeduction: 25,
      };
      expect(result.scoreDeduction).toBe(25);
    });
  });

  // ============================================
  // initializeValidation
  // ============================================
  describe('initializeValidation()', () => {
    it('should return empty violations array', () => {
      const result = TestableDeploymentValidation.testInitializeValidation();
      expect(result.violations).toEqual([]);
    });

    it('should return empty suggestions array', () => {
      const result = TestableDeploymentValidation.testInitializeValidation();
      expect(result.suggestions).toEqual([]);
    });

    it('should return zero scoreDeduction', () => {
      const result = TestableDeploymentValidation.testInitializeValidation();
      expect(result.scoreDeduction).toBe(0);
    });

    it('should return new instance each time', () => {
      const result1 = TestableDeploymentValidation.testInitializeValidation();
      const result2 = TestableDeploymentValidation.testInitializeValidation();
      expect(result1).not.toBe(result2);
    });
  });

  // ============================================
  // validateChecklistFile
  // ============================================
  describe('validateChecklistFile()', () => {
    const defaultOptions = {
      missingFileMessage: 'Checklist file not found',
      missingFileSuggestion: 'Create the checklist file',
    };

    it('should add violation when file does not exist', () => {
      const validator: DeploymentValidator<{ exists: boolean }> = () => ({
        exists: false,
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toContain('Checklist file not found');
    });

    it('should add suggestion when file does not exist', () => {
      const validator: DeploymentValidator<{ exists: boolean }> = () => ({
        exists: false,
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.suggestions).toContain('Create the checklist file');
    });

    it('should use default score deduction of 50 when file does not exist', () => {
      const validator: DeploymentValidator<{ exists: boolean }> = () => ({
        exists: false,
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.scoreDeduction).toBe(50);
    });

    it('should use custom score deduction when specified', () => {
      const validator: DeploymentValidator<{ exists: boolean }> = () => ({
        exists: false,
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        { ...defaultOptions, criticalScoreDeduction: 30 }
      );

      expect(result.scoreDeduction).toBe(30);
    });

    it('should not add violations when file exists', () => {
      const validator: DeploymentValidator<{ exists: boolean }> = () => ({
        exists: true,
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.scoreDeduction).toBe(0);
    });

    it('should handle validator returning null', () => {
      const validator: DeploymentValidator<null> = () => null;

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toEqual([]);
    });

    it('should handle validator returning undefined', () => {
      const validator: DeploymentValidator<undefined> = () => undefined;

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toEqual([]);
    });

    it('should handle validator returning non-object', () => {
      const validator: DeploymentValidator<string> = () => 'result';

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toEqual([]);
    });

    it('should handle validator returning object without exists property', () => {
      const validator: DeploymentValidator<{ status: string }> = () => ({
        status: 'ok',
      });

      const result = TestableDeploymentValidation.testValidateChecklistFile(
        '/test',
        mockConfig,
        validator,
        defaultOptions
      );

      expect(result.violations).toEqual([]);
    });
  });
});
