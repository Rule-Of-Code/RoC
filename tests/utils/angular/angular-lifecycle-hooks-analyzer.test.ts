/**
 * @fileoverview Tests for angular-lifecycle-hooks-analyzer.ts
 * @description Tests for Angular lifecycle hooks analyzer utility
 */

import { AngularLifecycleConfiguration } from '../../../src/utils/angular/angular-lifecycle/angular-lifecycle-configuration';
import { AngularLifecycleValidationPatterns } from '../../../src/utils/angular/angular-lifecycle/angular-lifecycle-validation-patterns';

describe('utils/angular/angular-lifecycle/angular-lifecycle-hooks-analyzer', () => {
  describe('AngularLifecycleConfiguration', () => {
    describe('LIFECYCLE_INTERFACES', () => {
      it('should include OnInit interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'OnInit'
        );
      });

      it('should include OnDestroy interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'OnDestroy'
        );
      });

      it('should include OnChanges interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'OnChanges'
        );
      });

      it('should include DoCheck interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'DoCheck'
        );
      });

      it('should include AfterContentInit interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'AfterContentInit'
        );
      });

      it('should include AfterViewInit interface', () => {
        expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
          'AfterViewInit'
        );
      });
    });

    describe('HOOK_MAPPINGS', () => {
      it('should have correct OnInit mapping', () => {
        const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
          m => m.interface === 'OnInit'
        );
        expect(mapping?.method).toBe('ngOnInit');
      });

      it('should have correct OnDestroy mapping', () => {
        const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
          m => m.interface === 'OnDestroy'
        );
        expect(mapping?.method).toBe('ngOnDestroy');
      });

      it('should have correct OnChanges mapping', () => {
        const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
          m => m.interface === 'OnChanges'
        );
        expect(mapping?.method).toBe('ngOnChanges');
      });

      it('should have mappings for all lifecycle interfaces', () => {
        expect(AngularLifecycleConfiguration.HOOK_MAPPINGS.length).toBe(
          AngularLifecycleConfiguration.LIFECYCLE_INTERFACES.length
        );
      });
    });

    describe('ANGULAR_FILE_EXTENSIONS', () => {
      it('should include component.ts extension', () => {
        expect(AngularLifecycleConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
          '.component.ts'
        );
      });

      it('should include directive.ts extension', () => {
        expect(AngularLifecycleConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
          '.directive.ts'
        );
      });

      it('should include service.ts extension', () => {
        expect(AngularLifecycleConfiguration.ANGULAR_FILE_EXTENSIONS).toContain(
          '.service.ts'
        );
      });
    });

    describe('getMethodForInterface', () => {
      it('should return ngOnInit for OnInit interface', () => {
        expect(
          AngularLifecycleConfiguration.getMethodForInterface('OnInit')
        ).toBe('ngOnInit');
      });

      it('should return ngOnDestroy for OnDestroy interface', () => {
        expect(
          AngularLifecycleConfiguration.getMethodForInterface('OnDestroy')
        ).toBe('ngOnDestroy');
      });

      it('should return ngOnChanges for OnChanges interface', () => {
        expect(
          AngularLifecycleConfiguration.getMethodForInterface('OnChanges')
        ).toBe('ngOnChanges');
      });

      it('should return fallback for unknown interface', () => {
        const result =
          AngularLifecycleConfiguration.getMethodForInterface('UnknownHook');
        expect(result).toBeDefined();
      });
    });

    describe('getImplementedInterfaces', () => {
      it('should detect OnInit implementation', () => {
        const content = 'export class TestComponent implements OnInit';
        const interfaces =
          AngularLifecycleConfiguration.getImplementedInterfaces(content);
        expect(interfaces).toContain('OnInit');
      });

      it('should detect OnDestroy implementation', () => {
        const content = 'export class TestComponent implements OnDestroy';
        const interfaces =
          AngularLifecycleConfiguration.getImplementedInterfaces(content);
        expect(interfaces).toContain('OnDestroy');
      });

      it('should detect multiple interface implementations', () => {
        const content =
          'export class TestComponent implements OnInit, OnDestroy';
        const interfaces =
          AngularLifecycleConfiguration.getImplementedInterfaces(content);
        expect(interfaces).toContain('OnInit');
        expect(interfaces).toContain('OnDestroy');
      });

      it('should return empty array when no lifecycle interfaces', () => {
        const content = 'export class TestComponent {}';
        const interfaces =
          AngularLifecycleConfiguration.getImplementedInterfaces(content);
        expect(interfaces).toHaveLength(0);
      });
    });

    describe('hasLifecycleMethod', () => {
      it('should detect ngOnInit method', () => {
        const content = 'ngOnInit() { }';
        expect(
          AngularLifecycleConfiguration.hasLifecycleMethod(content, 'ngOnInit')
        ).toBe(true);
      });

      it('should detect ngOnDestroy method', () => {
        const content = 'ngOnDestroy() { }';
        expect(
          AngularLifecycleConfiguration.hasLifecycleMethod(
            content,
            'ngOnDestroy'
          )
        ).toBe(true);
      });

      it('should not detect method when absent', () => {
        const content = 'someOtherMethod() { }';
        expect(
          AngularLifecycleConfiguration.hasLifecycleMethod(content, 'ngOnInit')
        ).toBe(false);
      });
    });

    describe('PATTERN_DETECTORS', () => {
      describe('hasOnInitAndConstructor', () => {
        it('should detect when both ngOnInit and constructor exist', () => {
          const content = `
            constructor() {}
            ngOnInit() {}
          `;
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasOnInitAndConstructor(
              content
            )
          ).toBe(true);
        });

        it('should return false when only constructor exists', () => {
          const content = 'constructor() {}';
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasOnInitAndConstructor(
              content
            )
          ).toBe(false);
        });
      });

      describe('hasHttpOrServiceUsage', () => {
        it('should detect this.http usage', () => {
          const content = 'this.http.get()';
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
              content
            )
          ).toBe(true);
        });

        it('should detect this.service usage', () => {
          const content = 'this.service.getData()';
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
              content
            )
          ).toBe(true);
        });

        it('should detect subscribe usage', () => {
          const content = '.subscribe()';
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
              content
            )
          ).toBe(true);
        });
      });

      describe('hasNgOnChanges', () => {
        it('should detect ngOnChanges method', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasNgOnChanges(
              'ngOnChanges(changes)'
            )
          ).toBe(true);
        });

        it('should return false when not present', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasNgOnChanges(
              'ngOnInit()'
            )
          ).toBe(false);
        });
      });

      describe('hasSimpleChanges', () => {
        it('should detect SimpleChanges usage', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasSimpleChanges(
              'ngOnChanges(changes: SimpleChanges)'
            )
          ).toBe(true);
        });

        it('should return false when not present', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasSimpleChanges(
              'ngOnChanges()'
            )
          ).toBe(false);
        });
      });

      describe('hasInterfaceImplementation', () => {
        it('should detect implements OnInit', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasInterfaceImplementation(
              'implements OnInit',
              'OnInit'
            )
          ).toBe(true);
        });

        it('should detect comma-separated interface', () => {
          expect(
            AngularLifecycleConfiguration.PATTERN_DETECTORS.hasInterfaceImplementation(
              'implements OnChanges, OnInit',
              'OnInit'
            )
          ).toBe(true);
        });
      });
    });

    describe('VALIDATION_MESSAGES', () => {
      it('should generate INTERFACE_WITHOUT_METHOD messages', () => {
        const messages =
          AngularLifecycleConfiguration.VALIDATION_MESSAGES.INTERFACE_WITHOUT_METHOD(
            'OnInit',
            'ngOnInit',
            'test.component.ts'
          );

        expect(messages.violationMessage).toContain('OnInit');
        expect(messages.violationMessage).toContain('ngOnInit');
        expect(messages.suggestionMessage).toContain('test.component.ts');
      });

      it('should generate METHOD_WITHOUT_INTERFACE messages', () => {
        const messages =
          AngularLifecycleConfiguration.VALIDATION_MESSAGES.METHOD_WITHOUT_INTERFACE(
            'ngOnInit',
            'OnInit',
            'test.component.ts'
          );

        expect(messages.violationMessage).toContain('ngOnInit');
        expect(messages.violationMessage).toContain('OnInit');
      });

      it('should generate HTTP_IN_CONSTRUCTOR messages', () => {
        const messages =
          AngularLifecycleConfiguration.VALIDATION_MESSAGES.HTTP_IN_CONSTRUCTOR(
            'test.component.ts'
          );

        expect(messages.violationMessage).toContain('constructor');
        expect(messages.suggestionMessage).toContain('ngOnInit');
      });

      it('should generate ONCHANGES_WITHOUT_SIMPLECHANGES messages', () => {
        const messages =
          AngularLifecycleConfiguration.VALIDATION_MESSAGES.ONCHANGES_WITHOUT_SIMPLECHANGES(
            'test.component.ts'
          );

        expect(messages.violationMessage).toContain('SimpleChanges');
        expect(messages.suggestionMessage).toContain('SimpleChanges');
      });
    });
  });

  describe('AngularLifecycleValidationPatterns', () => {
    describe('validateInterfaceImplementation', () => {
      it('should add violation when interface implemented without method', () => {
        const content = `
          export class TestComponent implements OnInit {
            // Missing ngOnInit method
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

        expect(violations.length).toBeGreaterThan(0);
        expect(violations[0]).toContain('OnInit');
      });

      it('should not add violation when interface has matching method', () => {
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
      });

      it('should not add violation when method and interface exist', () => {
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
    });

    describe('validateOnChangesImplementation', () => {
      it('should add violation when ngOnChanges lacks SimpleChanges', () => {
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
    });

    describe('validateOnInitUsage', () => {
      it('should add violation when HTTP calls are in constructor', () => {
        const content = `
          export class TestComponent implements OnInit {
            constructor(private http: HttpClient) {
              this.http.get('/api').subscribe(data => {});
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
      });

      it('should not add violation when constructor has no async operations', () => {
        const content = `
          export class TestComponent implements OnInit {
            constructor(private dataService: DataService) { }
            ngOnInit() {
              this.loadData();
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
    });
  });
});
