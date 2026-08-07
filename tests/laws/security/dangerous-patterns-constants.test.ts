/**
 * Tests for DangerousPatternsConstants
 */
import { DangerousPatternsConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/dangerous-patterns';

describe('DangerousPatternsConstants', () => {
  describe('PATTERNS', () => {
    it('should have INNER_HTML pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.INNER_HTML).toBeInstanceOf(
        RegExp
      );
    });

    it('should have BYPASS_HTML pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.BYPASS_HTML).toBeInstanceOf(
        RegExp
      );
    });

    it('should have BYPASS_SCRIPT pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.BYPASS_SCRIPT).toBeInstanceOf(
        RegExp
      );
    });

    it('should have BYPASS_URL pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.BYPASS_URL).toBeInstanceOf(
        RegExp
      );
    });

    it('should have DOCUMENT_WRITE pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.DOCUMENT_WRITE).toBeInstanceOf(
        RegExp
      );
    });

    it('should have EVAL pattern', () => {
      expect(DangerousPatternsConstants.PATTERNS.EVAL).toBeInstanceOf(RegExp);
    });

    it('should have INNER_HTML_BINDING pattern', () => {
      expect(
        DangerousPatternsConstants.PATTERNS.INNER_HTML_BINDING
      ).toBeInstanceOf(RegExp);
    });

    it('INNER_HTML should match .innerHTML =', () => {
      expect(
        DangerousPatternsConstants.PATTERNS.INNER_HTML.test(
          'element.innerHTML = value'
        )
      ).toBe(true);
    });

    it('BYPASS_HTML should match bypassSecurityTrustHtml(', () => {
      expect(
        DangerousPatternsConstants.PATTERNS.BYPASS_HTML.test(
          'this.sanitizer.bypassSecurityTrustHtml(x)'
        )
      ).toBe(true);
    });

    it('DOCUMENT_WRITE should match document.write(', () => {
      expect(
        DangerousPatternsConstants.PATTERNS.DOCUMENT_WRITE.test(
          'document.write(html)'
        )
      ).toBe(true);
    });

    it('EVAL should match eval(', () => {
      expect(DangerousPatternsConstants.PATTERNS.EVAL.test('eval(code)')).toBe(
        true
      );
    });
  });

  describe('MESSAGES', () => {
    it('should have INNER_HTML message', () => {
      expect(DangerousPatternsConstants.MESSAGES.INNER_HTML).toBeDefined();
      expect(typeof DangerousPatternsConstants.MESSAGES.INNER_HTML).toBe(
        'string'
      );
    });

    it('should have BYPASS_HTML message', () => {
      expect(DangerousPatternsConstants.MESSAGES.BYPASS_HTML).toBeDefined();
    });

    it('should have BYPASS_SCRIPT message', () => {
      expect(DangerousPatternsConstants.MESSAGES.BYPASS_SCRIPT).toBeDefined();
    });

    it('should have EVAL message', () => {
      expect(DangerousPatternsConstants.MESSAGES.EVAL).toBeDefined();
    });
  });

  describe('hasDangerousPattern()', () => {
    it('should return true for innerHTML', () => {
      expect(
        DangerousPatternsConstants.hasDangerousPattern('element.innerHTML = x')
      ).toBe(true);
    });

    it('should return true for bypassSecurityTrustHtml', () => {
      expect(
        DangerousPatternsConstants.hasDangerousPattern(
          'this.sanitizer.bypassSecurityTrustHtml(x)'
        )
      ).toBe(true);
    });

    it('should return true for eval', () => {
      expect(
        DangerousPatternsConstants.hasDangerousPattern('result = eval (code)')
      ).toBe(true);
    });

    it('should return true for document.write', () => {
      expect(
        DangerousPatternsConstants.hasDangerousPattern('document.write (html)')
      ).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(
        DangerousPatternsConstants.hasDangerousPattern(
          'element.textContent = "safe"'
        )
      ).toBe(false);
    });
  });
});
