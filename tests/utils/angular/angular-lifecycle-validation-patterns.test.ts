/**
 * @fileoverview Tests for angular-lifecycle-validation-patterns.ts
 * @description Tests for Angular lifecycle validation patterns utility
 */

import { AngularLifecycleValidationPatterns } from '../../../src/utils/angular/angular-lifecycle/angular-lifecycle-validation-patterns';

describe('utils/angular/angular-lifecycle/angular-lifecycle-validation-patterns', () => {
  describe('AngularLifecycleValidationPatterns', () => {
    describe('validateInterfaceImplementation', () => {
      it('should add violation when interface implemented but method missing', () => {
        const content = 'export class TestComponent implements OnInit {}';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateInterfaceImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('OnInit');
        expect(violations[0]).toContain('ngOnInit');
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should add violation for OnDestroy interface without method', () => {
        const content = 'export class TestComponent implements OnDestroy {}';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateInterfaceImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('OnDestroy');
        expect(violations[0]).toContain('ngOnDestroy');
      });

      it('should not add violations when interface and method match', () => {
        const content = `
          export class TestComponent implements OnInit {
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateInterfaceImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should handle multiple interfaces', () => {
        const content =
          'export class TestComponent implements OnInit, OnDestroy {}';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateInterfaceImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThanOrEqual(2);
      });

      it('should not add violations for class with no lifecycle interfaces', () => {
        const content = 'export class TestComponent {}';
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateInterfaceImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
        expect(suggestions).toHaveLength(0);
      });
    });

    describe('validateMethodWithoutInterface', () => {
      it('should add violation when method exists without interface', () => {
        const content = `
          export class TestComponent {
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('ngOnInit');
        expect(violations[0]).toContain('OnInit');
        expect(suggestions.length).toBeGreaterThan(0);
      });

      it('should add violation for ngOnDestroy without interface', () => {
        const content = `
          export class TestComponent {
            ngOnDestroy() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('ngOnDestroy');
      });

      it('should not add violation when interface is implemented', () => {
        const content = `
          export class TestComponent implements OnInit {
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should handle multiple methods without interfaces', () => {
        const content = `
          export class TestComponent {
            ngOnInit() { }
            ngOnDestroy() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThanOrEqual(2);
      });

      it('should not add violations when no lifecycle methods exist', () => {
        const content = `
          export class TestComponent {
            someMethod() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateMethodWithoutInterface(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });
    });

    describe('validateOnInitUsage', () => {
      it('should add violation when async operations in constructor', () => {
        const content = `
          export class TestComponent implements OnInit {
            constructor(private http: HttpClient) {
              this.http.get('/api').subscribe();
            }
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnInitUsage(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('constructor');
        expect(violations[0]).toContain('ngOnInit');
      });

      it('should not add violation when no async operations in constructor', () => {
        const content = `
          export class TestComponent implements OnInit {
            constructor(private service: TestService) { }
            ngOnInit() {
              this.service.getData().subscribe();
            }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnInitUsage(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should skip when no constructor exists', () => {
        const content = `
          export class TestComponent implements OnInit {
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnInitUsage(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should skip when no ngOnInit exists', () => {
        const content = `
          export class TestComponent {
            constructor() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnInitUsage(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should skip when no HTTP or service usage', () => {
        const content = `
          export class TestComponent implements OnInit {
            constructor() {
              console.log('initialized');
            }
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnInitUsage(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });
    });

    describe('validateOnChangesImplementation', () => {
      it('should add violation when ngOnChanges without SimpleChanges', () => {
        const content = `
          export class TestComponent implements OnChanges {
            ngOnChanges() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnChangesImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('SimpleChanges');
      });

      it('should not add violation when SimpleChanges is used', () => {
        const content = `
          export class TestComponent implements OnChanges {
            ngOnChanges(changes: SimpleChanges) { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnChangesImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });

      it('should not add violation when no ngOnChanges exists', () => {
        const content = `
          export class TestComponent implements OnInit {
            ngOnInit() { }
          }
        `;
        const violations: string[] = [];
        const suggestions: string[] = [];

        AngularLifecycleValidationPatterns.validateOnChangesImplementation(
          content,
          'test.component.ts',
          violations,
          suggestions
        );

        expect(violations).toHaveLength(0);
      });
    });
  });
});
