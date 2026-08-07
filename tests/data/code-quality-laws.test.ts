/**
 * Code Quality Laws Data - Tests
 * Tests for code quality laws data array
 */
import { CODE_QUALITY_LAWS } from '../../src/data/code-quality-laws';

describe('Code Quality Laws Data', () => {
  // ============================================
  // Array structure
  // ============================================
  describe('Array structure', () => {
    it('should be an array', () => {
      expect(Array.isArray(CODE_QUALITY_LAWS)).toBe(true);
    });

    it('should have multiple code quality laws', () => {
      expect(CODE_QUALITY_LAWS.length).toBeGreaterThan(5);
    });

    it('should have unique IDs', () => {
      const ids = CODE_QUALITY_LAWS.map(law => law.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have unique legacy IDs', () => {
      const legacyIds = CODE_QUALITY_LAWS.map(law => law.legacyId);
      const uniqueLegacyIds = new Set(legacyIds);
      expect(uniqueLegacyIds.size).toBe(legacyIds.length);
    });
  });

  // ============================================
  // Law properties
  // ============================================
  describe('Law properties', () => {
    it('all laws should have id string', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.id).toBe('string');
        expect(law.id.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have legacyId number', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.legacyId).toBe('number');
      }
    });

    it('all laws should have article II', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(law.article).toBe('II');
      }
    });

    it('all laws should have subsection starting with "2."', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(law.subsection).toMatch(/^2\.\d+$/);
      }
    });

    it('all laws should have title string', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.title).toBe('string');
        expect(law.title.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have emoji', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.emoji).toBe('string');
        expect(law.emoji.length).toBeGreaterThan(0);
      }
    });

    it('all laws should have description string', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.description).toBe('string');
        expect(law.description.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Code quality category
  // ============================================
  describe('Code quality category', () => {
    it('all laws should have category CODE_QUALITY', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(law.category).toBe('CODE_QUALITY');
      }
    });

    it('all laws should have valid priority', () => {
      const validPriorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      for (const law of CODE_QUALITY_LAWS) {
        expect(validPriorities).toContain(law.priority);
      }
    });

    it('all laws should have defaultEnabled boolean', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.defaultEnabled).toBe('boolean');
      }
    });

    it('all laws should have valid defaultSeverity', () => {
      const validSeverities = ['error', 'warning', 'info'];
      for (const law of CODE_QUALITY_LAWS) {
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
      for (const law of CODE_QUALITY_LAWS) {
        expect(validAutomation).toContain(law.automation);
      }
    });

    it('all laws should have checkFunction', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.checkFunction).toBe('string');
        expect((law.checkFunction as string).length).toBeGreaterThan(0);
      }
    });

    it('all laws should have violationMessage', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.violationMessage).toBe('string');
        expect(law.violationMessage).toMatch(/VIOLATION/i);
      }
    });

    it('all laws should have remediation', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(typeof law.remediation).toBe('string');
        expect(law.remediation.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================
  // Specific code quality laws
  // ============================================
  describe('Specific code quality laws', () => {
    it('should include Zero Tolerance Doctrine', () => {
      const law = CODE_QUALITY_LAWS.find(l =>
        l.title.includes('Zero Tolerance')
      );
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(10);
    });

    it('should include NX Commands Only Policy', () => {
      const law = CODE_QUALITY_LAWS.find(l => l.title.includes('NX Commands'));
      expect(law).toBeDefined();
      expect(law?.legacyId).toBe(11);
    });

    it('all laws should have unique subsections', () => {
      const subsections = CODE_QUALITY_LAWS.map(l => l.subsection);
      const uniqueSubsections = new Set(subsections);
      expect(uniqueSubsections.size).toBe(subsections.length);
    });
  });

  // ============================================
  // Legacy ID ranges
  // ============================================
  describe('Legacy ID ranges', () => {
    it('legacy IDs should start at 10 or higher', () => {
      for (const law of CODE_QUALITY_LAWS) {
        expect(law.legacyId).toBeGreaterThanOrEqual(10);
      }
    });

    it('legacy IDs should be in valid range', () => {
      const ids = CODE_QUALITY_LAWS.map(l => l.legacyId as number);
      const minId = Math.min(...ids);
      const maxId = Math.max(...ids);
      expect(minId).toBeGreaterThanOrEqual(10);
      expect(maxId).toBeLessThan(30);
    });
  });
});
