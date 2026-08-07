/**
 * Data-integrity tests for the Python laws (FastAPI + Clean Architecture/CQRS).
 */
import { PYTHON_LAWS } from '../../src/data/python-laws';

describe('Python Laws Data', () => {
  it('exports at least one law', () => {
    expect(PYTHON_LAWS.length).toBeGreaterThan(0);
  });

  it('every law has the required fields and PYTHON category', () => {
    for (const law of PYTHON_LAWS) {
      expect(typeof law.id).toBe('string');
      expect(law.id.length).toBeGreaterThan(0);
      expect(typeof law.legacyId).toBe('number');
      expect(law.title.length).toBeGreaterThan(0);
      expect(law.emoji.length).toBeGreaterThan(0);
      expect(law.description.length).toBeGreaterThan(0);
      expect(law.category).toBe('PYTHON');
      expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).toContain(law.priority);
      expect(['error', 'warning', 'info']).toContain(law.defaultSeverity);
      expect((law.checkFunction as string).length).toBeGreaterThan(0);
      expect(law.remediation.length).toBeGreaterThan(0);
    }
  });

  it('uses the dedicated Python legacyId range (200-299)', () => {
    for (const law of PYTHON_LAWS) {
      expect(law.legacyId).toBeGreaterThanOrEqual(200);
      expect(law.legacyId).toBeLessThan(300);
    }
  });

  it('has unique legacyIds and ids', () => {
    const ids = PYTHON_LAWS.map(l => l.id);
    const legacyIds = PYTHON_LAWS.map(l => l.legacyId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(legacyIds).size).toBe(legacyIds.length);
  });
});
