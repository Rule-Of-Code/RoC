/**
 * Angular Laws Data - Tests
 * Tests for angular-specific laws data array
 */
import { ANGULAR_LAWS } from '../../src/data/angular-laws';

describe('Angular Laws Data', () => {
  // ============================================
  // Array structure
  // ============================================
  describe('Array structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(ANGULAR_LAWS)).toBe(true);
    });

    it('should have multiple angular laws', () => {
      expect(ANGULAR_LAWS.length).toBeGreaterThan(5);
    });

    it('should have unique IDs', () => {
      const ids = ANGULAR_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique legacy IDs', () => {
      const legacyIds = ANGULAR_LAWS.map(law => law.legacyId);
      const uniqueLegacyIds = new Set(legacyIds);
      expect(uniqueLegacyIds.size).toBe(legacyIds.length);
    });
  });

  // ============================================
  // Law properties
  // ============================================
  describe('Law properties', () => {
    it('all laws should have id string', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(law.id.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have legacyId number', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });

    it('all laws should have valid article', () => {
      const validArticles = ['IV', 'V', 'VI', 'VII', 'VIII'];
      for (const law of ANGULAR_LAWS) {
        expect(validArticles).toContain(law.article);
      }
    });

    it('all laws should have subsection in proper format', () => {
      for (const law of ANGULAR_LAWS) {
        expect(law.subsection).toMatch(/^\d+\.\d+$/);
      }
    });

    it('all laws should have title string', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.title).toBe('string');
        expect(law.title.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have emoji', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.emoji).toBe('string');
        expect(law.emoji.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have description string', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.description).toBe('string');
        expect(law.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Angular-specific category
  // ============================================
  describe('Angular-specific category', () => {
    it('all laws should have category FRAMEWORK', () => {
      for (const law of ANGULAR_LAWS) {
        expect(law.category).toBe('FRAMEWORK');
      }
    });

    it('all laws should have valid priority', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of ANGULAR_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });

    it('all laws should have defaultEnabled boolean', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.defaultEnabled).toBe('boolean');
      }
    });

    it('all laws should have valid defaultSeverity', () => {
      const validSeverities = ['error', 'warning', 'info'];
      for (const law of ANGULAR_LAWS) {
        expect(validSeverities).toContain(law.defaultSeverity);
      }
    });
  });

  // ============================================
  // Automation configuration
  // ============================================
  describe('Automation configuration', () => {
    it('all laws should have automation property', () => {
      const validAutomation = [
        'AUTOMATED',
        'MANUAL',
        'PARTIAL',
        'SEMI_AUTOMATED',
        'CONFIGURABLE',
      ];
      for (const law of ANGULAR_LAWS) {
        expect(validAutomation).toContain(law.automation);
      }
    });

    it('all laws should have checkFunction', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.checkFunction).toBe('string');
        expect((law.checkFunction as string).length).toBeGreaterThan(0);
      }
    });

    it('all laws should have violationMessage', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.violationMessage).toBe('string');
        expect(law.violationMessage).toMatch(/VIOLATION/i);
      }
    });

    it('all laws should have remediation', () => {
      for (const law of ANGULAR_LAWS) {
        expect(typeof law.remediation).toBe('string');
        expect(law.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Specific angular laws
  // ============================================
  describe('Specific angular laws', () => {
    it('should include Constitutional Compliance Headers law', () => {
      const law = ANGULAR_LAWS.find(l =>
        l.title.includes('Compliance Headers')
      );
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(30);
    });

    it('should include OnPush Change Detection law', () => {
      const law = ANGULAR_LAWS.find(l => l.title.includes('OnPush'));
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(31);
    });

    it('ships no vendor-specific UI-component law (framework/vendor-neutral)', () => {
      // Laws must name a capability, never a specific vendor's component kit —
      // no law title may carry a brand/scope token like "acme" or "@acme/ui".
      const law = ANGULAR_LAWS.find(l => /\bacme\b|@[a-z0-9-]+\/ui\b/i.test(l.title));
      expect(law).toBeUndefined();
    });

    it('should include Standalone Components law', () => {
      const law = ANGULAR_LAWS.find(l => l.title.includes('Standalone'));
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(33);
    });

    it('should have laws with unique subsections', () => {
      const subsections = ANGULAR_LAWS.map(l => l.subsection);
      const uniqueSubsections = new Set(subsections);
      expect(uniqueSubsections.size).toBe(subsections.length);
    });
  });

  // ============================================
  // Legacy ID ranges
  // ============================================
  describe('Legacy ID ranges', () => {
    it('legacy IDs should start at 30 or higher', () => {
      for (const law of ANGULAR_LAWS) {
        expect(law.legacyId).toBeGreaterThanOrEqual(30);
      }
    });

    it('legacy IDs should be in valid range', () => {
      const ids = ANGULAR_LAWS.map(l => l.legacyId as number);
      const minId = Math.min(...ids);
      const maxId = Math.max(...ids);
      expect(minId).toBeGreaterThanOrEqual(30);
      expect(maxId).toBeLessThan(100);
    });
  });
});
