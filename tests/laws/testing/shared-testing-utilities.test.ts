/**
 * Tests for TestingLawUtilities
 *
 * Tests shared testing law utilities for result creation and processing.
 */
import type { RuleOfCodeConfig } from '../../../src/config/types';
import {
  TestingLawUtilities,
  type CreateTestResultOptions,
} from '../../../src/laws/testing/shared-testing-utilities';
import { FileUtils } from '../../../src/utils/file-utils';

describe('TestingLawUtilities', () => {
  let mockConfig: RuleOfCodeConfig;

  beforeEach(() => {
    mockConfig = FileUtils.getMinimalDefaultConfig();
  });

  describe('createTestResult', () => {
    it('should create passed result when no violations exist', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: 100,
        analysisData: { testCount: 5 },
        config: mockConfig,
        messageGenerator: () => '✅ All tests passed',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.message).toBe('✅ All tests passed');
      expect(result.violations).toEqual([]);
      expect(result.suggestions).toEqual([]);
    });

    it('should create failed result when violations exist', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: ['Violation 1', 'Violation 2'],
        suggestions: ['Suggestion 1'],
        score: 60,
        analysisData: { testCount: 0 },
        config: mockConfig,
        messageGenerator: () => '⚠️ Issues found',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.passed).toBe(false);
      expect(result.score).toBe(60);
      expect(result.violations).toEqual(['Violation 1', 'Violation 2']);
      expect(result.suggestions).toEqual(['Suggestion 1']);
    });

    it('should call message generator with violations and analysis data', () => {
      const messageGenerator = jest.fn().mockReturnValue('Generated message');
      const analysisData = { testCount: 3 };
      const violations = ['Error 1'];

      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations,
        suggestions: [],
        score: 80,
        analysisData,
        config: mockConfig,
        messageGenerator,
      };

      TestingLawUtilities.createTestResult(options);

      expect(messageGenerator).toHaveBeenCalledWith(violations, analysisData);
    });

    it('should combine violations and suggestions in details', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: ['Violation A'],
        suggestions: ['Suggestion B', 'Suggestion C'],
        score: 70,
        analysisData: {},
        config: mockConfig,
        messageGenerator: () => 'Message',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.details).toEqual([
        'Violation A',
        'Suggestion B',
        'Suggestion C',
      ]);
    });

    it('should cap score at minimum 0', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: -50,
        analysisData: {},
        config: mockConfig,
        messageGenerator: () => 'Message',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.score).toBe(0);
    });

    it('should set fixable to true', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: 100,
        analysisData: {},
        config: mockConfig,
        messageGenerator: () => 'Message',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.fixable).toBe(true);
    });

    it('should preserve config in result', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: 100,
        analysisData: {},
        config: mockConfig,
        messageGenerator: () => 'Message',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.config).toBe(mockConfig);
    });

    it('should handle empty details arrays', () => {
      const options: CreateTestResultOptions = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: 100,
        analysisData: {},
        config: mockConfig,
        messageGenerator: () => 'Message',
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.details).toEqual([]);
    });

    it('should handle generic analysis data types', () => {
      interface CustomData {
        files: string[];
        coverage: number;
      }

      const analysisData: CustomData = {
        files: ['file1.ts', 'file2.ts'],
        coverage: 85,
      };

      const options: CreateTestResultOptions<CustomData> = {
        lawName: 'Test Law',
        violations: [],
        suggestions: [],
        score: 100,
        analysisData,
        config: mockConfig,
        messageGenerator: (_v, data) => `Coverage: ${data.coverage}%`,
      };

      const result = TestingLawUtilities.createTestResult(options);

      expect(result.message).toBe('Coverage: 85%');
    });
  });

  describe('createTestingErrorResult', () => {
    it('should create error result with Error instance', () => {
      const error = new Error('Test error message');

      const result = TestingLawUtilities.createTestingErrorResult(
        'Test Law',
        error,
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.message).toContain('Test Law');
      expect(result.message).toContain('Error');
    });

    it('should create error result with string error', () => {
      const error = 'String error message';

      const result = TestingLawUtilities.createTestingErrorResult(
        'Test Law',
        error,
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should create error result with unknown error type', () => {
      const error = { custom: 'error object' };

      const result = TestingLawUtilities.createTestingErrorResult(
        'Test Law',
        error,
        mockConfig
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
    });

    it('should preserve config in error result', () => {
      const error = new Error('Test');

      const result = TestingLawUtilities.createTestingErrorResult(
        'Test Law',
        error,
        mockConfig
      );

      expect(result.config).toBe(mockConfig);
    });
  });

  describe('processViolation', () => {
    it('should add violation and suggestion with default score reduction', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const score = 100;

      const newScore = TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Test violation',
        suggestionMessage: 'Test suggestion',
      });

      expect(violations).toContain('Test violation');
      expect(suggestions).toContain('Test suggestion');
      expect(newScore).toBe(90);
    });

    it('should use custom score reduction', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const score = 100;

      const newScore = TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Test violation',
        scoreReduction: 25,
      });

      expect(newScore).toBe(75);
    });

    it('should add only violation without suggestion', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const score = 100;

      TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Test violation',
      });

      expect(violations).toContain('Test violation');
      expect(suggestions).toEqual([]);
    });

    it('should append to existing arrays', () => {
      const violations: string[] = ['Existing violation'];
      const suggestions: string[] = ['Existing suggestion'];
      const score = 80;

      TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'New violation',
        suggestionMessage: 'New suggestion',
      });

      expect(violations).toEqual(['Existing violation', 'New violation']);
      expect(suggestions).toEqual(['Existing suggestion', 'New suggestion']);
    });

    it('should handle multiple chained calls', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      let score = 100;

      score = TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Violation 1',
        scoreReduction: 15,
      });

      score = TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Violation 2',
        scoreReduction: 20,
      });

      expect(violations).toEqual(['Violation 1', 'Violation 2']);
      expect(score).toBe(65);
    });

    it('should handle zero score reduction', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const score = 100;

      const newScore = TestingLawUtilities.processViolation({
        violations,
        suggestions,
        score,
        violationMessage: 'Warning only',
        scoreReduction: 0,
      });

      expect(newScore).toBe(100);
      expect(violations).toContain('Warning only');
    });
  });
});
