/**
 * Sacred Laws Data - Tests
 * Tests for sacred laws data array
 */
import { SACRED_LAWS } from '../../src/data/sacred-laws';

describe('Sacred Laws Data', () => {
  // ============================================
  // Array structure
  // ============================================
  describe('Array structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(SACRED_LAWS)).toBe(true);
    });

    it('should have at least 5 sacred laws', () => {
      expect(SACRED_LAWS.length).toBeGreaterThanOrEqual(5);
    });

    it('should have unique IDs', () => {
      const ids = SACRED_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique legacy IDs', () => {
      const legacyIds = SACRED_LAWS.map(law => law.legacyId);
      const uniqueLegacyIds = new Set(legacyIds);
      expect(uniqueLegacyIds.size).toBe(legacyIds.length);
    });
  });

  // ============================================
  // Law properties
  // ============================================
  describe('Law properties', () => {
    it('all laws should have id string', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(law.id.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have legacyId number', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });

    it('all laws should have article "I"', () => {
      for (const law of SACRED_LAWS) {
        expect(law.article).toBe('I');
      }
    });

    it('all laws should have subsection starting with "1."', () => {
      for (const law of SACRED_LAWS) {
        expect(law.subsection).toMatch(/^1\.\d+$/);
      }
    });

    it('all laws should have title string', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.title).toBe('string');
        expect(law.title.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have emoji', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.emoji).toBe('string');
        expect(law.emoji.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have description string', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.description).toBe('string');
        expect(law.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Sacred law category
  // ============================================
  describe('Sacred law category', () => {
    it('all laws should have category SACRED_LAW', () => {
      for (const law of SACRED_LAWS) {
        expect(law.category).toBe('SACRED_LAW');
      }
    });

    it('all laws should have priority CRITICAL', () => {
      for (const law of SACRED_LAWS) {
        expect(law.priority).toBe('CRITICAL');
      }
    });

    it('all laws should be defaultEnabled', () => {
      for (const law of SACRED_LAWS) {
        expect(law.defaultEnabled).toBe(true);
      }
    });

    it('all laws should have defaultSeverity "error"', () => {
      for (const law of SACRED_LAWS) {
        expect(law.defaultSeverity).toBe('error');
      }
    });
  });

  // ============================================
  // Automation configuration
  // ============================================
  describe('Automation configuration', () => {
    it('all laws should have automation property', () => {
      for (const law of SACRED_LAWS) {
        expect(law.automation).toBeDefined();
      }
    });

    it('all laws should have checkFunction', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.checkFunction).toBe('string');
        expect((law.checkFunction as string).length).toBeGreaterThan(0);
      }
    });

    it('all laws should have violationMessage', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.violationMessage).toBe('string');
        expect(law.violationMessage).toContain('CONSTITUTIONAL VIOLATION');
      }
    });

    it('all laws should have remediation', () => {
      for (const law of SACRED_LAWS) {
        expect(typeof law.remediation).toBe('string');
        expect(law.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Specific sacred laws
  // ============================================
  describe('Specific sacred laws', () => {
    it('should include Zero Tolerance Doctrine', () => {
      const zeroTolerance = SACRED_LAWS.find(law =>
        law.title.includes('Zero Tolerance')
      );
      expect(zeroTolerance).toBeDefined();
      expect(zeroTolerance?.legacyId).toBe(2);
    });

    it('should include Investment-Grade Quality', () => {
      const investmentGrade = SACRED_LAWS.find(law =>
        law.title.includes('Investment-Grade')
      );
      expect(investmentGrade).toBeDefined();
      expect(investmentGrade?.legacyId).toBe(3);
    });

    it('should include TypeScript Strict Mode', () => {
      const tsStrict = SACRED_LAWS.find(law =>
        law.title.includes('TypeScript Strict')
      );
      expect(tsStrict).toBeDefined();
      expect(tsStrict?.legacyId).toBe(5);
    });
  });
});
