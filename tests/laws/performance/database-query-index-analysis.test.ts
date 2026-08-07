/**
 * Tests for DatabaseQueryOptimizationIndexConstants
 *
 * Tests index analysis, complexity levels, and field validation.
 */
import {
  DatabaseIndex,
  DatabaseQueryOptimizationIndexConstants,
} from '../../../src/laws/performance/database-query-optimization/constants/index-analysis';

describe('DatabaseQueryOptimizationIndexConstants', () => {
  describe('DatabaseIndex interface', () => {
    it('should require fields array', () => {
      const index: DatabaseIndex = {
        fields: ['field1', 'field2'],
      };
      expect(Array.isArray(index.fields)).toBe(true);
    });

    it('should allow optional queryScope', () => {
      const index: DatabaseIndex = {
        fields: ['field1'],
        queryScope: 'COLLECTION',
      };
      expect(index.queryScope).toBe('COLLECTION');
    });

    it('should allow additional properties', () => {
      const index: DatabaseIndex = {
        fields: ['field1'],
        order: 'ASCENDING',
      };
      expect(index.order).toBe('ASCENDING');
    });
  });

  describe('hasCompositeIndexes', () => {
    it('should return false for empty indexes array', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes({
          indexes: [],
        })
      ).toBe(false);
    });

    it('should return false for undefined indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes({})
      ).toBe(false);
    });

    it('should return false for single field indexes only', () => {
      const config = {
        indexes: [{ fields: ['field1'] }, { fields: ['field2'] }],
      };
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes(config)
      ).toBe(false);
    });

    it('should return true for composite indexes', () => {
      const config = {
        indexes: [{ fields: ['field1', 'field2'] }],
      };
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes(config)
      ).toBe(true);
    });

    it('should return true when at least one composite index exists', () => {
      const config = {
        indexes: [{ fields: ['field1'] }, { fields: ['field1', 'field2'] }],
      };
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes(config)
      ).toBe(true);
    });

    it('should return true for three-field composite index', () => {
      const config = {
        indexes: [{ fields: ['a', 'b', 'c'] }],
      };
      expect(
        DatabaseQueryOptimizationIndexConstants.hasCompositeIndexes(config)
      ).toBe(true);
    });
  });

  describe('getIndexComplexityLevel', () => {
    it('should return low for 0 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(0)
      ).toBe('low');
    });

    it('should return medium for 1 index', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(1)
      ).toBe('medium');
    });

    it('should return medium for 2 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(2)
      ).toBe('medium');
    });

    it('should return medium for 3 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(3)
      ).toBe('medium');
    });

    it('should return medium for 4 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(4)
      ).toBe('medium');
    });

    it('should return high for 5 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(5)
      ).toBe('high');
    });

    it('should return high for 10 indexes', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.getIndexComplexityLevel(10)
      ).toBe('high');
    });
  });

  describe('hasValidIndexFields', () => {
    it('should return true for valid single field', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: ['userId'],
        })
      ).toBe(true);
    });

    it('should return true for valid multiple fields', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: ['userId', 'createdAt', 'status'],
        })
      ).toBe(true);
    });

    it('should return false for empty fields array', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: [],
        })
      ).toBe(false);
    });

    it('should return false for empty string field', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: [''],
        })
      ).toBe(false);
    });

    it('should return false if any field is empty string', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: ['userId', '', 'status'],
        })
      ).toBe(false);
    });

    it('should return true for fields with dots (nested paths)', () => {
      expect(
        DatabaseQueryOptimizationIndexConstants.hasValidIndexFields({
          fields: ['user.profile.name'],
        })
      ).toBe(true);
    });
  });
});
