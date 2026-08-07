/**
 * Core Auditor Tests
 * Tests for re-exports from core/auditor.ts
 */

import {
  AuditResultProcessor,
  RuleOfCodeAuditor,
} from '../../src/core/auditor';

describe('core/auditor', () => {
  describe('RuleOfCodeAuditor export', () => {
    it('should export RuleOfCodeAuditor class', () => {
      expect(RuleOfCodeAuditor).toBeDefined();
      expect(typeof RuleOfCodeAuditor).toBe('function');
    });
  });

  describe('AuditResultProcessor export', () => {
    it('should export AuditResultProcessor class', () => {
      expect(AuditResultProcessor).toBeDefined();
      expect(typeof AuditResultProcessor).toBe('function');
    });
  });
});
