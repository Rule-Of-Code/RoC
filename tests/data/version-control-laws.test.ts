/**
 * Version Control Laws Data - Tests
 * Tests for version control laws data array
 */
import { VERSION_CONTROL_LAWS } from '../../src/data/version-control-laws';

describe('Version Control Laws Data', () => {
  // ============================================
  // Array structure
  // ============================================
  describe('Array structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(VERSION_CONTROL_LAWS)).toBe(true);
    });

    it('should have multiple version control laws', () => {
      expect(VERSION_CONTROL_LAWS.length).toBeGreaterThan(5);
    });

    it('should have unique IDs', () => {
      const ids = VERSION_CONTROL_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have legacy IDs defined', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });
  });

  // ============================================
  // Law properties
  // ============================================
  describe('Law properties', () => {
    it('all laws should have id string', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(law.id.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have legacyId number', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });

    it('all laws should have article or section defined', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        const hasSection = law.section !== undefined;
        const hasArticle = law.article !== undefined;
        expect(hasSection || hasArticle).toBe(true);
      }
    });

    it('all laws should have subsection in proper format', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(law.subsection).toMatch(/^\d+\.\d+$/);
      }
    });

    it('all laws should have title string', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.title).toBe('string');
        expect(law.title.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have emoji', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.emoji).toBe('string');
        expect(law.emoji.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have description string', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.description).toBe('string');
        expect(law.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Version control category
  // ============================================
  describe('Version control category', () => {
    it('all laws should have category VERSION_CONTROL', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(law.category).toBe('VERSION_CONTROL');
      }
    });

    it('all laws should have valid priority', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of VERSION_CONTROL_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });

    it('all laws should have defaultEnabled boolean', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.defaultEnabled).toBe('boolean');
      }
    });

    it('all laws should have valid defaultSeverity', () => {
      const validSeverities = ['error', 'warning', 'info'];
      for (const law of VERSION_CONTROL_LAWS) {
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
      for (const law of VERSION_CONTROL_LAWS) {
        expect(validAutomation).toContain(law.automation);
      }
    });

    it('all laws should have checkFunction', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.checkFunction).toBe('string');
        expect((law.checkFunction as string).length).toBeGreaterThan(0);
      }
    });

    it('all laws should have violationMessage', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.violationMessage).toBe('string');
        expect(law.violationMessage).toMatch(/VIOLATION/i);
      }
    });

    it('all laws should have remediation', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(typeof law.remediation).toBe('string');
        expect(law.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Specific version control laws
  // ============================================
  describe('Specific version control laws', () => {
    it('should include Branch Governance Standards', () => {
      const law = VERSION_CONTROL_LAWS.find(l =>
        l.title.includes('Branch Governance')
      );
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(20);
    });

    it('should include Commit Message Standards', () => {
      const law = VERSION_CONTROL_LAWS.find(l =>
        l.title.includes('Commit Message')
      );
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(21);
    });

    it('should include Pull Request Workflow Standards', () => {
      const law = VERSION_CONTROL_LAWS.find(l =>
        l.title.includes('Pull Request')
      );
      expect(law).toBeDefined();
    });

    it('all laws should have valid subsections', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(law.subsection).toMatch(/^\d+\.\d+$/);
      }
    });
  });

  // ============================================
  // Legacy ID ranges
  // ============================================
  describe('Legacy ID ranges', () => {
    it('legacy IDs should be positive numbers', () => {
      for (const law of VERSION_CONTROL_LAWS) {
        expect(law.legacyId).toBeGreaterThan(0);
      }
    });

    it('legacy IDs should be in valid range', () => {
      const ids = VERSION_CONTROL_LAWS.map(l => l.legacyId as number);
      const minId = Math.min(...ids);
      const maxId = Math.max(...ids);
      expect(minId).toBeGreaterThan(0);
      expect(maxId).toBeLessThan(1000);
    });
  });
});
