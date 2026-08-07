/**
 * Tests for AngularValidationUtils
 *
 * Tests the angular validation utility methods.
 */
import { AngularValidationUtils } from '../../src/utils/angular/angular-validation/angular-validation-utils';

describe('AngularValidationUtils', () => {
  describe('validateContent', () => {
    it('should add violation when condition is true', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [
        {
          condition: true,
          violationMessage: 'Missing required import',
        },
      ];

      AngularValidationUtils.validateContent(
        'content',
        'test.component.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations).toContain(
        'Missing required import in test.component.ts'
      );
      expect(suggestions).toHaveLength(0);
    });

    it('should add suggestion when condition is true', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [
        {
          condition: true,
          suggestionMessage: 'Consider using OnPush change detection',
        },
      ];

      AngularValidationUtils.validateContent(
        'content',
        'test.component.ts',
        checks,
        violations,
        suggestions
      );

      expect(suggestions).toContain(
        'Consider using OnPush change detection in test.component.ts'
      );
      expect(violations).toHaveLength(0);
    });

    it('should add both violation and suggestion when condition is true', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [
        {
          condition: true,
          violationMessage: 'Component is missing tests',
          suggestionMessage: 'Add unit tests for component',
        },
      ];

      AngularValidationUtils.validateContent(
        'content',
        'test.component.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(1);
      expect(suggestions).toHaveLength(1);
    });

    it('should not add anything when condition is false', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [
        {
          condition: false,
          violationMessage: 'This should not appear',
          suggestionMessage: 'This should not appear either',
        },
      ];

      AngularValidationUtils.validateContent(
        'content',
        'test.component.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });

    it('should process multiple checks', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [
        { condition: true, violationMessage: 'Violation 1' },
        { condition: false, violationMessage: 'Violation 2' },
        { condition: true, suggestionMessage: 'Suggestion 1' },
        {
          condition: true,
          violationMessage: 'Violation 3',
          suggestionMessage: 'Suggestion 2',
        },
      ];

      AngularValidationUtils.validateContent(
        'content',
        'test.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(2);
      expect(suggestions).toHaveLength(2);
    });

    it('should append to existing violations', () => {
      const violations: string[] = ['Existing violation'];
      const suggestions: string[] = [];
      const checks = [{ condition: true, violationMessage: 'New violation' }];

      AngularValidationUtils.validateContent(
        'content',
        'test.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations).toHaveLength(2);
      expect(violations[0]).toBe('Existing violation');
    });

    it('should handle empty checks array', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];

      AngularValidationUtils.validateContent(
        'content',
        'test.ts',
        [],
        violations,
        suggestions
      );

      expect(violations).toHaveLength(0);
      expect(suggestions).toHaveLength(0);
    });

    it('should include filename in messages', () => {
      const violations: string[] = [];
      const suggestions: string[] = [];
      const checks = [{ condition: true, violationMessage: 'Error' }];

      AngularValidationUtils.validateContent(
        'content',
        'my-component.ts',
        checks,
        violations,
        suggestions
      );

      expect(violations[0]).toContain('my-component.ts');
    });
  });

  describe('validateAndSuggest', () => {
    it('should add suggestion when condition is true', () => {
      const suggestions: string[] = [];
      const checks = [
        {
          condition: true,
          suggestionMessage: 'Consider lazy loading',
        },
      ];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'app.module.ts',
        checks,
        suggestions
      );

      expect(suggestions).toContain('Consider lazy loading in app.module.ts');
    });

    it('should not add suggestion when condition is false', () => {
      const suggestions: string[] = [];
      const checks = [
        {
          condition: false,
          suggestionMessage: 'This should not appear',
        },
      ];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'app.module.ts',
        checks,
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should not add when suggestionMessage is undefined', () => {
      const suggestions: string[] = [];
      const checks = [
        {
          condition: true,
        },
      ];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'app.module.ts',
        checks,
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should process multiple checks', () => {
      const suggestions: string[] = [];
      const checks = [
        { condition: true, suggestionMessage: 'Suggestion 1' },
        { condition: false, suggestionMessage: 'Suggestion 2' },
        { condition: true, suggestionMessage: 'Suggestion 3' },
      ];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'test.ts',
        checks,
        suggestions
      );

      expect(suggestions).toHaveLength(2);
    });

    it('should append to existing suggestions', () => {
      const suggestions: string[] = ['Existing suggestion'];
      const checks = [{ condition: true, suggestionMessage: 'New suggestion' }];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'test.ts',
        checks,
        suggestions
      );

      expect(suggestions).toHaveLength(2);
      expect(suggestions[0]).toBe('Existing suggestion');
    });

    it('should handle empty checks array', () => {
      const suggestions: string[] = [];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'test.ts',
        [],
        suggestions
      );

      expect(suggestions).toHaveLength(0);
    });

    it('should include filename in messages', () => {
      const suggestions: string[] = [];
      const checks = [{ condition: true, suggestionMessage: 'Optimize' }];

      AngularValidationUtils.validateAndSuggest(
        'content',
        'my-service.ts',
        checks,
        suggestions
      );

      expect(suggestions[0]).toContain('my-service.ts');
    });
  });
});
