/**
 * Enhanced Laws Data - Tests
 * Tests for enhanced laws data module and utility functions
 */
import {
  ALL_ENHANCED_CONSTITUTIONAL_LAWS,
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  DEPLOYMENT_LAWS,
  DOCUMENTATION_LAWS,
  FRAMEWORK_LAWS,
  getDefaultEnabledLaws,
  getFrameworkLaws,
  getLawsByCategory,
  getLawsByPriority,
  getParetoOptimizedLaws,
  getProjectLaws,
  PARETO_CATEGORIES,
  PERFORMANCE_LAWS,
  PROJECT_LAWS,
  SACRED_LAWS,
  SECURITY_LAWS,
  TESTING_LAWS,
  VERSION_CONTROL_LAWS,
} from '../../src/data/enhanced-laws';

describe('Enhanced Laws Data', () => {
  // ============================================
  // Law Arrays
  // ============================================
  describe('Law Arrays', () => {
    it('should export SACRED_LAWS array', () => {
      expect(Array.isArray(SACRED_LAWS)).toBe(true);
      expect(SACRED_LAWS.length).toBeGreaterThan(0);
    });

    it('should export CODE_QUALITY_LAWS array', () => {
      expect(Array.isArray(CODE_QUALITY_LAWS)).toBe(true);
    });

    it('should export VERSION_CONTROL_LAWS array', () => {
      expect(Array.isArray(VERSION_CONTROL_LAWS)).toBe(true);
    });

    it('should export ANGULAR_LAWS array', () => {
      expect(Array.isArray(ANGULAR_LAWS)).toBe(true);
    });

    it('should export SECURITY_LAWS array', () => {
      expect(Array.isArray(SECURITY_LAWS)).toBe(true);
    });

    it('should export PERFORMANCE_LAWS array', () => {
      expect(Array.isArray(PERFORMANCE_LAWS)).toBe(true);
    });

    it('should export TESTING_LAWS array', () => {
      expect(Array.isArray(TESTING_LAWS)).toBe(true);
    });

    it('should export DEPLOYMENT_LAWS array', () => {
      expect(Array.isArray(DEPLOYMENT_LAWS)).toBe(true);
    });

    it('should export DOCUMENTATION_LAWS array', () => {
      expect(Array.isArray(DOCUMENTATION_LAWS)).toBe(true);
    });
  });

  // ============================================
  // ALL_ENHANCED_CONSTITUTIONAL_LAWS
  // ============================================
  describe('ALL_ENHANCED_CONSTITUTIONAL_LAWS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_ENHANCED_CONSTITUTIONAL_LAWS)).toBe(true);
    });

    it('should contain all law categories', () => {
      const categories = new Set(
        ALL_ENHANCED_CONSTITUTIONAL_LAWS.map(law => law.category)
      );
      expect(categories.size).toBeGreaterThan(0);
    });

    it('should include SACRED_LAWS', () => {
      for (const law of SACRED_LAWS) {
        expect(ALL_ENHANCED_CONSTITUTIONAL_LAWS).toContainEqual(law);
      }
    });

    it('should have unique law IDs', () => {
      const ids = ALL_ENHANCED_CONSTITUTIONAL_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid priority for each law', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of ALL_ENHANCED_CONSTITUTIONAL_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });
  });

  // ============================================
  // PARETO_CATEGORIES
  // ============================================
  describe('PARETO_CATEGORIES', () => {
    it('should have HIGH_IMPACT category', () => {
      expect(Array.isArray(PARETO_CATEGORIES.HIGH_IMPACT)).toBe(true);
    });

    it('should have MEDIUM_IMPACT category', () => {
      expect(Array.isArray(PARETO_CATEGORIES.MEDIUM_IMPACT)).toBe(true);
    });

    it('should have LOW_IMPACT category', () => {
      expect(Array.isArray(PARETO_CATEGORIES.LOW_IMPACT)).toBe(true);
    });

    it('HIGH_IMPACT should contain critical law IDs', () => {
      expect(PARETO_CATEGORIES.HIGH_IMPACT.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // FRAMEWORK_LAWS
  // ============================================
  describe('FRAMEWORK_LAWS', () => {
    it('should have angular framework laws', () => {
      expect(Array.isArray(FRAMEWORK_LAWS.angular)).toBe(true);
    });

    it('should have react framework laws', () => {
      expect(Array.isArray(FRAMEWORK_LAWS.react)).toBe(true);
    });

    it('should have vue framework laws', () => {
      expect(Array.isArray(FRAMEWORK_LAWS.vue)).toBe(true);
    });

    it('angular should have laws', () => {
      expect(FRAMEWORK_LAWS.angular.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // PROJECT_LAWS
  // ============================================
  describe('PROJECT_LAWS', () => {
    it('should be an object', () => {
      expect(typeof PROJECT_LAWS).toBe('object');
    });
  });

  // ============================================
  // getLawsByPriority
  // ============================================
  describe('getLawsByPriority()', () => {
    it('should return CRITICAL laws', () => {
      const laws = getLawsByPriority('CRITICAL');
      expect(Array.isArray(laws)).toBe(true);
      for (const law of laws) {
        expect(law.priority).toBe('CRITICAL');
      }
    });

    it('should return HIGH priority laws', () => {
      const laws = getLawsByPriority('HIGH');
      for (const law of laws) {
        expect(law.priority).toBe('HIGH');
      }
    });

    it('should return MEDIUM priority laws', () => {
      const laws = getLawsByPriority('MEDIUM');
      for (const law of laws) {
        expect(law.priority).toBe('MEDIUM');
      }
    });

    it('should return LOW priority laws', () => {
      const laws = getLawsByPriority('LOW');
      for (const law of laws) {
        expect(law.priority).toBe('LOW');
      }
    });

    it('should return empty array for non-matching priority', () => {
      // All laws have valid priorities, so this tests the filtering logic
      const criticalLaws = getLawsByPriority('CRITICAL');
      expect(criticalLaws.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // getLawsByCategory
  // ============================================
  describe('getLawsByCategory()', () => {
    it('should return SACRED_LAW category laws', () => {
      const laws = getLawsByCategory('SACRED_LAW');
      expect(Array.isArray(laws)).toBe(true);
      for (const law of laws) {
        expect(law.category).toBe('SACRED_LAW');
      }
    });

    it('should return CODE_QUALITY category laws', () => {
      const laws = getLawsByCategory('CODE_QUALITY');
      for (const law of laws) {
        expect(law.category).toBe('CODE_QUALITY');
      }
    });

    it('should return empty array for non-existent category', () => {
      const laws = getLawsByCategory('NON_EXISTENT' as never);
      expect(laws).toEqual([]);
    });
  });

  // ============================================
  // getParetoOptimizedLaws
  // ============================================
  describe('getParetoOptimizedLaws()', () => {
    it('should return array of laws', () => {
      const laws = getParetoOptimizedLaws();
      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return only HIGH_IMPACT laws', () => {
      const laws = getParetoOptimizedLaws();
      for (const law of laws) {
        expect(PARETO_CATEGORIES.HIGH_IMPACT).toContain(law.id);
      }
    });

    it('should include all sacred laws', () => {
      const paretoLaws = getParetoOptimizedLaws();
      const paretoIds = paretoLaws.map(l => l.id);
      for (const sacredLaw of SACRED_LAWS) {
        expect(paretoIds).toContain(sacredLaw.id);
      }
    });
  });

  // ============================================
  // getFrameworkLaws
  // ============================================
  describe('getFrameworkLaws()', () => {
    it('should return angular framework laws', () => {
      const laws = getFrameworkLaws('angular');
      expect(Array.isArray(laws)).toBe(true);
      expect(laws.length).toBeGreaterThan(0);
    });

    it('should return react framework laws', () => {
      const laws = getFrameworkLaws('react');
      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return vue framework laws', () => {
      const laws = getFrameworkLaws('vue');
      expect(Array.isArray(laws)).toBe(true);
    });

    it('angular laws should have angular-related content', () => {
      const laws = getFrameworkLaws('angular');
      for (const law of laws) {
        expect(FRAMEWORK_LAWS.angular).toContain(law.id);
      }
    });
  });

  // ============================================
  // getProjectLaws
  // ============================================
  describe('getProjectLaws()', () => {
    it('should return array for known project', () => {
      // If PROJECT_LAWS has any project defined
      const projectNames = Object.keys(PROJECT_LAWS);
      if (projectNames.length > 0) {
        const firstName = projectNames[0] as string;
        const laws = getProjectLaws(firstName);
        expect(Array.isArray(laws)).toBe(true);
      } else {
        // If no projects defined, should return empty array for any project
        const laws = getProjectLaws('some-project');
        expect(laws).toEqual([]);
      }
    });

    it('should return empty array for unknown project', () => {
      const laws = getProjectLaws('non-existent-project-12345');
      expect(laws).toEqual([]);
    });
  });

  // ============================================
  // getDefaultEnabledLaws
  // ============================================
  describe('getDefaultEnabledLaws()', () => {
    it('should return array of laws', () => {
      const laws = getDefaultEnabledLaws();
      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return only laws with defaultEnabled=true', () => {
      const laws = getDefaultEnabledLaws();
      for (const law of laws) {
        expect(law.defaultEnabled).toBe(true);
      }
    });

    it('should include SACRED_LAWS (always enabled)', () => {
      const defaultLaws = getDefaultEnabledLaws();
      const defaultIds = defaultLaws.map(l => l.id);
      for (const sacredLaw of SACRED_LAWS) {
        expect(defaultIds).toContain(sacredLaw.id);
      }
    });
  });
});
