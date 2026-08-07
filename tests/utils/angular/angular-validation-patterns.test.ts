/**
 * @fileoverview Tests for angular-validation-patterns.ts
 * @description Tests for Angular Validation Patterns utility - focuses on AngularValidationUtils
 *              which is the main testable component.
 */

import { AngularValidationUtils } from '../../../src/utils/angular/angular-validation/angular-validation-utils';
import {
  ANGULAR_CONSTANTS,
  ANGULAR_LIFECYCLE_KEYWORDS,
} from '../../../src/utils/constants';

describe('utils/angular/angular-validation/angular-validation-patterns', () => {
  describe('AngularValidationUtils', () => {
    describe('validateContent', () => {
      it('should add violation message when condition is true', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            {
              condition: true,
              violationMessage: 'Test violation',
              suggestionMessage: 'Test suggestion',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toContain('Test violation in test.ts');
        expect(suggestions).toContain('Test suggestion in test.ts');
      });

      it('should not add messages when condition is false', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            {
              condition: false,
              violationMessage: 'Test violation',
              suggestionMessage: 'Test suggestion',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });

      it('should handle multiple checks', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            {
              condition: true,
              violationMessage: 'Violation 1',
            },
            {
              condition: true,
              suggestionMessage: 'Suggestion 2',
            },
            {
              condition: false,
              violationMessage: 'Violation 3',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(1);
        expect(suggestions).toHaveLength(1);
      });

      it('should only add violation when suggestion is not provided', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            {
              condition: true,
              violationMessage: 'Only violation',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(1);
        expect(suggestions).toHaveLength(0);
      });

      it('should only add suggestion when violation is not provided', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            {
              condition: true,
              suggestionMessage: 'Only suggestion',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(1);
      });

      it('should append fileName to messages', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'my-module.ts',
          [
            {
              condition: true,
              violationMessage: 'Should fix something',
              suggestionMessage: 'Consider fixing',
            },
          ],
          violations,
          suggestions
        );

        expect(violations[0]).toContain('my-module.ts');
        expect(suggestions[0]).toContain('my-module.ts');
      });

      it('should handle empty checks array', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });

      it('should handle all false conditions', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            { condition: false, violationMessage: 'V1' },
            { condition: false, suggestionMessage: 'S1' },
            {
              condition: false,
              violationMessage: 'V2',
              suggestionMessage: 'S2',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });

      it('should handle all true conditions', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateContent(
          content,
          'test.ts',
          [
            { condition: true, violationMessage: 'V1' },
            { condition: true, suggestionMessage: 'S1' },
            {
              condition: true,
              violationMessage: 'V2',
              suggestionMessage: 'S2',
            },
          ],
          violations,
          suggestions
        );

        expect(violations).toHaveLength(2);
        expect(suggestions).toHaveLength(2);
      });
    });

    describe('validateAndSuggest', () => {
      it('should add suggestion when condition is true', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'test.ts',
          [
            {
              condition: true,
              suggestionMessage: 'Test suggestion',
            },
          ],
          suggestions
        );

        expect(suggestions).toContain('Test suggestion in test.ts');
      });

      it('should not add suggestion when condition is false', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'test.ts',
          [
            {
              condition: false,
              suggestionMessage: 'Test suggestion',
            },
          ],
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should handle multiple checks', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'test.ts',
          [
            {
              condition: true,
              suggestionMessage: 'Suggestion 1',
            },
            {
              condition: true,
              suggestionMessage: 'Suggestion 2',
            },
            {
              condition: false,
              suggestionMessage: 'Suggestion 3',
            },
          ],
          suggestions
        );

        expect(suggestions).toHaveLength(2);
      });

      it('should append fileName to suggestions', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'feature.module.ts',
          [
            {
              condition: true,
              suggestionMessage: 'Consider using',
            },
          ],
          suggestions
        );

        expect(suggestions[0]).toContain('feature.module.ts');
      });

      it('should handle empty checks array', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'test.ts',
          [],
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should skip checks without suggestionMessage', () => {
        const suggestions: string[] = [];
        const content = 'test content';

        AngularValidationUtils.validateAndSuggest(
          content,
          'test.ts',
          [
            {
              condition: true,
            },
            {
              condition: true,
              suggestionMessage: 'Valid suggestion',
            },
          ],
          suggestions
        );

        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]).toContain('Valid suggestion');
      });
    });
  });

  describe('ANGULAR_CONSTANTS', () => {
    describe('module validation constants', () => {
      it('should have CommonModule constant', () => {
        expect(ANGULAR_CONSTANTS.COMMON_MODULE).toBe('CommonModule');
      });

      it('should have BrowserModule constant', () => {
        expect(ANGULAR_CONSTANTS.BROWSER_MODULE).toBe('BrowserModule');
      });

      it('should have standalone true constant', () => {
        expect(ANGULAR_CONSTANTS.STANDALONE_TRUE).toBe('standalone: true');
      });

      it('should have RouterModule.forChild constant', () => {
        expect(ANGULAR_CONSTANTS.ROUTER_MODULE_FOR_CHILD).toBe(
          'RouterModule.forChild'
        );
      });

      it('should have providedIn root constant', () => {
        expect(ANGULAR_CONSTANTS.PROVIDED_IN_ROOT).toBe("providedIn: 'root'");
      });

      it('should have const routes constant', () => {
        expect(ANGULAR_CONSTANTS.CONST_ROUTES).toBe('const routes');
      });

      it('should have providers constant with colon', () => {
        expect(ANGULAR_CONSTANTS.PROVIDERS).toBe('providers:');
      });

      it('should have imports constant with colon', () => {
        expect(ANGULAR_CONSTANTS.IMPORTS).toBe('imports:');
      });

      it('should have NgModule constant', () => {
        expect(ANGULAR_CONSTANTS.NG_MODULE).toBe('@NgModule');
      });
    });

    describe('component file extensions', () => {
      it('should have component.ts extension', () => {
        expect(ANGULAR_CONSTANTS.COMPONENT_TS).toBe('.component.ts');
      });

      it('should have service.ts extension', () => {
        expect(ANGULAR_CONSTANTS.SERVICE_TS).toBe('.service.ts');
      });

      it('should have directive.ts extension', () => {
        expect(ANGULAR_CONSTANTS.DIRECTIVE_TS).toBe('.directive.ts');
      });
    });

    describe('Angular decorators', () => {
      it('should have Component decorator', () => {
        expect(ANGULAR_CONSTANTS.COMPONENT_DECORATOR).toBe('@Component');
      });

      it('should have NgModule decorator', () => {
        expect(ANGULAR_CONSTANTS.NG_MODULE_DECORATOR).toBe('@NgModule');
      });

      it('should have Injectable decorator', () => {
        expect(ANGULAR_CONSTANTS.INJECTABLE).toBe('@Injectable');
      });
    });

    describe('Angular lifecycle', () => {
      it('should have ngOnDestroy constant', () => {
        expect(ANGULAR_CONSTANTS.NG_ON_DESTROY).toBe('ngOnDestroy');
      });

      it('should have OnDestroy interface constant', () => {
        expect(ANGULAR_CONSTANTS.ON_DESTROY).toBe('OnDestroy');
      });

      it('should have implements OnDestroy constant', () => {
        expect(ANGULAR_CONSTANTS.IMPLEMENTS_ON_DESTROY).toBe(
          'implements OnDestroy'
        );
      });
    });

    describe('RxJS patterns', () => {
      it('should have subscribe pattern', () => {
        expect(ANGULAR_CONSTANTS.SUBSCRIBE).toBe('subscribe(');
      });

      it('should have pipe syntax', () => {
        expect(ANGULAR_CONSTANTS.PIPE_SYNTAX).toBe('.pipe(');
      });

      it('should have takeUntil operator', () => {
        expect(ANGULAR_CONSTANTS.TAKE_UNTIL).toBe('takeUntil');
      });

      it('should have async pipe', () => {
        expect(ANGULAR_CONSTANTS.ASYNC_PIPE).toBe('| async');
      });
    });
  });

  describe('ANGULAR_LIFECYCLE_KEYWORDS', () => {
    describe('lifecycle interfaces', () => {
      it('should have OnInit interface', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.ON_INIT).toBe('OnInit');
      });

      it('should have OnDestroy interface', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.ON_DESTROY).toBe('OnDestroy');
      });

      it('should have OnChanges interface', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.ON_CHANGES).toBe('OnChanges');
      });

      it('should have AfterViewInit interface', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.AFTER_VIEW_INIT).toBe(
          'AfterViewInit'
        );
      });
    });

    describe('lifecycle methods', () => {
      it('should have ngOnInit method', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_INIT).toBe('ngOnInit');
      });

      it('should have ngOnDestroy method', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_DESTROY).toBe('ngOnDestroy');
      });

      it('should have ngOnChanges method', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.NG_ON_CHANGES).toBe('ngOnChanges');
      });

      it('should have ngAfterViewInit method', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.NG_AFTER_VIEW_INIT).toBe(
          'ngAfterViewInit'
        );
      });

      it('should have ngDoCheck method', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.NG_DO_CHECK).toBe('ngDoCheck');
      });
    });

    describe('file extensions', () => {
      it('should have component.ts extension', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.COMPONENT_TS).toBe('.component.ts');
      });

      it('should have service.ts extension', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.SERVICE_TS).toBe('.service.ts');
      });

      it('should have directive.ts extension', () => {
        expect(ANGULAR_LIFECYCLE_KEYWORDS.DIRECTIVE_TS).toBe('.directive.ts');
      });
    });
  });
});
