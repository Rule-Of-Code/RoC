/**
 * Constitutional Laws Module - Tests
 * Tests for the main constitutional laws re-export module
 */
import {
  ANGULAR_LAWS,
  CODE_QUALITY_LAWS,
  CONSTITUTIONAL_LAWS,
  FRAMEWORK_LAWS,
  PARETO_CATEGORIES,
  PROJECT_LAWS,
  SACRED_LAWS,
  VERSION_CONTROL_LAWS,
  getDefaultEnabledLaws,
  getFrameworkLaws,
  getLawsByCategory,
  getLawsByPriority,
  getParetoOptimizedLaws,
  getProjectLaws,
} from '../../src/data/constitutional-laws';

describe('Constitutional Laws Module', () => {
  // ============================================
  // Main exports
  // ============================================
  describe('Main exports', () => {
    it('should export CONSTITUTIONAL_LAWS array', () => {
      expect(Array.isArray(CONSTITUTIONAL_LAWS)).toBe(true);
      expect(CONSTITUTIONAL_LAWS.length).toBeGreaterThan(0);
    });

    it('should export SACRED_LAWS array', () => {
      expect(Array.isArray(SACRED_LAWS)).toBe(true);
      expect(SACRED_LAWS.length).toBeGreaterThan(0);
    });

    it('should export ANGULAR_LAWS array', () => {
      expect(Array.isArray(ANGULAR_LAWS)).toBe(true);
      expect(ANGULAR_LAWS.length).toBeGreaterThan(0);
    });

    it('should export CODE_QUALITY_LAWS array', () => {
      expect(Array.isArray(CODE_QUALITY_LAWS)).toBe(true);
      expect(CODE_QUALITY_LAWS.length).toBeGreaterThan(0);
    });

    it('should export VERSION_CONTROL_LAWS array', () => {
      expect(Array.isArray(VERSION_CONTROL_LAWS)).toBe(true);
      expect(VERSION_CONTROL_LAWS.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Categorized law arrays
  // ============================================
  describe('Categorized law arrays', () => {
    it('should export FRAMEWORK_LAWS', () => {
      expect(FRAMEWORK_LAWS).toBeDefined();
    });

    it('should export PROJECT_LAWS', () => {
      expect(PROJECT_LAWS).toBeDefined();
    });

    it('should export PARETO_CATEGORIES object', () => {
      expect(typeof PARETO_CATEGORIES).toBe('object');
      expect(PARETO_CATEGORIES).not.toBeNull();
    });
  });

  // ============================================
  // Helper functions
  // ============================================
  describe('Helper functions', () => {
    it('getLawsByCategory should return laws by category', () => {
      const sacredLaws = getLawsByCategory('SACRED_LAW');
      expect(Array.isArray(sacredLaws)).toBe(true);
      for (const law of sacredLaws) {
        expect(law.category).toBe('SACRED_LAW');
      }
    });

    it('getLawsByPriority should return laws by priority', () => {
      const criticalLaws = getLawsByPriority('CRITICAL');
      expect(Array.isArray(criticalLaws)).toBe(true);
      for (const law of criticalLaws) {
        expect(law.priority).toBe('CRITICAL');
      }
    });

    it('getDefaultEnabledLaws should return enabled laws', () => {
      const enabledLaws = getDefaultEnabledLaws();
      expect(Array.isArray(enabledLaws)).toBe(true);
      for (const law of enabledLaws) {
        expect(law.defaultEnabled).toBe(true);
      }
    });

    it('getFrameworkLaws should return framework laws for angular', () => {
      const frameworkLaws = getFrameworkLaws('angular');
      expect(Array.isArray(frameworkLaws)).toBe(true);
    });

    it('getProjectLaws should return project-specific laws', () => {
      const projectLaws = getProjectLaws('test-project');
      expect(Array.isArray(projectLaws)).toBe(true);
    });

    it('getParetoOptimizedLaws should return pareto optimized laws', () => {
      const paretoLaws = getParetoOptimizedLaws();
      expect(Array.isArray(paretoLaws)).toBe(true);
      expect(paretoLaws.length).toBeLessThan(CONSTITUTIONAL_LAWS.length);
    });
  });

  // ============================================
  // Law integrity
  // ============================================
  describe('Law integrity', () => {
    it('CONSTITUTIONAL_LAWS should contain all sacred laws', () => {
      for (const sacredLaw of SACRED_LAWS) {
        const found = CONSTITUTIONAL_LAWS.find(l => l.id === sacredLaw.id);
        expect(found).toBeDefined();
      }
    });

    it('CONSTITUTIONAL_LAWS should contain all angular laws', () => {
      for (const angularLaw of ANGULAR_LAWS) {
        const found = CONSTITUTIONAL_LAWS.find(l => l.id === angularLaw.id);
        expect(found).toBeDefined();
      }
    });

    it('CONSTITUTIONAL_LAWS should contain all code quality laws', () => {
      for (const qualityLaw of CODE_QUALITY_LAWS) {
        const found = CONSTITUTIONAL_LAWS.find(l => l.id === qualityLaw.id);
        expect(found).toBeDefined();
      }
    });

    it('all laws should have unique IDs', () => {
      const ids = CONSTITUTIONAL_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ============================================
  // Law structure
  // ============================================
  describe('Law structure', () => {
    it('all laws should have required properties', () => {
      for (const law of CONSTITUTIONAL_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(typeof law.title).toBe('string');
        expect(typeof law.description).toBe('string');
        expect(typeof law.category).toBe('string');
        expect(typeof law.priority).toBe('string');
        expect(typeof law.defaultEnabled).toBe('boolean');
      }
    });

    it('all laws should have valid category', () => {
      const validCategories = [
        'SACRED_LAW',
        'CODE_QUALITY',
        'VERSION_CONTROL',
        'FRAMEWORK',
        'SECURITY',
        'PERFORMANCE',
        'TESTING',
        'DOCUMENTATION',
        'DEPLOYMENT',
        'ACCESSIBILITY',
        'PYTHON',
      ];
      for (const law of CONSTITUTIONAL_LAWS) {
        expect(validCategories).toContain(law.category);
      }
    });

    it('all laws should have valid priority', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of CONSTITUTIONAL_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });
  });
});
