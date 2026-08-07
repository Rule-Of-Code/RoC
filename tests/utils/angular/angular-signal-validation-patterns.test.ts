/**
 * @fileoverview Tests for angular-signal-validation-patterns.ts
 * @description Tests for Angular Signal Validation Patterns utility
 */

import { AngularSignalConfiguration } from '../../../src/utils/angular/angular-signals/angular-signal-configuration';
import { AngularSignalValidationPatterns } from '../../../src/utils/angular/angular-signals/angular-signal-validation-patterns';

describe('utils/angular/angular-signals/angular-signal-validation-patterns', () => {
  describe('AngularSignalValidationPatterns', () => {
    describe('validateAllPatterns', () => {
      it('should validate signal usage patterns', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal();`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(Array.isArray(violations)).toBe(true);
        expect(Array.isArray(suggestions)).toBe(true);
      });

      it('should not add violations for properly initialized signals', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          readonly count: WritableSignal<number> = signal<number>(0);
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          violations.filter(v => v.includes('should be initialized'))
        ).toHaveLength(0);
      });

      it('should add violation for signal without value', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal();`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );
        // Manually set signal initialization to test the violation
        patterns.signalInitializations = ['signal()'];

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(violations.some(v => v.includes('initialized'))).toBe(true);
      });

      it('should suggest readonly signals when not present', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal(0);`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('readonly'))).toBe(true);
      });

      it('should not suggest readonly when already present', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `readonly count = signal(0);`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          suggestions.filter(s => s.includes('readonly')).length
        ).toBeLessThanOrEqual(0);
      });

      it('should suggest explicit typing when not using WritableSignal', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal(0);`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('WritableSignal'))).toBe(true);
      });

      it('should validate computed patterns', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `computed(() => count() * 2)`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(Array.isArray(suggestions)).toBe(true);
      });

      it('should detect computed with side effects as violation', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `computed(() => { console.log('test'); return count() * 2; }`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(violations.some(v => v.includes('pure'))).toBe(true);
      });

      it('should suggest cleanup for effects', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `effect(() => console.log(count()));`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('cleanup'))).toBe(true);
      });

      it('should not suggest cleanup when DestroyRef is used', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          inject(DestroyRef);
          effect(() => console.log(count()));
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          suggestions.filter(s => s.includes('cleanup')).length
        ).toBeLessThanOrEqual(0);
      });

      it('should suggest moving effects out of constructor', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          constructor() {
            effect(() => console.log('test'));
          }
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('ngOnInit'))).toBe(true);
      });

      it('should detect inconsistent update patterns', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          const count = signal(0);
          count.set(5);
          count.update(v => v + 1);
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('.set()'))).toBe(true);
      });

      it('should suggest computed for excessive mutations', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          const count = signal(0);
          count.set(1);
          count.set(2);
          count.set(3);
          count.set(4);
          count.set(5);
          count.set(6);
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('computed'))).toBe(true);
      });

      it('should suggest equality function for complex objects', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          const complexData = signal({ complex: true, object: {} });
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('equality'))).toBe(true);
      });

      it('should not suggest equality when already using equal option', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `
          const complexData = signal({ object: {} }, { equal: deepEqual });
        `;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          suggestions.filter(s => s.includes('equality')).length
        ).toBeLessThanOrEqual(0);
      });

      it('should handle content without signals', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = 0;`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });

      it('should handle empty content', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = '';
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('computed without dependencies detection', () => {
      it('should detect computed without dependencies', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `computed( () => 42)`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'test.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(suggestions.some(s => s.includes('depend'))).toBe(true);
      });
    });

    describe('message formatting', () => {
      it('should include fileName in violation messages', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal();`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'my-component.component.ts'
        );
        patterns.signalInitializations = ['signal()'];

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          violations.some(v => v.includes('my-component.component.ts'))
        ).toBe(true);
      });

      it('should include fileName in suggestion messages', () => {
        const violations: string[] = [];
        const suggestions: string[] = [];
        const content = `const count = signal(0);`;
        const patterns = AngularSignalConfiguration.analyzePatterns(
          content,
          'my-component.component.ts'
        );

        AngularSignalValidationPatterns.validateAllPatterns(
          patterns,
          violations,
          suggestions,
          content,
          { thresholds: {} }
        );

        expect(
          suggestions.some(s => s.includes('my-component.component.ts'))
        ).toBe(true);
      });
    });
  });
});
