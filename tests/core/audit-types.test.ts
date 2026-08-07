/**
 * Audit Types Tests
 * Tests for AuditResult, AuditOptions, and AuditStats interfaces
 */

import type {
  AuditOptions,
  AuditResult,
  AuditStats,
} from '../../src/core/auditing/audit-types';
import type { RuleOfCodeConfig } from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

const createConfig = (
  overrides: Partial<RuleOfCodeConfig> = {}
): RuleOfCodeConfig => ({
  ...ConfigFileUtils.getMinimalDefaultConfig(),
  ...overrides,
});

describe('AuditTypes', () => {
  describe('AuditResult interface', () => {
    it('should define correct structure for passed audit', () => {
      const result: AuditResult = {
        passed: true,
        score: 100,
        totalLaws: 10,
        passedLaws: 10,
        failedLaws: 0,
        results: new Map(),
        duration: 500,
        paretoMode: false,
        config: createConfig(),
      };

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(result.totalLaws).toBe(10);
      expect(result.passedLaws).toBe(10);
      expect(result.failedLaws).toBe(0);
      expect(result.duration).toBe(500);
      expect(result.paretoMode).toBe(false);
    });

    it('should define correct structure for failed audit', () => {
      const result: AuditResult = {
        passed: false,
        score: 60,
        totalLaws: 10,
        passedLaws: 6,
        failedLaws: 4,
        results: new Map([['law1', { passed: false }]]),
        duration: 1000,
        paretoMode: true,
        config: createConfig({ mode: 'full' }),
      };

      expect(result.passed).toBe(false);
      expect(result.score).toBe(60);
      expect(result.failedLaws).toBe(4);
      expect(result.paretoMode).toBe(true);
    });

    it('should support optional fields', () => {
      const result: AuditResult = {
        passed: true,
        score: 100,
        totalLaws: 5,
        passedLaws: 5,
        failedLaws: 0,
        results: new Map(),
        duration: 100,
        paretoMode: false,
        executionTime: 150,
        timestamp: '2026-01-19T12:00:00Z',
        projectRoot: '/my/project',
        config: createConfig({ projectRoot: '/my/project' }),
        summary: {
          totalLaws: 5,
          passedLaws: 5,
          failedLaws: 0,
          score: 100,
          duration: 100,
        },
      };

      expect(result.executionTime).toBe(150);
      expect(result.timestamp).toBe('2026-01-19T12:00:00Z');
      expect(result.projectRoot).toBe('/my/project');
      expect(result.summary).toBeDefined();
      expect(result.summary?.score).toBe(100);
    });

    it('should handle results map with various law results', () => {
      const results = new Map<string, unknown>();
      results.set('security-law-1', {
        passed: true,
        score: 100,
        message: 'All secure',
      });
      results.set('perf-law-1', {
        passed: false,
        score: 50,
        violations: ['slow query'],
      });

      const auditResult: AuditResult = {
        passed: false,
        score: 75,
        totalLaws: 2,
        passedLaws: 1,
        failedLaws: 1,
        results,
        duration: 250,
        paretoMode: false,
        config: createConfig(),
      };

      expect(auditResult.results.size).toBe(2);
      expect(auditResult.results.get('security-law-1')).toEqual({
        passed: true,
        score: 100,
        message: 'All secure',
      });
    });
  });

  describe('AuditOptions interface', () => {
    it('should define default audit options', () => {
      const options: AuditOptions = {};

      expect(options.mode).toBeUndefined();
      expect(options.verbose).toBeUndefined();
      expect(options.parallel).toBeUndefined();
    });

    it('should support all optional fields', () => {
      const options: AuditOptions = {
        mode: 'full',
        verbose: true,
        onlyFailures: false,
        parallel: true,
        projectRoot: '/my/project',
        configPath: './ruleofcode.config.json',
        suggestExceptions: true,
        maxConcurrent: 4,
        timeout: 30000,
        includeWarnings: true,
        outputFormat: 'json',
        failOnWarnings: false,
        categories: ['security', 'performance'],
        excludePatterns: ['node_modules/**', 'dist/**'],
      };

      expect(options.mode).toBe('full');
      expect(options.verbose).toBe(true);
      expect(options.parallel).toBe(true);
      expect(options.maxConcurrent).toBe(4);
      expect(options.timeout).toBe(30000);
      expect(options.categories).toEqual(['security', 'performance']);
      expect(options.excludePatterns).toEqual(['node_modules/**', 'dist/**']);
    });

    it('should support different audit modes', () => {
      const fastMode: AuditOptions = { mode: 'fast' };
      const fullMode: AuditOptions = { mode: 'full' };
      const preCommit: AuditOptions = { mode: 'pre-commit' };
      const prePush: AuditOptions = { mode: 'pre-push' };

      expect(fastMode.mode).toBe('fast');
      expect(fullMode.mode).toBe('full');
      expect(preCommit.mode).toBe('pre-commit');
      expect(prePush.mode).toBe('pre-push');
    });
  });

  describe('AuditStats interface', () => {
    it('should define correct stats structure', () => {
      const stats: AuditStats = {
        totalLaws: 100,
        passedLaws: 95,
        failedLaws: 5,
        score: 95,
        duration: 5000,
      };

      expect(stats.totalLaws).toBe(100);
      expect(stats.passedLaws).toBe(95);
      expect(stats.failedLaws).toBe(5);
      expect(stats.score).toBe(95);
      expect(stats.duration).toBe(5000);
    });

    it('should handle edge case with zero laws', () => {
      const stats: AuditStats = {
        totalLaws: 0,
        passedLaws: 0,
        failedLaws: 0,
        score: 0,
        duration: 10,
      };

      expect(stats.totalLaws).toBe(0);
      expect(stats.score).toBe(0);
    });

    it('should handle perfect score', () => {
      const stats: AuditStats = {
        totalLaws: 50,
        passedLaws: 50,
        failedLaws: 0,
        score: 100,
        duration: 2500,
      };

      expect(stats.passedLaws).toBe(stats.totalLaws);
      expect(stats.failedLaws).toBe(0);
      expect(stats.score).toBe(100);
    });
  });
});
