/**
 * @fileoverview Tests for angular-signal-usage-validation-patterns.ts
 * @description Tests for Angular Signal Usage Validation Patterns utility
 */

import { AngularSignalUsageConfiguration } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-configuration';
import { AngularSignalUsageValidationPatterns } from '../../../src/utils/angular/angular-signal-usage/angular-signal-usage-validation-patterns';

describe('utils/angular/angular-signal-usage/angular-signal-usage-validation-patterns', () => {
  describe('AngularSignalUsageValidationPatterns', () => {
    describe('validateAllPatterns', () => {
      const createPatterns = (
        overrides: Partial<
          ReturnType<typeof AngularSignalUsageConfiguration.analyzePatterns>
        > = {}
      ) => ({
        hasSignalUsage: false,
        hasSubjectUsage: false,
        hasFormControl: false,
        hasComponentState: false,
        hasGetterMethods: false,
        hasComputedUsage: false,
        hasAsyncPipe: false,
        hasChangeDetectorRef: false,
        hasOnPush: false,
        getterMethods: [],
        fileName: 'test.component.ts',
        filePath: '/test/test.component.ts',
        templateContent: undefined,
        ...overrides,
      });

      it('should suggest Subject migration when Subject used without signals', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasSubjectUsage: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(
          suggestions.some(
            s => s.includes('Subject') || s.includes('BehaviorSubject')
          )
        ).toBe(true);
      });

      it('should not suggest Subject migration when signals are used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasSubjectUsage: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(
          suggestions.filter(s => s.includes('Subject') && s.includes('migrat'))
        ).toHaveLength(0);
      });

      it('should suggest forms migration when FormControl used without signals', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasFormControl: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.some(s => s.includes('form'))).toBe(true);
      });

      it('should not suggest forms migration when signals are used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasFormControl: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.filter(s => s.includes('form'))).toHaveLength(0);
      });

      it('should suggest state management with signals when component state found', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasComponentState: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.some(s => s.includes('state management'))).toBe(
          true
        );
      });

      it('should not suggest state management when signals are used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasComponentState: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(
          suggestions.filter(s => s.includes('state management'))
        ).toHaveLength(0);
      });

      it('should suggest computed over getters when getters found without computed', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasGetterMethods: true,
          hasComputedUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.some(s => s.includes('computed'))).toBe(true);
      });

      it('should not suggest computed when computed is already used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasGetterMethods: true,
          hasComputedUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.filter(s => s.includes('computed'))).toHaveLength(0);
      });

      it('should suggest signals over async pipe when async pipe found', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasAsyncPipe: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(
          suggestions.some(
            s => s.includes('async') || s.includes('performance')
          )
        ).toBe(true);
      });

      it('should not suggest signals over async when signals are used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasAsyncPipe: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.filter(s => s.includes('async'))).toHaveLength(0);
      });

      it('should suggest eliminating ChangeDetectorRef with signals', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasChangeDetectorRef: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.some(s => s.includes('change detection'))).toBe(
          true
        );
      });

      it('should not suggest change detection elimination when signals used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasChangeDetectorRef: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(
          suggestions.filter(s => s.includes('change detection'))
        ).toHaveLength(0);
      });

      it('should suggest optimizing OnPush with signals', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasOnPush: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.some(s => s.includes('OnPush'))).toBe(true);
      });

      it('should not suggest OnPush optimization when signals used', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasOnPush: true,
          hasSignalUsage: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.filter(s => s.includes('OnPush'))).toHaveLength(0);
      });

      it('should include fileName in all suggestions', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasSubjectUsage: true,
          hasFormControl: true,
          hasComponentState: true,
          hasGetterMethods: true,
          hasAsyncPipe: true,
          hasChangeDetectorRef: true,
          hasOnPush: true,
          hasSignalUsage: false,
          hasComputedUsage: false,
          fileName: 'my-component.component.ts',
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBeGreaterThan(0);
        suggestions.forEach(suggestion => {
          expect(suggestion).toContain('my-component.component.ts');
        });
      });

      it('should return empty suggestions when signals already used everywhere', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasSignalUsage: true,
          hasComputedUsage: true,
          hasSubjectUsage: true,
          hasFormControl: true,
          hasComponentState: true,
          hasGetterMethods: true,
          hasAsyncPipe: true,
          hasChangeDetectorRef: true,
          hasOnPush: true,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should return empty suggestions when no patterns detected', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns();

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions).toHaveLength(0);
      });

      it('should handle multiple patterns needing suggestions', () => {
        const suggestions: string[] = [];
        const patterns = createPatterns({
          hasSubjectUsage: true,
          hasFormControl: true,
          hasComponentState: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions.length).toBe(3);
      });

      it('should preserve existing suggestions when adding new ones', () => {
        const suggestions: string[] = ['Existing suggestion'];
        const patterns = createPatterns({
          hasSubjectUsage: true,
          hasSignalUsage: false,
        });

        AngularSignalUsageValidationPatterns.validateAllPatterns(
          patterns,
          suggestions
        );

        expect(suggestions[0]).toBe('Existing suggestion');
        expect(suggestions.length).toBeGreaterThan(1);
      });
    });
  });
});
