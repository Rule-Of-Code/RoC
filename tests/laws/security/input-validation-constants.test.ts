/**
 * Tests for InputValidationConstants
 */
import * as ts from 'typescript';

import { InputValidationConstants } from '../../../src/laws/security/api-security/constants/input-validation';
import { readCodeView } from '../../../src/utils/security/code-view';

const view = (content: string) => readCodeView(ts, content, 'x.service.ts');

describe('InputValidationConstants', () => {
  describe('VALIDATION_PATTERNS', () => {
    it('should have FORM_CONTROL pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.FORM_CONTROL
      ).toBeInstanceOf(RegExp);
    });

    it('should have VALIDATORS pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.VALIDATORS
      ).toBeInstanceOf(RegExp);
    });

    it('should have INNER_HTML pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.INNER_HTML
      ).toBeInstanceOf(RegExp);
    });

    it('should have SANITIZE pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.SANITIZE
      ).toBeInstanceOf(RegExp);
    });

    it('should have HTTP_CLIENT pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.HTTP_CLIENT
      ).toBeInstanceOf(RegExp);
    });

    it('should have VALIDATE_CALL pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.VALIDATE_CALL
      ).toBeInstanceOf(RegExp);
    });

    it('FORM_CONTROL should match FormControl', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.FORM_CONTROL.test(
          'new FormControl()'
        )
      ).toBe(true);
    });

    it('VALIDATORS should match Validators', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.VALIDATORS.test(
          'Validators.required'
        )
      ).toBe(true);
    });
  });

  describe('RISKY_PATTERNS', () => {
    it('should have INNER_HTML_WITHOUT_SANITIZE pattern', () => {
      expect(
        InputValidationConstants.RISKY_PATTERNS.INNER_HTML_WITHOUT_SANITIZE
      ).toBeInstanceOf(RegExp);
    });

    it('should have FORM_CONTROL_NO_VALIDATORS pattern', () => {
      expect(
        InputValidationConstants.RISKY_PATTERNS.FORM_CONTROL_NO_VALIDATORS
      ).toBeInstanceOf(RegExp);
    });
  });

  describe('hasProperFormValidation()', () => {
    it('should return true for FormControl with Validators', () => {
      const content = 'new FormControl("", Validators.required)';
      expect(InputValidationConstants.hasProperFormValidation(content)).toBe(
        true
      );
    });

    it('should return false for FormControl without Validators', () => {
      expect(
        InputValidationConstants.hasProperFormValidation('new FormControl("")')
      ).toBe(false);
    });

    it('should return false for Validators without FormControl', () => {
      expect(
        InputValidationConstants.hasProperFormValidation('Validators.required')
      ).toBe(false);
    });
  });

  describe('hasXSSVulnerability()', () => {
    it('should return true for innerHTML without sanitize', () => {
      expect(
        InputValidationConstants.hasXSSVulnerability(
          'element.innerHTML = value'
        )
      ).toBe(true);
    });

    it('should return false for innerHTML with sanitize', () => {
      const content = 'element.innerHTML = sanitize(value)';
      expect(InputValidationConstants.hasXSSVulnerability(content)).toBe(false);
    });

    it('should return false for no innerHTML', () => {
      expect(
        InputValidationConstants.hasXSSVulnerability(
          'element.textContent = value'
        )
      ).toBe(false);
    });
  });

  describe('hasHttpValidation()', () => {
    const HTTP =
      'class S { constructor(private http: HttpClient) {} load() { return this.http.get("/x"); } }\n';

    it('should return true for HttpClient with a validator call', () => {
      const content = `${HTTP}export const check = (r: unknown) => validate(r);`;
      expect(InputValidationConstants.hasHttpValidation(view(content))).toBe(
        true
      );
    });

    it('should return false for HttpClient without validation', () => {
      expect(InputValidationConstants.hasHttpValidation(view(HTTP))).toBe(
        false
      );
    });

    it('should return false for validate in a comment', () => {
      expect(
        InputValidationConstants.hasHttpValidation(
          view(`// validate the response\n${HTTP}`)
        )
      ).toBe(false);
    });

    it('should return true for a schema library import', () => {
      expect(
        InputValidationConstants.hasHttpValidation(
          view(`import { z } from 'zod';\n${HTTP}`)
        )
      ).toBe(true);
    });

    it('should return false for validate without HttpClient', () => {
      expect(
        InputValidationConstants.hasHttpValidation(view('validate();'))
      ).toBe(false);
    });
  });
});
