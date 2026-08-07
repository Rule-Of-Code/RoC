/**
 * Tests for InputValidationConstants
 */
import { InputValidationConstants } from '../../../src/laws/security/api-security/constants/input-validation';

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

    it('should have VALIDATE pattern', () => {
      expect(
        InputValidationConstants.VALIDATION_PATTERNS.VALIDATE
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

  describe('SEARCH_FILES', () => {
    it('should have COMPONENT pattern', () => {
      expect(InputValidationConstants.SEARCH_FILES.COMPONENT).toBe(
        '*.component.ts'
      );
    });

    it('should have SERVICE pattern', () => {
      expect(InputValidationConstants.SEARCH_FILES.SERVICE).toBe(
        '*.service.ts'
      );
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
    it('should return true for HttpClient with validate', () => {
      const content = 'constructor(private http: HttpClient) {} validate()';
      expect(InputValidationConstants.hasHttpValidation(content)).toBe(true);
    });

    it('should return false for HttpClient without validate', () => {
      expect(
        InputValidationConstants.hasHttpValidation(
          'constructor(private http: HttpClient) {}'
        )
      ).toBe(false);
    });

    it('should return false for validate without HttpClient', () => {
      expect(InputValidationConstants.hasHttpValidation('validate()')).toBe(
        false
      );
    });
  });
});
