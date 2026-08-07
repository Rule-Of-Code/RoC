/**
 * Tests for SanitizationConstants
 */
import { SanitizationConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/sanitization';

describe('SanitizationConstants', () => {
  describe('PATTERNS', () => {
    it('should have DOM_SANITIZER pattern', () => {
      expect(SanitizationConstants.PATTERNS.DOM_SANITIZER).toBeInstanceOf(
        RegExp
      );
    });

    it('should have SANITIZE_CALL pattern', () => {
      expect(SanitizationConstants.PATTERNS.SANITIZE_CALL).toBeInstanceOf(
        RegExp
      );
    });

    it('DOM_SANITIZER should match DomSanitizer', () => {
      expect(
        SanitizationConstants.PATTERNS.DOM_SANITIZER.test(
          'constructor(private sanitizer: DomSanitizer)'
        )
      ).toBe(true);
    });

    it('DOM_SANITIZER should match @angular/platform-browser', () => {
      expect(
        SanitizationConstants.PATTERNS.DOM_SANITIZER.test(
          "import { DomSanitizer } from '@angular/platform-browser'"
        )
      ).toBe(true);
    });

    it('SANITIZE_CALL should match sanitize(', () => {
      expect(
        SanitizationConstants.PATTERNS.SANITIZE_CALL.test(
          'this.sanitize(value)'
        )
      ).toBe(true);
    });

    it('SANITIZE_CALL should match .sanitizeHtml(', () => {
      expect(
        SanitizationConstants.PATTERNS.SANITIZE_CALL.test(
          'this.sanitizeHtml(input)'
        )
      ).toBe(true);
    });
  });

  describe('UNSAFE_INPUT_PATTERNS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(SanitizationConstants.UNSAFE_INPUT_PATTERNS)).toBe(
        true
      );
      expect(
        SanitizationConstants.UNSAFE_INPUT_PATTERNS.length
      ).toBeGreaterThan(0);
    });

    it('should have 3 patterns', () => {
      expect(SanitizationConstants.UNSAFE_INPUT_PATTERNS.length).toBe(3);
    });
  });

  describe('hasDomSanitizer()', () => {
    it('should return true for content with DomSanitizer', () => {
      expect(
        SanitizationConstants.hasDomSanitizer('private sanitizer: DomSanitizer')
      ).toBe(true);
    });

    it('should return true for @angular/platform-browser import', () => {
      expect(
        SanitizationConstants.hasDomSanitizer(
          "import '@angular/platform-browser'"
        )
      ).toBe(true);
    });

    it('should return false for content without sanitizer', () => {
      expect(SanitizationConstants.hasDomSanitizer('console.log("test")')).toBe(
        false
      );
    });
  });

  describe('hasSanitizationCall()', () => {
    it('should return true for sanitize() call', () => {
      expect(
        SanitizationConstants.hasSanitizationCall('this.sanitize(value)')
      ).toBe(true);
    });

    it('should return true for sanitizeHtml() call', () => {
      expect(
        SanitizationConstants.hasSanitizationCall('this.sanitizeHtml(input)')
      ).toBe(true);
    });

    it('should return false for no sanitization call', () => {
      expect(SanitizationConstants.hasSanitizationCall('this.getValue()')).toBe(
        false
      );
    });
  });

  describe('hasUnsanitizedInput()', () => {
    it('should return true for template literal with interpolation', () => {
      expect(
        SanitizationConstants.hasUnsanitizedInput(
          'const html = `<div>${userInput}</div>`'
        )
      ).toBe(true);
    });

    it('should return true for string concatenation with input', () => {
      expect(
        SanitizationConstants.hasUnsanitizedInput(
          'html = "<div>" + input + "</div>"'
        )
      ).toBe(true);
    });

    it('should return true for innerHTML with concatenation', () => {
      expect(
        SanitizationConstants.hasUnsanitizedInput('el.innerHTML = x + y')
      ).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(
        SanitizationConstants.hasUnsanitizedInput('const text = "hello world"')
      ).toBe(false);
    });
  });
});
