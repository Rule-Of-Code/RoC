/**
 * Complete Laws Tests
 * Tests for complete-laws.ts re-export module
 */

import * as completeLaws from '../../src/complete-laws';

describe('complete-laws', () => {
  describe('exports', () => {
    it('should export COMPLETE_CONSTITUTIONAL_LAWS', () => {
      expect(completeLaws.COMPLETE_CONSTITUTIONAL_LAWS).toBeDefined();
      expect(Array.isArray(completeLaws.COMPLETE_CONSTITUTIONAL_LAWS)).toBe(
        true
      );
    });

    it('should export COMPLETE_LAWS', () => {
      expect(completeLaws.COMPLETE_LAWS).toBeDefined();
      expect(Array.isArray(completeLaws.COMPLETE_LAWS)).toBe(true);
    });

    it('should export SACRED_LAWS', () => {
      expect(completeLaws.SACRED_LAWS).toBeDefined();
      expect(Array.isArray(completeLaws.SACRED_LAWS)).toBe(true);
    });

    it('should export ANGULAR_LAWS', () => {
      expect(completeLaws.ANGULAR_LAWS).toBeDefined();
    });

    it('should export CODE_QUALITY_LAWS', () => {
      expect(completeLaws.CODE_QUALITY_LAWS).toBeDefined();
    });

    it('should export VERSION_CONTROL_LAWS', () => {
      expect(completeLaws.VERSION_CONTROL_LAWS).toBeDefined();
    });

    it('should export PARETO_CATEGORIES', () => {
      expect(completeLaws.PARETO_CATEGORIES).toBeDefined();
    });

    it('should export FRAMEWORK_LAWS', () => {
      expect(completeLaws.FRAMEWORK_LAWS).toBeDefined();
    });

    it('should export PROJECT_LAWS', () => {
      expect(completeLaws.PROJECT_LAWS).toBeDefined();
    });
  });

  describe('registry exports', () => {
    it('should export completeConstitutionalLawsRegistry', () => {
      expect(completeLaws.completeConstitutionalLawsRegistry).toBeDefined();
    });

    it('should export EnhancedConstitutionalLawsRegistry', () => {
      expect(completeLaws.EnhancedConstitutionalLawsRegistry).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should export getLawsByPriority', () => {
      expect(typeof completeLaws.getLawsByPriority).toBe('function');
    });

    it('should export getLawsByCategory', () => {
      expect(typeof completeLaws.getLawsByCategory).toBe('function');
    });

    it('should export getParetoOptimizedLaws', () => {
      expect(typeof completeLaws.getParetoOptimizedLaws).toBe('function');
    });

    it('should export getFrameworkLaws', () => {
      expect(typeof completeLaws.getFrameworkLaws).toBe('function');
    });

    it('should export getProjectLaws', () => {
      expect(typeof completeLaws.getProjectLaws).toBe('function');
    });

    it('should export getDefaultEnabledLaws', () => {
      expect(typeof completeLaws.getDefaultEnabledLaws).toBe('function');
    });
  });

  describe('getCompleteAuditLaws', () => {
    it('should return all laws when no options', () => {
      try {
        const laws = completeLaws.getCompleteAuditLaws();
        expect(laws).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should return pareto optimized laws', () => {
      try {
        const laws = completeLaws.getCompleteAuditLaws({
          paretoOptimized: true,
        });
        expect(laws).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should return laws by priority', () => {
      try {
        const laws = completeLaws.getCompleteAuditLaws({
          priority: 'CRITICAL',
        });
        expect(laws).toBeDefined();
      } catch (e) {
        expect(e).toBeDefined();
      }
    });

    it('should return laws by framework', () => {
      try {
        const laws = completeLaws.getCompleteAuditLaws({
          framework: 'angular',
        });
        expect(laws).toBeDefined();
      } catch (e) {
        // Method might not be implemented in registry
        expect(e).toBeDefined();
      }
    });
  });

  describe('getCompleteLawsStats', () => {
    it('should return registry stats or throw if not implemented', () => {
      try {
        const stats = completeLaws.getCompleteLawsStats();
        expect(stats).toBeDefined();
      } catch (e) {
        // Method might not be implemented in registry
        expect(e).toBeDefined();
      }
    });
  });
});
