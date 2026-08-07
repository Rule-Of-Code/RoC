/**
 * Enhanced Laws Registry - Tests
 * Tests for the enhanced constitutional laws registry singleton
 */
import {
  EnhancedConstitutionalLawsRegistry,
  enhancedLawsRegistry,
} from '../../src/registry/enhanced-laws-registry';

describe('Enhanced Laws Registry', () => {
  // ============================================
  // Singleton pattern
  // ============================================
  describe('Singleton pattern', () => {
    it('should return an instance via getInstance', () => {
      const instance = EnhancedConstitutionalLawsRegistry.getInstance();
      expect(instance).toBeDefined();
      expect(instance).toBeInstanceOf(EnhancedConstitutionalLawsRegistry);
    });

    it('should return the same instance on multiple calls', () => {
      const instance1 = EnhancedConstitutionalLawsRegistry.getInstance();
      const instance2 = EnhancedConstitutionalLawsRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should export enhancedLawsRegistry singleton', () => {
      expect(enhancedLawsRegistry).toBeDefined();
      expect(enhancedLawsRegistry).toBeInstanceOf(
        EnhancedConstitutionalLawsRegistry
      );
    });

    it('exported singleton should be same as getInstance', () => {
      const instance = EnhancedConstitutionalLawsRegistry.getInstance();
      expect(enhancedLawsRegistry).toBe(instance);
    });
  });

  // ============================================
  // getAllLaws
  // ============================================
  describe('getAllLaws', () => {
    it('should return an array', () => {
      const laws = enhancedLawsRegistry.getAllLaws();
      expect(Array.isArray(laws)).toBe(true);
    });

    it('should return multiple laws', () => {
      const laws = enhancedLawsRegistry.getAllLaws();
      expect(laws.length).toBeGreaterThan(10);
    });

    it('all laws should have required properties', () => {
      const laws = enhancedLawsRegistry.getAllLaws();
      for (const law of laws) {
        expect(typeof law.id).toBe('string');
        expect(typeof law.title).toBe('string');
        expect(typeof law.description).toBe('string');
        expect(typeof law.category).toBe('string');
        expect(typeof law.priority).toBe('string');
      }
    });
  });

  // ============================================
  // getLawById
  // ============================================
  describe('getLawById', () => {
    it('should return undefined for non-existent ID', () => {
      const law = enhancedLawsRegistry.getLawById('non-existent-id');
      expect(law).toBeUndefined();
    });

    it('should return law for valid ID', () => {
      const allLaws = enhancedLawsRegistry.getAllLaws();
      if (allLaws.length > 0) {
        const firstLaw = allLaws[0];
        const foundLaw = enhancedLawsRegistry.getLawById(
          firstLaw?.id as string
        );
        expect(foundLaw).toBeDefined();
        expect(foundLaw?.id).toBe(firstLaw?.id);
      }
    });

    it('should return correct law properties', () => {
      const allLaws = enhancedLawsRegistry.getAllLaws();
      if (allLaws.length > 0) {
        const firstLaw = allLaws[0];
        const foundLaw = enhancedLawsRegistry.getLawById(
          firstLaw?.id as string
        );
        expect(foundLaw?.title).toBe(firstLaw?.title);
        expect(foundLaw?.description).toBe(firstLaw?.description);
      }
    });
  });

  // ============================================
  // getPriorityStats
  // ============================================
  describe('getPriorityStats', () => {
    it('should return an object', () => {
      const stats = enhancedLawsRegistry.getPriorityStats();
      expect(typeof stats).toBe('object');
    });

    it('should have valid priority keys', () => {
      const stats = enhancedLawsRegistry.getPriorityStats();
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const key of Object.keys(stats)) {
        expect(validPriorities).toContain(key);
      }
    });

    it('should have numeric values', () => {
      const stats = enhancedLawsRegistry.getPriorityStats();
      for (const value of Object.values(stats)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      }
    });

    it('stats sum should equal total laws', () => {
      const stats = enhancedLawsRegistry.getPriorityStats();
      const totalFromStats = Object.values(stats).reduce((a, b) => a + b, 0);
      const totalLaws = enhancedLawsRegistry.getAllLaws().length;
      expect(totalFromStats).toBe(totalLaws);
    });
  });

  // ============================================
  // Law integrity
  // ============================================
  describe('Law integrity', () => {
    it('all laws should have unique IDs', () => {
      const laws = enhancedLawsRegistry.getAllLaws();
      const ids = laws.map(l => l.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('laws should have valid category', () => {
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
      const laws = enhancedLawsRegistry.getAllLaws();
      for (const law of laws) {
        expect(validCategories).toContain(law.category);
      }
    });
  });
});
