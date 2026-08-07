/**
 * Audit Result Processor - Tests
 * Tests for AuditResultProcessor class
 */
import type { AuditResult } from '../../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../../src/core/auditing/result-processor';
import type { RuleOfCodeConfig } from '../../../src/types';

describe('AuditResultProcessor', () => {
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

  const createMockResult = (
    overrides: Partial<AuditResult> = {}
  ): AuditResult => ({
    passed: true,
    score: 100,
    totalLaws: 10,
    passedLaws: 10,
    failedLaws: 0,
    results: new Map(),
    duration: 100,
    paretoMode: false,
    config: mockConfig,
    ...overrides,
  });

  // ============================================
  // processResults (instance method)
  // ============================================
  describe('processResults()', () => {
    let processor: AuditResultProcessor;

    beforeEach(() => {
      processor = new AuditResultProcessor();
    });

    it('should return passed=true when all laws pass', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: true, score: 100 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.passed).toBe(true);
    });

    it('should return passed=false when any law fails', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: false, score: 0 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.passed).toBe(false);
    });

    it('should calculate average score', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: true, score: 80 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.score).toBe(90);
    });

    it('should count passed laws correctly', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: false, score: 0 }],
        ['law-3', { passed: true, score: 100 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.passedLaws).toBe(2);
    });

    it('should count failed laws correctly', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: false, score: 0 }],
        ['law-3', { passed: false, score: 0 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.failedLaws).toBe(2);
    });

    it('should set totalLaws from results size', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
        ['law-2', { passed: true, score: 100 }],
        ['law-3', { passed: true, score: 100 }],
        ['law-4', { passed: true, score: 100 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.totalLaws).toBe(4);
    });

    it('should handle empty results', () => {
      const results = new Map<string, unknown>();
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.totalLaws).toBe(0);
      expect(result.passedLaws).toBe(0);
      expect(result.score).toBe(0);
    });

    it('should handle undefined score - default to 0', () => {
      const results = new Map<string, unknown>([['law-1', { passed: true }]]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.score).toBe(0);
    });

    it('should include config in result', () => {
      const results = new Map<string, unknown>();
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.config).toBe(mockConfig);
    });

    it('should set paretoMode to false', () => {
      const results = new Map<string, unknown>();
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.paretoMode).toBe(false);
    });

    it('should include results map', () => {
      const results = new Map<string, unknown>([
        ['law-1', { passed: true, score: 100 }],
      ]);
      const result = processor.processResults(results, {}, mockConfig);
      expect(result.results).toBe(results);
    });
  });

  // ============================================
  // generateStats
  // ============================================
  describe('generateStats()', () => {
    it('should return totalLaws from result', () => {
      const result = createMockResult({ totalLaws: 15 });
      const stats = AuditResultProcessor.generateStats(result);
      expect(stats.totalLaws).toBe(15);
    });

    it('should return passedLaws from result', () => {
      const result = createMockResult({ passedLaws: 12 });
      const stats = AuditResultProcessor.generateStats(result);
      expect(stats.passedLaws).toBe(12);
    });

    it('should return failedLaws from result', () => {
      const result = createMockResult({ failedLaws: 3 });
      const stats = AuditResultProcessor.generateStats(result);
      expect(stats.failedLaws).toBe(3);
    });

    it('should return score from result', () => {
      const result = createMockResult({ score: 85 });
      const stats = AuditResultProcessor.generateStats(result);
      expect(stats.score).toBe(85);
    });

    it('should return duration from result', () => {
      const result = createMockResult({ duration: 250 });
      const stats = AuditResultProcessor.generateStats(result);
      expect(stats.duration).toBe(250);
    });
  });

  // ============================================
  // exportResults
  // ============================================
  describe('exportResults()', () => {
    describe('JSON export', () => {
      it('should return valid JSON string', () => {
        const result = createMockResult();
        const exported = AuditResultProcessor.exportResults(result, 'json');
        expect(() => JSON.parse(exported)).not.toThrow();
      });

      it('should include passed status', () => {
        const result = createMockResult({ passed: false });
        const exported = AuditResultProcessor.exportResults(result, 'json');
        const parsed = JSON.parse(exported);
        expect(parsed.passed).toBe(false);
      });

      it('should include score', () => {
        const result = createMockResult({ score: 85 });
        const exported = AuditResultProcessor.exportResults(result, 'json');
        const parsed = JSON.parse(exported);
        expect(parsed.score).toBe(85);
      });

      it('should include stats', () => {
        const result = createMockResult({
          totalLaws: 10,
          passedLaws: 8,
          failedLaws: 2,
        });
        const exported = AuditResultProcessor.exportResults(result, 'json');
        const parsed = JSON.parse(exported);
        expect(parsed.stats.totalLaws).toBe(10);
        expect(parsed.stats.passedLaws).toBe(8);
        expect(parsed.stats.failedLaws).toBe(2);
      });

      it('should include results array', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: true, message: 'OK' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'json');
        const parsed = JSON.parse(exported);
        expect(parsed.results).toHaveLength(1);
        expect(parsed.results[0].id).toBe('law-1');
      });
    });

    describe('HTML export', () => {
      it('should return valid HTML', () => {
        const result = createMockResult();
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('<!DOCTYPE html>');
      });

      it('should include title', () => {
        const result = createMockResult();
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('RuleOfCode Audit Report');
      });

      it('should include score', () => {
        const result = createMockResult({ score: 85 });
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('85%');
      });

      it('should include passed laws count', () => {
        const result = createMockResult({ passedLaws: 8, totalLaws: 10 });
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('8/10');
      });

      it('should include duration', () => {
        const result = createMockResult({ duration: 250 });
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('250ms');
      });

      it('should mark passed laws with green class', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: true, message: 'OK' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('class="passed"');
      });

      it('should mark failed laws with red class', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: false, message: 'Failed' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'html');
        expect(exported).toContain('class="failed"');
      });
    });

    describe('CSV export', () => {
      it('should include header row', () => {
        const result = createMockResult();
        const exported = AuditResultProcessor.exportResults(result, 'csv');
        expect(exported).toContain('Law ID,Status,Message,Details');
      });

      it('should include law results', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: true, message: 'OK' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'csv');
        expect(exported).toContain('law-1,PASSED,OK');
      });

      it('should mark passed laws as PASSED', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: true, message: 'OK' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'csv');
        expect(exported).toContain('PASSED');
      });

      it('should mark failed laws as FAILED', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: false, message: 'Issues found' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'csv');
        expect(exported).toContain('FAILED');
      });

      it('should escape commas in message', () => {
        const results = new Map<string, unknown>([
          ['law-1', { passed: true, message: 'OK, all good, done' }],
        ]);
        const result = createMockResult({ results });
        const exported = AuditResultProcessor.exportResults(result, 'csv');
        expect(exported).toContain('OK; all good; done');
      });
    });

    describe('Unsupported format', () => {
      it('should throw error for unsupported format', () => {
        const result = createMockResult();
        expect(() => {
          AuditResultProcessor.exportResults(
            result,
            'xml' as 'json' | 'html' | 'csv'
          );
        }).toThrow('Unsupported export format: xml');
      });
    });
  });

  // ============================================
  // exportResults (instance method)
  // ============================================
  describe('exportResults() - instance method', () => {
    it('should delegate to static method', () => {
      const processor = new AuditResultProcessor();
      const result = createMockResult();
      const exported = processor.exportResults(result, 'json');
      expect(() => JSON.parse(exported)).not.toThrow();
    });
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
