/**
 * Pareto Optimization - Tests
 * Tests for pareto optimization categories and law mappings
 */
import {
  FRAMEWORK_LAWS,
  PARETO_CATEGORIES,
  PROJECT_LAWS,
  getFrameworkRelevance,
  getOptimizationCategory,
  isProjectSpecific,
} from '../../src/data/pareto-optimization';

describe('Pareto Optimization', () => {
  // ============================================
  // PARETO_CATEGORIES structure
  // ============================================
  describe('PARETO_CATEGORIES structure', () => {
    it('should be an object', () => {
      expect(typeof PARETO_CATEGORIES).toBe('object');
      expect(PARETO_CATEGORIES).not.toBeNull();
    });

    it('should have HIGH_IMPACT category', () => {
      expect(PARETO_CATEGORIES.HIGH_IMPACT).toBeDefined();
      expect(Array.isArray(PARETO_CATEGORIES.HIGH_IMPACT)).toBe(true);
    });

    it('should have MEDIUM_IMPACT category', () => {
      expect(PARETO_CATEGORIES.MEDIUM_IMPACT).toBeDefined();
      expect(Array.isArray(PARETO_CATEGORIES.MEDIUM_IMPACT)).toBe(true);
    });

    it('should have LOW_IMPACT category', () => {
      expect(PARETO_CATEGORIES.LOW_IMPACT).toBeDefined();
      expect(Array.isArray(PARETO_CATEGORIES.LOW_IMPACT)).toBe(true);
    });
  });

  // ============================================
  // Category contents
  // ============================================
  describe('Category contents', () => {
    it('HIGH_IMPACT should contain law IDs', () => {
      expect(PARETO_CATEGORIES.HIGH_IMPACT.length).toBeGreaterThan(0);
      for (const id of PARETO_CATEGORIES.HIGH_IMPACT) {
        expect(typeof id).toBe('string');
      }
    });

    it('MEDIUM_IMPACT should contain law IDs', () => {
      expect(PARETO_CATEGORIES.MEDIUM_IMPACT.length).toBeGreaterThan(0);
      for (const id of PARETO_CATEGORIES.MEDIUM_IMPACT) {
        expect(typeof id).toBe('string');
      }
    });

    it('LOW_IMPACT should contain law IDs', () => {
      expect(PARETO_CATEGORIES.LOW_IMPACT.length).toBeGreaterThan(0);
      for (const id of PARETO_CATEGORIES.LOW_IMPACT) {
        expect(typeof id).toBe('string');
      }
    });
  });

  // ============================================
  // Pareto principle (20/80)
  // ============================================
  describe('Pareto principle', () => {
    it('HIGH_IMPACT should have fewer laws than MEDIUM_IMPACT', () => {
      expect(PARETO_CATEGORIES.HIGH_IMPACT.length).toBeLessThan(
        PARETO_CATEGORIES.MEDIUM_IMPACT.length
      );
    });

    it('total HIGH_IMPACT should represent minority of all laws', () => {
      const totalLaws =
        PARETO_CATEGORIES.HIGH_IMPACT.length +
        PARETO_CATEGORIES.MEDIUM_IMPACT.length +
        PARETO_CATEGORIES.LOW_IMPACT.length;
      const highImpactPercentage =
        (PARETO_CATEGORIES.HIGH_IMPACT.length / totalLaws) * 100;
      // High impact should be less than 50% of total
      expect(highImpactPercentage).toBeLessThan(50);
    });
  });

  // ============================================
  // FRAMEWORK_LAWS structure
  // ============================================
  describe('FRAMEWORK_LAWS structure', () => {
    it('should be an object', () => {
      expect(typeof FRAMEWORK_LAWS).toBe('object');
      expect(FRAMEWORK_LAWS).not.toBeNull();
    });

    it('should have angular framework', () => {
      expect(FRAMEWORK_LAWS.angular).toBeDefined();
      expect(Array.isArray(FRAMEWORK_LAWS.angular)).toBe(true);
    });

    it('should have react framework', () => {
      expect(FRAMEWORK_LAWS.react).toBeDefined();
      expect(Array.isArray(FRAMEWORK_LAWS.react)).toBe(true);
    });

    it('should have vue framework', () => {
      expect(FRAMEWORK_LAWS.vue).toBeDefined();
      expect(Array.isArray(FRAMEWORK_LAWS.vue)).toBe(true);
    });
  });

  // ============================================
  // PROJECT_LAWS structure
  // ============================================
  describe('PROJECT_LAWS structure', () => {
    it('should be an object', () => {
      expect(typeof PROJECT_LAWS).toBe('object');
      expect(PROJECT_LAWS).not.toBeNull();
    });

    it('ships no vendor-specific project profiles (framework/vendor-neutral)', () => {
      // RoC ships an empty PROJECT_LAWS map; consumers define their own profiles.
      expect(Object.keys(PROJECT_LAWS)).toHaveLength(0);
    });

    it('all project law entries should be arrays of strings', () => {
      for (const [projectName, laws] of Object.entries(PROJECT_LAWS)) {
        expect(Array.isArray(laws)).toBe(true);
        for (const lawId of laws) {
          expect(typeof lawId).toBe('string');
        }
      }
    });
  });

  // ============================================
  // ID uniqueness
  // ============================================
  describe('ID uniqueness within categories', () => {
    it('HIGH_IMPACT should have unique IDs', () => {
      const uniqueIds = new Set(PARETO_CATEGORIES.HIGH_IMPACT);
      expect(uniqueIds.size).toBe(PARETO_CATEGORIES.HIGH_IMPACT.length);
    });

    it('MEDIUM_IMPACT should have unique IDs', () => {
      const uniqueIds = new Set(PARETO_CATEGORIES.MEDIUM_IMPACT);
      expect(uniqueIds.size).toBe(PARETO_CATEGORIES.MEDIUM_IMPACT.length);
    });

    it('LOW_IMPACT should have unique IDs', () => {
      const uniqueIds = new Set(PARETO_CATEGORIES.LOW_IMPACT);
      expect(uniqueIds.size).toBe(PARETO_CATEGORIES.LOW_IMPACT.length);
    });
  });

  // ============================================
  // Helper functions
  // ============================================
  describe('Helper functions', () => {
    it('getOptimizationCategory should return HIGH_IMPACT for high impact laws', () => {
      if (PARETO_CATEGORIES.HIGH_IMPACT.length > 0) {
        const highImpactId = PARETO_CATEGORIES.HIGH_IMPACT[0] as string;
        const category = getOptimizationCategory(highImpactId);
        expect(category).toBe('HIGH_IMPACT');
      }
    });

    it('getOptimizationCategory should return MEDIUM_IMPACT for medium impact laws', () => {
      if (PARETO_CATEGORIES.MEDIUM_IMPACT.length > 0) {
        const mediumImpactId = PARETO_CATEGORIES.MEDIUM_IMPACT[0] as string;
        const category = getOptimizationCategory(mediumImpactId);
        expect(category).toBe('MEDIUM_IMPACT');
      }
    });

    it('getOptimizationCategory should return LOW_IMPACT for unknown laws', () => {
      const category = getOptimizationCategory('unknown-law-id');
      expect(category).toBe('LOW_IMPACT');
    });

    it('getFrameworkRelevance should return array of frameworks', () => {
      const frameworks = getFrameworkRelevance('any-law-id');
      expect(Array.isArray(frameworks)).toBe(true);
    });

    it('getFrameworkRelevance should return angular for angular laws', () => {
      if (FRAMEWORK_LAWS.angular.length > 0) {
        const angularLawId = FRAMEWORK_LAWS.angular[0] as string;
        const frameworks = getFrameworkRelevance(angularLawId);
        expect(frameworks).toContain('angular');
      }
    });

    it('isProjectSpecific should return boolean', () => {
      const result = isProjectSpecific('any-law-id');
      expect(typeof result).toBe('boolean');
    });

    it('isProjectSpecific should return true for project-specific laws', () => {
      const projectLawIds = Object.values(PROJECT_LAWS).flat();
      if (projectLawIds.length > 0) {
        const firstProjectLaw = projectLawIds[0] as string;
        const result = isProjectSpecific(firstProjectLaw);
        expect(result).toBe(true);
      }
    });

    it('isProjectSpecific should return false for non-project laws', () => {
      const result = isProjectSpecific('definitely-not-a-project-law-id');
      expect(result).toBe(false);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    await new Promise(resolve => setTimeout(resolve, 50));
  });
});
