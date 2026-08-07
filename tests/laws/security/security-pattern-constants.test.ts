/**
 * Tests for SecurityPatternConstants
 */
import { SecurityPatternConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/security-pattern-constants';

describe('SecurityPatternConstants', () => {
  describe('PATTERNS', () => {
    it('should be an empty object in base class', () => {
      expect(typeof SecurityPatternConstants.PATTERNS).toBe('object');
    });
  });

  describe('MESSAGES', () => {
    it('should be an empty object in base class', () => {
      expect(typeof SecurityPatternConstants.MESSAGES).toBe('object');
    });
  });

  describe('hasUnsafePattern()', () => {
    it('should return false for base class (no patterns)', () => {
      expect(SecurityPatternConstants.hasUnsafePattern('any content')).toBe(
        false
      );
    });

    it('should return false for empty content', () => {
      expect(SecurityPatternConstants.hasUnsafePattern('')).toBe(false);
    });
  });

  describe('detectPatterns()', () => {
    it('should return empty array for base class', () => {
      const result = SecurityPatternConstants.detectPatterns('any content');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should return empty array for empty content', () => {
      const result = SecurityPatternConstants.detectPatterns('');
      expect(result.length).toBe(0);
    });
  });
});
