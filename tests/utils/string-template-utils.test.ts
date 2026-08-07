/**
 * Tests for utils/string-template-utils.ts - String Template Utilities
 *
 * Tests template formatting, placeholder replacement, and extraction
 */

import { StringTemplateUtils } from '../../src/utils/string-template-utils';

describe('utils/string-template-utils', () => {
  describe('StringTemplateUtils.formatTemplate', () => {
    it('should replace indexed placeholders', () => {
      const result = StringTemplateUtils.formatTemplate(
        'Error in {0} at line {1}',
        'file.ts',
        '42'
      );

      expect(result).toBe('Error in file.ts at line 42');
    });

    it('should return original string with no replacements', () => {
      const result = StringTemplateUtils.formatTemplate('No placeholders here');

      expect(result).toBe('No placeholders here');
    });

    it('should handle single placeholder', () => {
      const result = StringTemplateUtils.formatTemplate('Hello {0}!', 'World');

      expect(result).toBe('Hello World!');
    });

    it('should handle multiple placeholders', () => {
      const result = StringTemplateUtils.formatTemplate(
        '{0}, {1}, {2}',
        'A',
        'B',
        'C'
      );

      expect(result).toBe('A, B, C');
    });

    it('should leave unreplaced placeholders', () => {
      const result = StringTemplateUtils.formatTemplate(
        '{0} and {1} and {2}',
        'first',
        'second'
      );

      expect(result).toBe('first and second and {2}');
    });

    it('should ignore extra replacements', () => {
      const result = StringTemplateUtils.formatTemplate(
        '{0}',
        'used',
        'unused'
      );

      expect(result).toBe('used');
    });

    it('should handle empty template', () => {
      const result = StringTemplateUtils.formatTemplate('', 'value');

      expect(result).toBe('');
    });

    it('should handle empty replacement', () => {
      const result = StringTemplateUtils.formatTemplate('{0} text', '');

      expect(result).toBe(' text');
    });
  });

  describe('StringTemplateUtils.formatNamedTemplate', () => {
    it('should replace named placeholders', () => {
      const result = StringTemplateUtils.formatNamedTemplate(
        'Error in {fileName} at {location}',
        { fileName: 'module.ts', location: 'line 42' }
      );

      expect(result).toBe('Error in module.ts at line 42');
    });

    it('should return original string with empty object', () => {
      const result = StringTemplateUtils.formatNamedTemplate(
        'No replacements',
        {}
      );

      expect(result).toBe('No replacements');
    });

    it('should handle single named placeholder', () => {
      const result = StringTemplateUtils.formatNamedTemplate('Hello {name}!', {
        name: 'World',
      });

      expect(result).toBe('Hello World!');
    });

    it('should replace all occurrences of same placeholder', () => {
      const result = StringTemplateUtils.formatNamedTemplate(
        '{name} likes {name}',
        { name: 'Alice' }
      );

      expect(result).toBe('Alice likes Alice');
    });

    it('should handle numeric values', () => {
      const result = StringTemplateUtils.formatNamedTemplate('Count: {count}', {
        count: 42,
      });

      expect(result).toBe('Count: 42');
    });

    it('should leave unknown placeholders', () => {
      const result = StringTemplateUtils.formatNamedTemplate(
        '{known} and {unknown}',
        { known: 'value' }
      );

      expect(result).toBe('value and {unknown}');
    });
  });

  describe('StringTemplateUtils.hasPlaceholders', () => {
    it('should return true for indexed placeholder', () => {
      expect(StringTemplateUtils.hasPlaceholders('Hello {0}')).toBe(true);
    });

    it('should return true for named placeholder', () => {
      expect(StringTemplateUtils.hasPlaceholders('Hello {name}')).toBe(true);
    });

    it('should return true for multiple placeholders', () => {
      expect(StringTemplateUtils.hasPlaceholders('{0} {1} {2}')).toBe(true);
    });

    it('should return false for no placeholders', () => {
      expect(StringTemplateUtils.hasPlaceholders('No placeholders')).toBe(
        false
      );
    });

    it('should return false for empty string', () => {
      expect(StringTemplateUtils.hasPlaceholders('')).toBe(false);
    });

    it('should return true for empty braces', () => {
      expect(StringTemplateUtils.hasPlaceholders('{}')).toBe(true);
    });
  });

  describe('StringTemplateUtils.extractPlaceholders', () => {
    it('should extract indexed placeholders', () => {
      const result = StringTemplateUtils.extractPlaceholders('{0} and {1}');

      expect(result).toEqual(['0', '1']);
    });

    it('should extract named placeholders', () => {
      const result = StringTemplateUtils.extractPlaceholders(
        '{firstName} {lastName}'
      );

      expect(result).toEqual(['firstName', 'lastName']);
    });

    it('should return empty array for no placeholders', () => {
      const result = StringTemplateUtils.extractPlaceholders('No placeholders');

      expect(result).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const result = StringTemplateUtils.extractPlaceholders('');

      expect(result).toEqual([]);
    });

    it('should handle mixed placeholder types', () => {
      const result = StringTemplateUtils.extractPlaceholders('{0} {name} {1}');

      expect(result).toEqual(['0', 'name', '1']);
    });

    it('should include duplicate placeholders', () => {
      const result = StringTemplateUtils.extractPlaceholders('{name} {name}');

      expect(result).toEqual(['name', 'name']);
    });

    it('should extract empty placeholder', () => {
      const result = StringTemplateUtils.extractPlaceholders('{}');

      expect(result).toEqual(['']);
    });
  });
});
