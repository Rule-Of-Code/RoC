/**
 * Tests for DeploymentValidationUtilities
 *
 * Comprehensive tests for shared deployment validation utilities
 */
import { DeploymentValidationUtilities } from '../../../src/laws/deployment/shared-deployment-utilities';
import type { LawCheckContext, RuleOfCodeConfig } from '../../../src/types';
import { FileUtils } from '../../../src/utils/file-utils';
import { PathOperations } from '../../../src/utils/path-operations';

describe('DeploymentValidationUtilities', () => {
  let tempDir: string;
  let mockConfig: RuleOfCodeConfig;
  let mockContext: LawCheckContext;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('deployment-utils-test-');
    mockConfig = {
      project: {
        name: 'test-project',
        root: tempDir,
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
    mockContext = {
      projectRoot: tempDir,
      config: mockConfig,
    };
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('initializeDeploymentValidation()', () => {
    it('should return an object with violations array', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(Array.isArray(result.violations)).toBe(true);
    });

    it('should return an object with suggestions array', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should return an object with scoreDeduction number', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(typeof result.scoreDeduction).toBe('number');
    });

    it('should return empty violations array', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(result.violations).toEqual([]);
    });

    it('should return empty suggestions array', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(result.suggestions).toEqual([]);
    });

    it('should return zero scoreDeduction', () => {
      const result =
        DeploymentValidationUtilities.initializeDeploymentValidation();
      expect(result.scoreDeduction).toBe(0);
    });
  });

  describe('validateChecklistDocument()', () => {
    it('should return violations when checklist does not exist', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: false },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
      });
      expect(result.violations).toContain('Missing pre-deployment checklist');
    });

    it('should return score deduction when checklist does not exist', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: false },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
      });
      expect(result.scoreDeduction).toBe(30);
    });

    it('should return suggestions when checklist does not exist', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: false },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
      });
      expect(result.suggestions).toContain(
        'Create comprehensive Pre-Deployment with validation steps'
      );
    });

    it('should return no violations when checklist exists and is complete', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: true, isComplete: true },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
      });
      expect(result.violations).toEqual([]);
    });

    it('should return incomplete violation when checklist exists but incomplete', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: true, isComplete: false },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
        incompleteMessage: 'Pre-deployment checklist incomplete',
        incompleteScore: 15,
      });
      expect(result.violations).toContain(
        'Pre-deployment checklist incomplete'
      );
    });

    it('should return incomplete score deduction when checklist incomplete', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: true, isComplete: false },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
        incompleteMessage: 'Pre-deployment checklist incomplete',
        incompleteScore: 15,
      });
      expect(result.scoreDeduction).toBe(15);
    });

    it('should return zero score deduction when checklist complete', () => {
      const result = DeploymentValidationUtilities.validateChecklistDocument({
        checklistName: 'Pre-Deployment',
        checklistStatus: { exists: true, isComplete: true },
        missingMessage: 'Missing pre-deployment checklist',
        missingScore: 30,
      });
      expect(result.scoreDeduction).toBe(0);
    });
  });

  describe('createDeploymentResult()', () => {
    it('should return passed true when no violations', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        100,
        mockConfig
      );
      expect(result.passed).toBe(true);
    });

    it('should return passed false when violations exist', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        ['Violation 1'],
        [],
        80,
        mockConfig
      );
      expect(result.passed).toBe(false);
    });

    it('should return correct message when passed', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        100,
        mockConfig
      );
      expect(result.message).toBe('TestLaw compliance verified');
    });

    it('should return correct message when violations exist', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        ['Violation 1', 'Violation 2'],
        [],
        60,
        mockConfig
      );
      expect(result.message).toBe(
        'TestLaw violations found: 2 critical issues'
      );
    });

    it('should combine violations and suggestions in details', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        ['Violation 1'],
        ['Suggestion 1'],
        80,
        mockConfig
      );
      expect(result.details).toEqual(['Violation 1', 'Suggestion 1']);
    });

    it('should include violations array', () => {
      const violations = ['Violation 1', 'Violation 2'];
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        violations,
        [],
        80,
        mockConfig
      );
      expect(result.violations).toEqual(violations);
    });

    it('should include suggestions array', () => {
      const suggestions = ['Suggestion 1', 'Suggestion 2'];
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        suggestions,
        100,
        mockConfig
      );
      expect(result.suggestions).toEqual(suggestions);
    });

    it('should include score', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        85,
        mockConfig
      );
      expect(result.score).toBe(85);
    });

    it('should clamp score to minimum 0', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        -10,
        mockConfig
      );
      expect(result.score).toBe(0);
    });

    it('should include fixable as true', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        100,
        mockConfig
      );
      expect(result.fixable).toBe(true);
    });

    it('should include config', () => {
      const result = DeploymentValidationUtilities.createDeploymentResult(
        'TestLaw',
        [],
        [],
        100,
        mockConfig
      );
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('validateChecklistGeneric()', () => {
    it('should call checklistValidator with projectRoot and config', () => {
      const validatorSpy = jest.fn().mockReturnValue({ isValid: true });
      const processSpy = jest.fn().mockReturnValue(0);

      DeploymentValidationUtilities.validateChecklistGeneric(
        tempDir,
        mockConfig,
        validatorSpy,
        processSpy
      );

      expect(validatorSpy).toHaveBeenCalledWith(tempDir, mockConfig);
    });

    it('should call processChecklistStatus with validator result', () => {
      const validatorResult = { isValid: true, items: [] };
      const validatorSpy = jest.fn().mockReturnValue(validatorResult);
      const processSpy = jest.fn().mockReturnValue(0);

      DeploymentValidationUtilities.validateChecklistGeneric(
        tempDir,
        mockConfig,
        validatorSpy,
        processSpy
      );

      expect(processSpy).toHaveBeenCalledWith(validatorResult, [], []);
    });

    it('should return violations from processor', () => {
      const validatorSpy = jest.fn().mockReturnValue({ isValid: false });
      const processSpy = jest.fn((status, violations) => {
        violations.push('Test violation');
        return 10;
      });

      const result = DeploymentValidationUtilities.validateChecklistGeneric(
        tempDir,
        mockConfig,
        validatorSpy,
        processSpy
      );

      expect(result.violations).toContain('Test violation');
    });

    it('should return suggestions from processor', () => {
      const validatorSpy = jest.fn().mockReturnValue({ isValid: false });
      const processSpy = jest.fn((status, violations, suggestions) => {
        suggestions.push('Test suggestion');
        return 10;
      });

      const result = DeploymentValidationUtilities.validateChecklistGeneric(
        tempDir,
        mockConfig,
        validatorSpy,
        processSpy
      );

      expect(result.suggestions).toContain('Test suggestion');
    });

    it('should return scoreDeduction from processor', () => {
      const validatorSpy = jest.fn().mockReturnValue({ isValid: false });
      const processSpy = jest.fn().mockReturnValue(25);

      const result = DeploymentValidationUtilities.validateChecklistGeneric(
        tempDir,
        mockConfig,
        validatorSpy,
        processSpy
      );

      expect(result.scoreDeduction).toBe(25);
    });
  });

  describe('createDeploymentErrorResult()', () => {
    it('should return passed false', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.passed).toBe(false);
    });

    it('should include error message in message', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.message).toContain('Test error');
    });

    it('should include law name in message', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.message).toContain('TestLaw');
    });

    it('should include error in details', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.details).toContain('Error: Test error');
    });

    it('should include violation about check failure', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.violations).toContain('TestLaw check failed due to error');
    });

    it('should include suggestion to review implementation', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.suggestions).toContain(
        'Review TestLaw implementation and fix any issues'
      );
    });

    it('should return score 0', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.score).toBe(0);
    });

    it('should return fixable false', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.fixable).toBe(false);
    });

    it('should handle non-Error objects', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        'String error',
        mockConfig
      );
      expect(result.message).toContain('Unknown error');
    });

    it('should handle null error', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        null,
        mockConfig
      );
      expect(result.message).toContain('Unknown error');
    });

    it('should include config', () => {
      const result = DeploymentValidationUtilities.createDeploymentErrorResult(
        'TestLaw',
        new Error('Test error'),
        mockConfig
      );
      expect(result.config).toBe(mockConfig);
    });
  });

  describe('createStandardValidation()', () => {
    it('should return a validation function', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const processFn = jest.fn().mockReturnValue(0);

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      expect(typeof validationFn).toBe('function');
    });

    it('should call validatorFunction with projectRoot and context', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: true });
      const processFn = jest.fn().mockReturnValue(0);

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      validationFn(tempDir, mockContext);

      expect(validatorFn).toHaveBeenCalledWith(tempDir, mockContext);
    });

    it('should call processResults with validation result', () => {
      const validationResult = { valid: true, data: 'test' };
      const validatorFn = jest.fn().mockReturnValue(validationResult);
      const processFn = jest.fn().mockReturnValue(0);

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      validationFn(tempDir, mockContext);

      expect(processFn).toHaveBeenCalledWith(validationResult, [], []);
    });

    it('should return violations from processor', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: false });
      const processFn = jest.fn((result, violations) => {
        violations.push('Standard violation');
        return 10;
      });

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      const result = validationFn(tempDir, mockContext);

      expect(result.violations).toContain('Standard violation');
    });

    it('should return suggestions from processor', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: false });
      const processFn = jest.fn((result, violations, suggestions) => {
        suggestions.push('Standard suggestion');
        return 10;
      });

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      const result = validationFn(tempDir, mockContext);

      expect(result.suggestions).toContain('Standard suggestion');
    });

    it('should return scoreDeduction from processor', () => {
      const validatorFn = jest.fn().mockReturnValue({ valid: false });
      const processFn = jest.fn().mockReturnValue(15);

      const validationFn =
        DeploymentValidationUtilities.createStandardValidation(
          validatorFn,
          processFn
        );

      const result = validationFn(tempDir, mockContext);

      expect(result.scoreDeduction).toBe(15);
    });
  });

  describe('checkCICDFiles()', () => {
    it('should return found false when no files exist', () => {
      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml', '.gitlab-ci.yml'],
        () => true
      );
      expect(result.found).toBe(false);
    });

    it('should return found true when file exists and passes validation', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI'
      );

      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml'],
        () => true
      );

      expect(result.found).toBe(true);
    });

    it('should return filePath when found', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI'
      );

      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml'],
        () => true
      );

      expect(result.filePath).toBe(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml')
      );
    });

    it('should return found false when file exists but fails validation', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI'
      );

      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml'],
        () => false
      );

      expect(result.found).toBe(false);
    });

    it('should pass content to validator', () => {
      FileUtils.createDirectory(
        PathOperations.join(tempDir, '.github', 'workflows')
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.github', 'workflows', 'ci.yml'),
        'name: CI\njobs: test'
      );

      const validatorSpy = jest.fn().mockReturnValue(true);

      DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml'],
        validatorSpy
      );

      expect(validatorSpy).toHaveBeenCalledWith('name: CI\njobs: test');
    });

    it('should check multiple files and return first match', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, '.gitlab-ci.yml'),
        'stages: test'
      );

      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml', '.gitlab-ci.yml'],
        () => true
      );

      expect(result.found).toBe(true);
      expect(result.filePath).toBe(
        PathOperations.join(tempDir, '.gitlab-ci.yml')
      );
    });

    it('should continue checking files if one fails', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'bitbucket-pipelines.yml'),
        'pipelines: default'
      );

      const result = DeploymentValidationUtilities.checkCICDFiles(
        tempDir,
        ['.github/workflows/ci.yml', 'bitbucket-pipelines.yml'],
        () => true
      );

      expect(result.found).toBe(true);
    });
  });

  describe('findHealthCheckFiles()', () => {
    it('should return empty array when no files exist', () => {
      const result = DeploymentValidationUtilities.findHealthCheckFiles(
        tempDir,
        ['src/health.ts', 'src/healthcheck.ts']
      );
      expect(result).toEqual([]);
    });

    it('should return found file paths', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const health = () => "ok";'
      );

      const result = DeploymentValidationUtilities.findHealthCheckFiles(
        tempDir,
        ['src/health.ts', 'src/healthcheck.ts']
      );

      expect(result).toContain(
        PathOperations.join(tempDir, 'src', 'health.ts')
      );
    });

    it('should return multiple found files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const health = () => "ok";'
      );
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'healthcheck.ts'),
        'export const healthcheck = () => "ok";'
      );

      const result = DeploymentValidationUtilities.findHealthCheckFiles(
        tempDir,
        ['src/health.ts', 'src/healthcheck.ts']
      );

      expect(result.length).toBe(2);
      expect(result).toContain(
        PathOperations.join(tempDir, 'src', 'health.ts')
      );
      expect(result).toContain(
        PathOperations.join(tempDir, 'src', 'healthcheck.ts')
      );
    });

    it('should not return non-existent files', () => {
      FileUtils.createDirectory(PathOperations.join(tempDir, 'src'));
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'src', 'health.ts'),
        'export const health = () => "ok";'
      );

      const result = DeploymentValidationUtilities.findHealthCheckFiles(
        tempDir,
        ['src/health.ts', 'src/nonexistent.ts']
      );

      expect(result.length).toBe(1);
      expect(result).not.toContain(
        PathOperations.join(tempDir, 'src', 'nonexistent.ts')
      );
    });
  });

  describe('searchFilesWithPatterns()', () => {
    it('should return found false when no files exist', () => {
      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml', 'settings.yml'],
        [/healthCheck:/]
      );
      expect(result.found).toBe(false);
    });

    it('should return found true when file matches pattern', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'config.yml'),
        'healthCheck: enabled\nport: 3000'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml'],
        [/healthCheck:/]
      );

      expect(result.found).toBe(true);
    });

    it('should return filePath when match found', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'config.yml'),
        'healthCheck: enabled'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml'],
        [/healthCheck:/]
      );

      expect(result.filePath).toBe(PathOperations.join(tempDir, 'config.yml'));
    });

    it('should return found false when pattern does not match', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'config.yml'),
        'port: 3000\nhost: localhost'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml'],
        [/healthCheck:/]
      );

      expect(result.found).toBe(false);
    });

    it('should match any of multiple patterns', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'config.yml'),
        'livenessProbe: enabled'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml'],
        [/healthCheck:/, /livenessProbe:/, /readinessProbe:/]
      );

      expect(result.found).toBe(true);
    });

    it('should search multiple files and return first match', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'settings.yml'),
        'healthCheck: enabled'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['config.yml', 'settings.yml'],
        [/healthCheck:/]
      );

      expect(result.found).toBe(true);
      expect(result.filePath).toBe(
        PathOperations.join(tempDir, 'settings.yml')
      );
    });

    it('should continue checking files if one does not exist', () => {
      FileUtils.writeFile(
        PathOperations.join(tempDir, 'second.yml'),
        'healthCheck: enabled'
      );

      const result = DeploymentValidationUtilities.searchFilesWithPatterns(
        tempDir,
        ['first.yml', 'second.yml'],
        [/healthCheck:/]
      );

      expect(result.found).toBe(true);
      expect(result.filePath).toBe(PathOperations.join(tempDir, 'second.yml'));
    });
  });
});
