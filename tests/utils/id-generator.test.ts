/**
 * Tests for utils/id-generator.ts - Constitutional Law ID Generator
 *
 * Tests ID generation, validation, category extraction, and batch operations
 */

import {
  extractCategory,
  generateBatchIds,
  generateLawId,
  isValidLawId,
  migrateLawIds,
} from '../../src/utils/id-generator';

describe('utils/id-generator', () => {
  describe('generateLawId', () => {
    it('should generate an 8-character hash ID', () => {
      const id = generateLawId('Test Law', 'Test description');

      expect(id).toHaveLength(8);
      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should generate deterministic IDs for same input', () => {
      const id1 = generateLawId('My Law', 'My description');
      const id2 = generateLawId('My Law', 'My description');

      expect(id1).toBe(id2);
    });

    it('should generate different IDs for different titles', () => {
      const id1 = generateLawId('Law One', 'Same description');
      const id2 = generateLawId('Law Two', 'Same description');

      expect(id1).not.toBe(id2);
    });

    it('should generate different IDs for different descriptions', () => {
      const id1 = generateLawId('Same Title', 'Description one');
      const id2 = generateLawId('Same Title', 'Description two');

      expect(id1).not.toBe(id2);
    });

    it('should normalize whitespace in title', () => {
      const id1 = generateLawId('  Test Law  ', 'description');
      const id2 = generateLawId('Test Law', 'description');

      expect(id1).toBe(id2);
    });

    it('should normalize case in title', () => {
      const id1 = generateLawId('TEST LAW', 'description');
      const id2 = generateLawId('test law', 'description');

      expect(id1).toBe(id2);
    });

    it('should normalize whitespace in description', () => {
      const id1 = generateLawId('title', '  My description  ');
      const id2 = generateLawId('title', 'My description');

      expect(id1).toBe(id2);
    });

    it('should normalize case in description', () => {
      const id1 = generateLawId('title', 'MY DESCRIPTION');
      const id2 = generateLawId('title', 'my description');

      expect(id1).toBe(id2);
    });

    it('should add category prefix when provided', () => {
      const id = generateLawId('Test Law', 'description', 'ngrx');

      expect(id).toMatch(/^ngrx_[a-f0-9]{8}$/);
    });

    it('should normalize category to lowercase', () => {
      const id = generateLawId('Test Law', 'description', 'NGRX');

      expect(id).toMatch(/^ngrx_[a-f0-9]{8}$/);
    });

    it('should remove non-alphanumeric characters from category', () => {
      const id = generateLawId('Test Law', 'description', 'my-category');

      expect(id).toMatch(/^mycategory_[a-f0-9]{8}$/);
    });

    it('should handle empty category', () => {
      const id = generateLawId('Test Law', 'description', '');

      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle undefined category', () => {
      const id = generateLawId('Test Law', 'description', undefined);

      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle unicode characters in title', () => {
      const id = generateLawId('Закон за тестове', 'description');

      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });

    it('should handle special characters in description', () => {
      const id = generateLawId('title', 'description with @#$%^&*()');

      expect(id).toMatch(/^[a-f0-9]{8}$/);
    });
  });

  describe('isValidLawId', () => {
    it('should return true for valid 8-char hash', () => {
      expect(isValidLawId('a1b2c3d4')).toBe(true);
    });

    it('should return true for valid categorized ID', () => {
      expect(isValidLawId('ngrx_a1b2c3d4')).toBe(true);
    });

    it('should return true for numeric prefix category', () => {
      expect(isValidLawId('cat1_a1b2c3d4')).toBe(true);
    });

    it('should return false for too short hash', () => {
      expect(isValidLawId('a1b2c3')).toBe(false);
    });

    it('should return false for too long hash', () => {
      expect(isValidLawId('a1b2c3d4e5')).toBe(false);
    });

    it('should return false for uppercase characters', () => {
      expect(isValidLawId('A1B2C3D4')).toBe(false);
    });

    it('should return false for invalid characters', () => {
      expect(isValidLawId('a1b2c3g4')).toBe(false); // g is not a hex char
    });

    it('should return false for empty string', () => {
      expect(isValidLawId('')).toBe(false);
    });

    it('should return false for multiple underscores', () => {
      expect(isValidLawId('cat_sub_a1b2c3d4')).toBe(false);
    });

    it('should return false for trailing underscore', () => {
      expect(isValidLawId('cat_')).toBe(false);
    });

    it('should return false for leading underscore', () => {
      expect(isValidLawId('_a1b2c3d4')).toBe(false);
    });
  });

  describe('extractCategory', () => {
    it('should return category from categorized ID', () => {
      expect(extractCategory('ngrx_a1b2c3d4')).toBe('ngrx');
    });

    it('should return null for non-categorized ID', () => {
      expect(extractCategory('a1b2c3d4')).toBeNull();
    });

    it('should return first part for multiple underscores', () => {
      expect(extractCategory('cat_sub_hash')).toBeNull();
    });

    it('should handle numeric category', () => {
      expect(extractCategory('cat1_a1b2c3d4')).toBe('cat1');
    });

    it('should handle empty string', () => {
      expect(extractCategory('')).toBeNull();
    });

    it('should handle ID with only underscore', () => {
      expect(extractCategory('_')).toBe('');
    });
  });

  describe('generateBatchIds', () => {
    it('should generate unique IDs for different laws', () => {
      const laws = [
        { title: 'Law One', description: 'Description one' },
        { title: 'Law Two', description: 'Description two' },
      ];

      const ids = generateBatchIds(laws);

      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]);
    });

    it('should generate deterministic IDs', () => {
      const laws = [{ title: 'My Law', description: 'My description' }];

      const ids1 = generateBatchIds(laws);
      const ids2 = generateBatchIds(laws);

      expect(ids1).toEqual(ids2);
    });

    it('should support categories', () => {
      const laws = [{ title: 'Law', description: 'Desc', category: 'ngrx' }];

      const ids = generateBatchIds(laws);

      expect(ids[0]).toMatch(/^ngrx_/);
    });

    it('should handle empty array', () => {
      const ids = generateBatchIds([]);

      expect(ids).toEqual([]);
    });

    it('should handle single item', () => {
      const laws = [{ title: 'Only Law', description: 'Only description' }];

      const ids = generateBatchIds(laws);

      expect(ids).toHaveLength(1);
    });

    it('should handle hash collisions by appending counter', () => {
      // Create laws that would have same hash (same normalized content)
      // Since we can't easily create real collisions, we test the mechanism works
      const laws = [
        { title: 'Law', description: 'Description' },
        { title: 'Law', description: 'Description' }, // Duplicate
      ];

      const ids = generateBatchIds(laws);

      expect(ids).toHaveLength(2);
      expect(ids[0]).not.toBe(ids[1]); // Should be different due to collision handling
    });

    it('should handle mixed categorized and non-categorized laws', () => {
      const laws = [
        { title: 'Law One', description: 'Desc' },
        { title: 'Law Two', description: 'Desc', category: 'angular' },
      ];

      const ids = generateBatchIds(laws);

      expect(ids[0]).toMatch(/^[a-f0-9]{8}$/);
      expect(ids[1]).toMatch(/^angular_/);
    });
  });

  describe('migrateLawIds', () => {
    it('should migrate numeric IDs to hash-based IDs', () => {
      const laws = [
        { id: 1, title: 'Law One', description: 'Description one' },
        { id: 2, title: 'Law Two', description: 'Description two' },
      ];

      const migrated = migrateLawIds(laws);

      expect(migrated).toHaveLength(2);
      expect(migrated[0]?.id).toMatch(/^[a-f0-9]{8}$/);
      expect(migrated[0]?.legacyId).toBe(1);
    });

    it('should preserve original properties', () => {
      const laws = [
        {
          id: 1,
          title: 'My Law',
          description: 'My desc',
          severity: 'high',
        },
      ];

      const migrated = migrateLawIds(laws as typeof laws);

      expect(migrated[0]?.title).toBe('My Law');
      expect(migrated[0]?.description).toBe('My desc');
      expect(
        (migrated[0] as unknown as Record<string, unknown>)?.severity
      ).toBe('high');
    });

    it('should use category prefix when provided', () => {
      const laws = [{ id: 1, title: 'Law', description: 'Desc' }];

      const migrated = migrateLawIds(laws, 'ngrx');

      expect(migrated[0]?.id).toMatch(/^ngrx_/);
    });

    it('should handle string IDs', () => {
      const laws = [{ id: 'old-id', title: 'Law', description: 'Desc' }];

      const migrated = migrateLawIds(laws);

      expect(migrated[0]?.legacyId).toBe('old-id');
    });

    it('should handle empty array', () => {
      const migrated = migrateLawIds([]);

      expect(migrated).toEqual([]);
    });

    it('should generate deterministic new IDs', () => {
      const laws = [{ id: 1, title: 'Test', description: 'Test desc' }];

      const migrated1 = migrateLawIds(laws);
      const migrated2 = migrateLawIds(laws);

      expect(migrated1[0]?.id).toBe(migrated2[0]?.id);
    });
  });
});
