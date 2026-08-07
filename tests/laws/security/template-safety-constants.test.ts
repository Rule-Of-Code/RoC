/**
 * Tests for TemplateSafetyConstants
 */
import { TemplateSafetyConstants } from '../../../src/laws/security/security-standards-xss-prevention/constants/template-safety';

describe('TemplateSafetyConstants', () => {
  describe('PATTERNS', () => {
    it('should have UNSAFE_INNER_HTML pattern', () => {
      expect(TemplateSafetyConstants.PATTERNS.UNSAFE_INNER_HTML).toBeInstanceOf(
        RegExp
      );
    });

    it('should have INLINE_SCRIPT pattern', () => {
      expect(TemplateSafetyConstants.PATTERNS.INLINE_SCRIPT).toBeInstanceOf(
        RegExp
      );
    });

    it('should have JAVASCRIPT_PROTOCOL pattern', () => {
      expect(
        TemplateSafetyConstants.PATTERNS.JAVASCRIPT_PROTOCOL
      ).toBeInstanceOf(RegExp);
    });

    it('should have INLINE_HANDLERS pattern', () => {
      expect(TemplateSafetyConstants.PATTERNS.INLINE_HANDLERS).toBeInstanceOf(
        RegExp
      );
    });

    it('INLINE_SCRIPT should match <script>', () => {
      expect(
        TemplateSafetyConstants.PATTERNS.INLINE_SCRIPT.test(
          '<script>alert(1)</script>'
        )
      ).toBe(true);
    });

    it('JAVASCRIPT_PROTOCOL should match javascript:', () => {
      expect(
        TemplateSafetyConstants.PATTERNS.JAVASCRIPT_PROTOCOL.test(
          'href="javascript:void(0)"'
        )
      ).toBe(true);
    });

    it('INLINE_HANDLERS should match onclick=', () => {
      const pattern = new RegExp(
        TemplateSafetyConstants.PATTERNS.INLINE_HANDLERS.source,
        'gi'
      );
      expect(pattern.test('onclick="doSomething()"')).toBe(true);
    });

    it('INLINE_HANDLERS should match onmouseover=', () => {
      const pattern = new RegExp(
        TemplateSafetyConstants.PATTERNS.INLINE_HANDLERS.source,
        'gi'
      );
      expect(pattern.test('onmouseover="highlight()"')).toBe(true);
    });
  });

  describe('MESSAGES', () => {
    it('should have UNSAFE_INNER_HTML message', () => {
      expect(TemplateSafetyConstants.MESSAGES.UNSAFE_INNER_HTML).toBeDefined();
    });

    it('should have INLINE_SCRIPT message', () => {
      expect(TemplateSafetyConstants.MESSAGES.INLINE_SCRIPT).toBeDefined();
    });

    it('should have JAVASCRIPT_PROTOCOL message', () => {
      expect(
        TemplateSafetyConstants.MESSAGES.JAVASCRIPT_PROTOCOL
      ).toBeDefined();
    });

    it('should have INLINE_HANDLERS message', () => {
      expect(TemplateSafetyConstants.MESSAGES.INLINE_HANDLERS).toBeDefined();
    });
  });

  describe('EXTENSIONS', () => {
    it('should include .html', () => {
      expect(TemplateSafetyConstants.EXTENSIONS).toContain('.html');
    });

    it('should include .ng', () => {
      expect(TemplateSafetyConstants.EXTENSIONS).toContain('.ng');
    });

    it('should include .component.html', () => {
      expect(TemplateSafetyConstants.EXTENSIONS).toContain('.component.html');
    });
  });

  describe('hasUnsafePattern()', () => {
    it('should return true for inline script', () => {
      expect(
        TemplateSafetyConstants.hasUnsafePattern('<script>alert(1)</script>')
      ).toBe(true);
    });

    it('should return true for javascript protocol', () => {
      expect(
        TemplateSafetyConstants.hasUnsafePattern('href="javascript:alert(1)"')
      ).toBe(true);
    });

    it('should return true for inline handler', () => {
      expect(
        TemplateSafetyConstants.hasUnsafePattern('onclick="doSomething()"')
      ).toBe(true);
    });

    it('should return false for safe content', () => {
      expect(
        TemplateSafetyConstants.hasUnsafePattern(
          '<div class="safe">content</div>'
        )
      ).toBe(false);
    });
  });

  describe('isTemplateFile()', () => {
    it('should return true for .html file', () => {
      expect(TemplateSafetyConstants.isTemplateFile('app.component.html')).toBe(
        true
      );
    });

    it('should return true for .ng file', () => {
      expect(TemplateSafetyConstants.isTemplateFile('template.ng')).toBe(true);
    });

    it('should return true for .component.html file', () => {
      expect(
        TemplateSafetyConstants.isTemplateFile('user.component.html')
      ).toBe(true);
    });

    it('should return false for .ts file', () => {
      expect(TemplateSafetyConstants.isTemplateFile('app.component.ts')).toBe(
        false
      );
    });

    it('should return false for .js file', () => {
      expect(TemplateSafetyConstants.isTemplateFile('script.js')).toBe(false);
    });
  });
});
