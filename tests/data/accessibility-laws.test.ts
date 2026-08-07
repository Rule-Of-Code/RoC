/**
 * Tests for ACCESSIBILITY_LAWS data module (v7.2.0).
 */
import { ACCESSIBILITY_LAWS } from '../../src/data/accessibility-laws';

describe('Accessibility Laws Data', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(ACCESSIBILITY_LAWS)).toBe(true);
    expect(ACCESSIBILITY_LAWS.length).toBeGreaterThan(0);
  });

  it('has unique hash ids and unique legacy ids', () => {
    const ids = ACCESSIBILITY_LAWS.map(l => l.id);
    const legacy = ACCESSIBILITY_LAWS.map(l => l.legacyId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(legacy).size).toBe(legacy.length);
  });

  it('legacy IDs are in the accessibility range [90, 100)', () => {
    const legacy = ACCESSIBILITY_LAWS.map(l => l.legacyId as number);
    expect(Math.min(...legacy)).toBeGreaterThanOrEqual(90);
    expect(Math.max(...legacy)).toBeLessThan(100);
  });

  it('every law has the required fields and ACCESSIBILITY category', () => {
    for (const law of ACCESSIBILITY_LAWS) {
      expect(law.id.length).toBeGreaterThan(0);
      expect(law.title.length).toBeGreaterThan(0);
      expect(law.emoji.length).toBeGreaterThan(0);
      expect(law.description.length).toBeGreaterThan(0);
      expect((law.checkFunction as string).length).toBeGreaterThan(0);
      expect(law.remediation.length).toBeGreaterThan(0);
      expect(law.category).toBe('ACCESSIBILITY');
    }
  });

  it('checkFunction names follow the ClassName.check convention', () => {
    for (const law of ACCESSIBILITY_LAWS) {
      expect(law.checkFunction as string).toMatch(/^[A-Z]\w+Law\.check$/);
    }
  });
});
