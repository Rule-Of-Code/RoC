/**
 * Deployment Laws Data - Tests
 * Tests for deployment laws data array
 */
import { DEPLOYMENT_LAWS } from '../../src/data/deployment-laws';

describe('Deployment Laws Data', () => {
  // ============================================
  // Array structure
  // ============================================
  describe('Array structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(DEPLOYMENT_LAWS)).toBe(true);
    });

    it('should have multiple deployment laws', () => {
      expect(DEPLOYMENT_LAWS.length).toBeGreaterThan(3);
    });

    it('should have unique IDs', () => {
      const ids = DEPLOYMENT_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have legacy IDs defined', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });
  });

  // ============================================
  // Law properties
  // ============================================
  describe('Law properties', () => {
    it('all laws should have id string', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(law.id.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have legacyId number', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });

    it('all laws should have section or article defined', () => {
      for (const law of DEPLOYMENT_LAWS) {
        const hasSection = law.section !== undefined;
        const hasArticle = law.article !== undefined;
        expect(hasSection || hasArticle).toBe(true);
      }
    });

    it('all laws should have subsection in proper format', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(law.subsection).toMatch(/^\d+\.\d+$/);
      }
    });

    it('all laws should have title string', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.title).toBe('string');
        expect(law.title.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have emoji', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.emoji).toBe('string');
        expect(law.emoji.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have description string', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.description).toBe('string');
        expect(law.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Deployment category
  // ============================================
  describe('Deployment category', () => {
    it('all laws should have category DEPLOYMENT', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(law.category).toBe('DEPLOYMENT');
      }
    });

    it('all laws should have valid priority', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of DEPLOYMENT_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });

    it('all laws should have defaultEnabled boolean', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.defaultEnabled).toBe('boolean');
      }
    });

    it('all laws should have valid defaultSeverity', () => {
      const validSeverities = ['error', 'warning', 'info'];
      for (const law of DEPLOYMENT_LAWS) {
        expect(validSeverities).toContain(law.defaultSeverity);
      }
    });
  });

  // ============================================
  // Automation configuration
  // ============================================
  describe('Automation configuration', () => {
    it('all laws should have valid automation property', () => {
      const validAutomation = [
        'AUTOMATED',
        'MANUAL',
        'PARTIAL',
        'SEMI_AUTOMATED',
        'CONFIGURABLE',
      ];
      for (const law of DEPLOYMENT_LAWS) {
        expect(validAutomation).toContain(law.automation);
      }
    });

    it('all laws should have checkFunction', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.checkFunction).toBe('string');
        expect((law.checkFunction as string).length).toBeGreaterThan(0);
      }
    });

    it('all laws should have violationMessage', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.violationMessage).toBe('string');
        expect(law.violationMessage).toMatch(/VIOLATION/i);
      }
    });

    it('all laws should have remediation', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(typeof law.remediation).toBe('string');
        expect(law.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Specific deployment laws
  // ============================================
  describe('Specific deployment laws', () => {
    it('should include Launch Readiness Checklist', () => {
      const law = DEPLOYMENT_LAWS.find(l =>
        l.title.includes('Launch Readiness')
      );
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(73);
    });

    it('should include Pre-Deployment Checklist', () => {
      const law = DEPLOYMENT_LAWS.find(l => l.title.includes('Pre-Deployment'));
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(71);
    });

    it('all laws should have valid subsections', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(law.subsection).toMatch(/^\d+\.\d+$/);
      }
    });
  });

  // ============================================
  // Legacy ID ranges
  // ============================================
  describe('Legacy ID ranges', () => {
    it('legacy IDs should be positive numbers', () => {
      for (const law of DEPLOYMENT_LAWS) {
        expect(law.legacyId).toBeGreaterThan(0);
      }
    });

    it('legacy IDs should be in valid range', () => {
      const ids = DEPLOYMENT_LAWS.map(l => l.legacyId as number);
      const minId = Math.min(...ids);
      const maxId = Math.max(...ids);
      expect(minId).toBeGreaterThan(0);
      expect(maxId).toBeLessThan(1000);
    });
  });
});
