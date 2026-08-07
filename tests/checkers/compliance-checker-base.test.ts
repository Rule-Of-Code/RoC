/**
 * Compliance Checker Base - Tests
 * Tests for ComplianceCheckerBase abstract class
 */
import { ComplianceCheckerBase } from '../../src/checkers/compliance-checker-base';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';

// Concrete implementation for testing
class TestComplianceChecker extends ComplianceCheckerBase {
  private analysisResult: { score: number; details: string[]; message: string };
  private shouldThrow: boolean = false;
  private customThreshold?: number;
  private customName?: string;
  private customSuggestions?: string[];

  constructor(
    analysisResult: { score: number; details: string[]; message: string } = {
      score: 100,
      details: [],
      message: 'Success',
    }
  ) {
    super();
    this.analysisResult = analysisResult;
  }

  setThrowError(value: boolean): void {
    this.shouldThrow = value;
  }

  setCustomThreshold(threshold: number): void {
    this.customThreshold = threshold;
  }

  setCustomName(name: string): void {
    this.customName = name;
  }

  setCustomSuggestions(suggestions: string[]): void {
    this.customSuggestions = suggestions;
  }

  protected runAnalysis(
    _projectRoot: string,
    _context: LawCheckContext
  ): { score: number; details: string[]; message: string } {
    if (this.shouldThrow) {
      throw new Error('Analysis failed');
    }
    return this.analysisResult;
  }

  protected getPassThreshold(): number {
    return this.customThreshold ?? super.getPassThreshold();
  }

  protected getCheckerName(): string {
    return this.customName ?? super.getCheckerName();
  }

  protected getErrorSuggestions(): string[] {
    return this.customSuggestions ?? super.getErrorSuggestions();
  }

  // Expose protected method for testing
  public testExecuteCheck(context: LawCheckContext): LawResult {
    return this.executeCheck(context);
  }
}

describe('ComplianceCheckerBase', () => {
  const mockContext: LawCheckContext = {
    projectRoot: '/test/project',
    config: {
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
    },
  };

  // ============================================
  // executeCheck - Success cases
  // ============================================
  describe('executeCheck() - Success', () => {
    it('should return passed=true when score >= threshold (default 80)', () => {
      const checker = new TestComplianceChecker({
        score: 80,
        details: [],
        message: 'OK',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(true);
    });

    it('should return passed=true when score is 100', () => {
      const checker = new TestComplianceChecker({
        score: 100,
        details: [],
        message: 'Perfect',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(true);
    });

    it('should return passed=false when score < threshold', () => {
      const checker = new TestComplianceChecker({
        score: 79,
        details: [],
        message: 'Low',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should include score in result', () => {
      const checker = new TestComplianceChecker({
        score: 85,
        details: [],
        message: 'Good',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.score).toBe(85);
    });

    it('should not allow negative scores', () => {
      const checker = new TestComplianceChecker({
        score: -10,
        details: [],
        message: 'Bad',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.score).toBe(0);
    });

    it('should include message from analysis', () => {
      const checker = new TestComplianceChecker({
        score: 100,
        details: [],
        message: 'Custom message',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.message).toBe('Custom message');
    });

    it('should include details from analysis', () => {
      const details = ['Detail 1', 'Detail 2'];
      const checker = new TestComplianceChecker({
        score: 50,
        details,
        message: 'Issues',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.details).toEqual(details);
    });

    it('should set violations from details', () => {
      const details = ['Violation 1', 'Violation 2'];
      const checker = new TestComplianceChecker({
        score: 50,
        details,
        message: 'Issues',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.violations).toEqual(details);
    });

    it('should generate suggestions from details', () => {
      const details = ['Issue 1', 'Issue 2'];
      const checker = new TestComplianceChecker({
        score: 50,
        details,
        message: 'Issues',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.suggestions).toEqual(['Fix: Issue 1', 'Fix: Issue 2']);
    });

    it('should include config from context', () => {
      const checker = new TestComplianceChecker({
        score: 100,
        details: [],
        message: 'OK',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.config).toBe(mockContext.config);
    });
  });

  // ============================================
  // executeCheck - Error handling
  // ============================================
  describe('executeCheck() - Error handling', () => {
    it('should return passed=false on error', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(false);
    });

    it('should return score of 0 on error', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.score).toBe(0);
    });

    it('should include error message in result', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.message).toContain('Analysis failed');
    });

    it('should include ❌ emoji in error message', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.message).toContain('❌');
    });
  });

  // ============================================
  // getPassThreshold
  // ============================================
  describe('getPassThreshold()', () => {
    it('should default to 80', () => {
      const checker = new TestComplianceChecker({
        score: 80,
        details: [],
        message: 'OK',
      });
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(true);
    });

    it('should use custom threshold when set', () => {
      const checker = new TestComplianceChecker({
        score: 70,
        details: [],
        message: 'OK',
      });
      checker.setCustomThreshold(70);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(true);
    });

    it('should fail when score is below custom threshold', () => {
      const checker = new TestComplianceChecker({
        score: 89,
        details: [],
        message: 'OK',
      });
      checker.setCustomThreshold(90);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.passed).toBe(false);
    });
  });

  // ============================================
  // getCheckerName
  // ============================================
  describe('getCheckerName()', () => {
    it('should default to "Checker"', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      const result = checker.testExecuteCheck(mockContext);
      expect(result.message).toContain('Checker');
    });

    it('should use custom name when set', () => {
      const checker = new TestComplianceChecker();
      checker.setThrowError(true);
      checker.setCustomName('SecurityValidator');
      const result = checker.testExecuteCheck(mockContext);
      expect(result.message).toContain('SecurityValidator');
    });
  });

  // ============================================
  // getErrorSuggestions
  // ============================================
  describe('getErrorSuggestions()', () => {
    it('should return default suggestion', () => {
      const checker = new TestComplianceChecker();
      const suggestions = checker['getErrorSuggestions']();
      expect(suggestions).toEqual(['Check configuration and retry']);
    });

    it('should return custom suggestions when set', () => {
      const checker = new TestComplianceChecker();
      checker.setCustomSuggestions([
        'Custom suggestion 1',
        'Custom suggestion 2',
      ]);
      const suggestions = checker['getErrorSuggestions']();
      expect(suggestions).toEqual([
        'Custom suggestion 1',
        'Custom suggestion 2',
      ]);
    });
  });
});
