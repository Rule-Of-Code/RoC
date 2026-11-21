/**
 * Result Processor Tests
 * Tests for AuditResultProcessor class
 */

import type { AuditResult } from '../../src/core/auditing/audit-types';
import { AuditResultProcessor } from '../../src/core/auditing/result-processor';
import type { RuleOfCodeConfig } from '../../src/types/law.types';
import { ConfigFileUtils } from '../../src/utils/config-file-utils';

const createConfig = (
  overrides: Partial<RuleOfCodeConfig> = {}
): RuleOfCodeConfig => ({
  ...ConfigFileUtils.getMinimalDefaultConfig(),
  ...overrides,
});

describe('AuditResultProcessor', () => {
  let processor: AuditResultProcessor;

  beforeEach(() => {
    processor = new AuditResultProcessor();
  });

  describe('processResults', () => {
    it('should FAIL an empty results map (fail-closed: zero checks is never PASSED)', () => {
      const results = new Map<string, unknown>();
      const config = createConfig();

      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.passed).toBe(false);
      expect(auditResult.totalLaws).toBe(0);
      expect(auditResult.passedLaws).toBe(0);
      expect(auditResult.failedLaws).toBe(0);
      expect(auditResult.score).toBe(0);
    });

    it('should process all passed results', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true, score: 100 });
      results.set('law2', { passed: true, score: 100 });
      results.set('law3', { passed: true, score: 100 });

      const config = createConfig();
      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.passed).toBe(true);
      expect(auditResult.totalLaws).toBe(3);
      expect(auditResult.passedLaws).toBe(3);
      expect(auditResult.failedLaws).toBe(0);
      expect(auditResult.score).toBe(100);
    });

    it('should process mixed results', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true, score: 100 });
      results.set('law2', { passed: false, score: 0 });
      results.set('law3', { passed: true, score: 80 });

      const config = createConfig({ mode: 'full' });
      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.passed).toBe(false);
      expect(auditResult.totalLaws).toBe(3);
      expect(auditResult.passedLaws).toBe(2);
      expect(auditResult.failedLaws).toBe(1);
      // Score is average of passed laws: (100 + 80) / 3 = 60
      expect(auditResult.score).toBe(60);
    });

    it('should process all failed results', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0 });
      results.set('law2', { passed: false, score: 0 });

      const config = createConfig();
      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.passed).toBe(false);
      expect(auditResult.totalLaws).toBe(2);
      expect(auditResult.passedLaws).toBe(0);
      expect(auditResult.failedLaws).toBe(2);
      expect(auditResult.score).toBe(0);
    });

    it('should handle results without score property', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true });
      results.set('law2', { passed: true });

      const config = createConfig();
      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.passed).toBe(true);
      expect(auditResult.passedLaws).toBe(2);
      // Malformed results without a score default to 0
      expect(auditResult.score).toBe(0);
    });

    it('should set paretoMode to false', () => {
      const results = new Map<string, unknown>();
      const config = createConfig();

      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.paretoMode).toBe(false);
    });

    it('should set duration to 0', () => {
      const results = new Map<string, unknown>();
      const config = createConfig();

      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.duration).toBe(0);
    });

    it('should preserve config reference', () => {
      const results = new Map<string, unknown>();
      const config = createConfig({
        projectRoot: '/my/project',
        mode: 'full',
      });

      const auditResult = processor.processResults(results, {}, config);

      expect(auditResult.config).toBe(config);
      expect(auditResult.config.projectRoot).toBe('/my/project');
    });

    it('should calculate score correctly with varying scores', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true, score: 100 });
      results.set('law2', { passed: true, score: 50 });
      results.set('law3', { passed: true, score: 75 });

      const config = createConfig();
      const auditResult = processor.processResults(results, {}, config);

      // Average: (100 + 50 + 75) / 3 = 75
      expect(auditResult.score).toBe(75);
    });

    it('should round score to nearest integer', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true, score: 33 });
      results.set('law2', { passed: true, score: 33 });
      results.set('law3', { passed: true, score: 34 });

      const config = createConfig();
      const auditResult = processor.processResults(results, {}, config);

      // Average: (33 + 33 + 34) / 3 = 33.33... rounds to 33
      expect(auditResult.score).toBe(33);
    });
  });

  describe('severity semantics (warn-first contract)', () => {
    it('warning-severity violations are reported but do not fail the audit', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: true, score: 100 });
      results.set('law2', { passed: false, score: 0, severity: 'warning' });

      const auditResult = processor.processResults(results, {}, createConfig());

      expect(auditResult.passed).toBe(true);
      expect(auditResult.passedLaws).toBe(1);
      expect(auditResult.warningLaws).toBe(1);
      expect(auditResult.failedLaws).toBe(0);
    });

    it('info-severity violations do not fail the audit either', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0, severity: 'info' });

      const auditResult = processor.processResults(results, {}, createConfig());

      expect(auditResult.passed).toBe(true);
      expect(auditResult.warningLaws).toBe(1);
      expect(auditResult.failedLaws).toBe(0);
    });

    it('error-severity violations fail the audit', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0, severity: 'error' });

      const auditResult = processor.processResults(results, {}, createConfig());

      expect(auditResult.passed).toBe(false);
      expect(auditResult.failedLaws).toBe(1);
      expect(auditResult.warningLaws).toBe(0);
    });

    it('a violating result without severity stays blocking (safe default)', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0 });

      const auditResult = processor.processResults(results, {}, createConfig());

      expect(auditResult.passed).toBe(false);
      expect(auditResult.failedLaws).toBe(1);
    });

    it('failOnWarnings escalates warnings back to failures', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0, severity: 'warning' });

      const auditResult = processor.processResults(
        results,
        { failOnWarnings: true },
        createConfig()
      );

      expect(auditResult.passed).toBe(false);
      expect(auditResult.failedLaws).toBe(1);
      expect(auditResult.warningLaws).toBe(0);
    });

    it('isWarningResult classifies correctly', () => {
      expect(
        AuditResultProcessor.isWarningResult({
          passed: false,
          severity: 'warning',
        })
      ).toBe(true);
      expect(
        AuditResultProcessor.isWarningResult({
          passed: false,
          severity: 'info',
        })
      ).toBe(true);
      expect(
        AuditResultProcessor.isWarningResult({
          passed: false,
          severity: 'error',
        })
      ).toBe(false);
      expect(
        AuditResultProcessor.isWarningResult({
          passed: true,
          severity: 'warning',
        })
      ).toBe(false);
      expect(
        AuditResultProcessor.isWarningResult(
          { passed: false, severity: 'warning' },
          true
        )
      ).toBe(false);
    });

    it('generateStats carries warningLaws through', () => {
      const results = new Map<string, unknown>();
      results.set('law1', { passed: false, score: 0, severity: 'warning' });
      const auditResult = processor.processResults(results, {}, createConfig());

      const stats = AuditResultProcessor.generateStats(auditResult);

      expect(stats.warningLaws).toBe(1);
    });
  });
});
