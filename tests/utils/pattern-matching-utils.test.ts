/**
 * @fileoverview Tests for pattern-matching-utils.ts
 * @description Tests for PatternMatchingUtils class
 */

import { PatternMatchingUtils } from '../../src/utils/pattern-matching-utils';

describe('utils/pattern-matching-utils', () => {
  describe('PatternMatchingUtils.hasPattern', () => {
    it('should return true when pattern exists', () => {
      expect(PatternMatchingUtils.hasPattern('Hello World', 'World')).toBe(
        true
      );
    });

    it('should return false when pattern does not exist', () => {
      expect(PatternMatchingUtils.hasPattern('Hello World', 'Universe')).toBe(
        false
      );
    });

    it('should be case sensitive', () => {
      expect(PatternMatchingUtils.hasPattern('Hello World', 'world')).toBe(
        false
      );
    });

    it('should handle empty content', () => {
      expect(PatternMatchingUtils.hasPattern('', 'test')).toBe(false);
    });

    it('should handle empty pattern', () => {
      expect(PatternMatchingUtils.hasPattern('test', '')).toBe(true);
    });

    it('should handle special characters', () => {
      expect(PatternMatchingUtils.hasPattern('@NgModule()', '@NgModule')).toBe(
        true
      );
    });
  });

  describe('PatternMatchingUtils.hasAnyPattern', () => {
    it('should return true when any pattern matches', () => {
      expect(
        PatternMatchingUtils.hasAnyPattern('public class', [
          'private',
          'public',
        ])
      ).toBe(true);
    });

    it('should return false when no patterns match', () => {
      expect(
        PatternMatchingUtils.hasAnyPattern('class MyClass', [
          'private',
          'public',
        ])
      ).toBe(false);
    });

    it('should handle empty patterns array', () => {
      expect(PatternMatchingUtils.hasAnyPattern('any content', [])).toBe(false);
    });

    it('should work with readonly arrays', () => {
      const patterns = ['a', 'b', 'c'] as const;
      expect(PatternMatchingUtils.hasAnyPattern('abc', patterns)).toBe(true);
    });
  });

  describe('PatternMatchingUtils.hasAllPatterns', () => {
    it('should return true when all patterns match', () => {
      expect(
        PatternMatchingUtils.hasAllPatterns('@Component selector templateUrl', [
          '@Component',
          'selector',
        ])
      ).toBe(true);
    });

    it('should return false when some patterns missing', () => {
      expect(
        PatternMatchingUtils.hasAllPatterns('@Component selector', [
          '@Component',
          'templateUrl',
        ])
      ).toBe(false);
    });

    it('should return true for empty patterns array', () => {
      expect(PatternMatchingUtils.hasAllPatterns('any content', [])).toBe(true);
    });

    it('should work with readonly arrays', () => {
      const patterns = ['a', 'b'] as const;
      expect(PatternMatchingUtils.hasAllPatterns('ab', patterns)).toBe(true);
    });
  });

  describe('PatternMatchingUtils.countPattern', () => {
    it('should count occurrences correctly', () => {
      expect(
        PatternMatchingUtils.countPattern('foo bar foo baz foo', 'foo')
      ).toBe(3);
    });

    it('should return 0 for no matches', () => {
      expect(PatternMatchingUtils.countPattern('hello world', 'test')).toBe(0);
    });

    it('should return 0 for empty content', () => {
      expect(PatternMatchingUtils.countPattern('', 'test')).toBe(0);
    });

    it('should count single occurrence', () => {
      expect(PatternMatchingUtils.countPattern('one two three', 'two')).toBe(1);
    });
  });

  describe('PatternMatchingUtils.hasRegexPattern', () => {
    it('should match regex pattern', () => {
      expect(PatternMatchingUtils.hasRegexPattern('hello123', /\d+/)).toBe(
        true
      );
    });

    it('should not match when pattern absent', () => {
      expect(PatternMatchingUtils.hasRegexPattern('hello', /\d+/)).toBe(false);
    });

    it('should handle case insensitive flag', () => {
      expect(PatternMatchingUtils.hasRegexPattern('HELLO', /hello/i)).toBe(
        true
      );
    });

    it('should handle empty content', () => {
      expect(PatternMatchingUtils.hasRegexPattern('', /test/)).toBe(false);
    });
  });

  describe('PatternMatchingUtils.extractMatches', () => {
    it('should extract all matches', () => {
      const matches = PatternMatchingUtils.extractMatches(
        'a1 b2 c3',
        /[a-z]\d/g
      );
      expect(matches).toEqual(['a1', 'b2', 'c3']);
    });

    it('should return empty array for no matches', () => {
      expect(PatternMatchingUtils.extractMatches('hello', /\d+/g)).toEqual([]);
    });

    it('should return empty array for empty content', () => {
      expect(PatternMatchingUtils.extractMatches('', /test/g)).toEqual([]);
    });

    it('should handle single match', () => {
      expect(
        PatternMatchingUtils.extractMatches('hello world', /world/g)
      ).toEqual(['world']);
    });
  });

  describe('PatternMatchingUtils.hasPatternIgnoreCase', () => {
    it('should match same case', () => {
      expect(PatternMatchingUtils.hasPatternIgnoreCase('Hello', 'Hello')).toBe(
        true
      );
    });

    it('should match different case', () => {
      expect(PatternMatchingUtils.hasPatternIgnoreCase('Hello', 'hello')).toBe(
        true
      );
    });

    it('should match uppercase pattern', () => {
      expect(PatternMatchingUtils.hasPatternIgnoreCase('hello', 'HELLO')).toBe(
        true
      );
    });

    it('should return false when pattern not found', () => {
      expect(PatternMatchingUtils.hasPatternIgnoreCase('Hello', 'World')).toBe(
        false
      );
    });
  });

  describe('PatternMatchingUtils.hasAnyRegexPattern', () => {
    it('should return true when any pattern matches', () => {
      const patterns = [/import.*crypto/, /require.*crypto/];
      expect(
        PatternMatchingUtils.hasAnyRegexPattern('import crypto', patterns)
      ).toBe(true);
    });

    it('should return false when no patterns match', () => {
      const patterns = [/import.*crypto/, /require.*crypto/];
      expect(
        PatternMatchingUtils.hasAnyRegexPattern(
          'import { Component }',
          patterns
        )
      ).toBe(false);
    });

    it('should handle empty patterns array', () => {
      expect(PatternMatchingUtils.hasAnyRegexPattern('any content', [])).toBe(
        false
      );
    });

    it('should work with readonly arrays', () => {
      const patterns = [/a/, /b/] as const;
      expect(PatternMatchingUtils.hasAnyRegexPattern('abc', patterns)).toBe(
        true
      );
    });
  });

  describe('edge cases', () => {
    it('should handle unicode content', () => {
      expect(PatternMatchingUtils.hasPattern('Привет мир', 'мир')).toBe(true);
    });

    it('should handle newlines in content', () => {
      expect(PatternMatchingUtils.hasPattern('line1\nline2', 'line2')).toBe(
        true
      );
    });

    it('should handle tabs in content', () => {
      expect(PatternMatchingUtils.hasPattern('col1\tcol2', '\t')).toBe(true);
    });
  });
});
