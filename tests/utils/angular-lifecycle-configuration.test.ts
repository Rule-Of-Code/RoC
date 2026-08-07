/**
 * @fileoverview Tests for angular-lifecycle-configuration.ts
 * @description Tests for Angular lifecycle hooks configuration utilities
 */

import { AngularLifecycleConfiguration } from '../../src/utils/angular/angular-lifecycle';
import { FileUtils } from '../../src/utils/file-utils';

describe('utils/angular/angular-lifecycle-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('angular-lifecycle-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('LIFECYCLE_INTERFACES', () => {
    it('should contain OnInit interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'OnInit'
      );
    });

    it('should contain OnDestroy interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'OnDestroy'
      );
    });

    it('should contain OnChanges interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'OnChanges'
      );
    });

    it('should contain DoCheck interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'DoCheck'
      );
    });

    it('should contain AfterContentInit interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'AfterContentInit'
      );
    });

    it('should contain AfterContentChecked interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'AfterContentChecked'
      );
    });

    it('should contain AfterViewInit interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'AfterViewInit'
      );
    });

    it('should contain AfterViewChecked interface', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toContain(
        'AfterViewChecked'
      );
    });

    it('should have exactly 8 lifecycle interfaces', () => {
      expect(AngularLifecycleConfiguration.LIFECYCLE_INTERFACES).toHaveLength(
        8
      );
    });
  });

  describe('HOOK_MAPPINGS', () => {
    it('should map ngOnInit to OnInit', () => {
      const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
        m => m.method === 'ngOnInit'
      );

      expect(mapping).toBeDefined();
      expect(mapping?.interface).toBe('OnInit');
    });

    it('should map ngOnDestroy to OnDestroy', () => {
      const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
        m => m.method === 'ngOnDestroy'
      );

      expect(mapping).toBeDefined();
      expect(mapping?.interface).toBe('OnDestroy');
    });

    it('should map ngOnChanges to OnChanges', () => {
      const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
        m => m.method === 'ngOnChanges'
      );

      expect(mapping).toBeDefined();
      expect(mapping?.interface).toBe('OnChanges');
    });

    it('should map ngDoCheck to DoCheck', () => {
      const mapping = AngularLifecycleConfiguration.HOOK_MAPPINGS.find(
        m => m.method === 'ngDoCheck'
      );

      expect(mapping).toBeDefined();
      expect(mapping?.interface).toBe('DoCheck');
    });

    it('should have 8 hook mappings', () => {
      expect(AngularLifecycleConfiguration.HOOK_MAPPINGS).toHaveLength(8);
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

    it('should have exactly 3 file extensions', () => {
      expect(
        AngularLifecycleConfiguration.ANGULAR_FILE_EXTENSIONS
      ).toHaveLength(3);
    });
  });

  describe('getMethodForInterface', () => {
    it('should return ngOnInit for OnInit', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('OnInit');

      expect(result).toBe('ngOnInit');
    });

    it('should return ngOnDestroy for OnDestroy', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('OnDestroy');

      expect(result).toBe('ngOnDestroy');
    });

    it('should return ngOnChanges for OnChanges', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('OnChanges');

      expect(result).toBe('ngOnChanges');
    });

    it('should return ngDoCheck for DoCheck', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('DoCheck');

      expect(result).toBe('ngDoCheck');
    });

    it('should return ngAfterContentInit for AfterContentInit', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('AfterContentInit');

      expect(result).toBe('ngAfterContentInit');
    });

    it('should return ngAfterViewChecked as fallback for unknown interface', () => {
      const result =
        AngularLifecycleConfiguration.getMethodForInterface('UnknownInterface');

      expect(result).toBe('ngAfterViewChecked');
    });
  });

  describe('getImplementedInterfaces', () => {
    it('should detect OnInit interface', () => {
      const content = 'export class TestComponent implements OnInit {}';
      const result =
        AngularLifecycleConfiguration.getImplementedInterfaces(content);

      expect(result).toContain('OnInit');
    });

    it('should detect multiple interfaces with comma separator', () => {
      const content =
        'export class TestComponent implements OnInit, OnDestroy {}';
      const result =
        AngularLifecycleConfiguration.getImplementedInterfaces(content);

      expect(result).toContain('OnInit');
      expect(result).toContain('OnDestroy');
    });

    it('should detect interfaces at different positions', () => {
      const content =
        'export class TestComponent implements OnInit, OnChanges, OnDestroy {}';
      const result =
        AngularLifecycleConfiguration.getImplementedInterfaces(content);

      expect(result).toContain('OnInit');
      expect(result).toContain('OnChanges');
      expect(result).toContain('OnDestroy');
    });

    it('should return empty array when no interfaces implemented', () => {
      const content = 'export class TestComponent {}';
      const result =
        AngularLifecycleConfiguration.getImplementedInterfaces(content);

      expect(result).toHaveLength(0);
    });

    it('should handle all 8 lifecycle interfaces', () => {
      const content =
        'implements OnInit, OnDestroy, OnChanges, DoCheck, AfterContentInit, AfterContentChecked, AfterViewInit, AfterViewChecked';
      const result =
        AngularLifecycleConfiguration.getImplementedInterfaces(content);

      expect(result).toHaveLength(8);
    });
  });

  describe('hasLifecycleMethod', () => {
    it('should detect ngOnInit method', () => {
      const content = `
        ngOnInit() {
          this.loadData();
        }
      `;
      const result = AngularLifecycleConfiguration.hasLifecycleMethod(
        content,
        'ngOnInit'
      );

      expect(result).toBe(true);
    });

    it('should detect ngOnDestroy method', () => {
      const content = `
        ngOnDestroy() {
          this.subscription.unsubscribe();
        }
      `;
      const result = AngularLifecycleConfiguration.hasLifecycleMethod(
        content,
        'ngOnDestroy'
      );

      expect(result).toBe(true);
    });

    it('should return false when method is not present', () => {
      const content = `
        ngOnInit() {
          this.loadData();
        }
      `;
      const result = AngularLifecycleConfiguration.hasLifecycleMethod(
        content,
        'ngOnDestroy'
      );

      expect(result).toBe(false);
    });

    it('should handle method with parameters', () => {
      const content = `
        ngOnChanges(changes: SimpleChanges) {
          console.log(changes);
        }
      `;
      const result = AngularLifecycleConfiguration.hasLifecycleMethod(
        content,
        'ngOnChanges'
      );

      expect(result).toBe(true);
    });
  });

  describe('PATTERN_DETECTORS', () => {
    describe('hasOnInitAndConstructor', () => {
      it('should return true when both ngOnInit and constructor present', () => {
        const content = `
          constructor() {}
          ngOnInit() {}
        `;
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasOnInitAndConstructor(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false when only constructor present', () => {
        const content = `
          constructor() {}
        `;
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasOnInitAndConstructor(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasHttpOrServiceUsage', () => {
      it('should detect this.http usage', () => {
        const content = 'this.http.get(url)';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect this.service usage', () => {
        const content = 'this.service.getData()';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect subscribe usage', () => {
        const content = 'observable.subscribe()';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
            content
          );

        expect(result).toBe(true);
      });

      it('should return false when no service/http usage', () => {
        const content = 'const x = 5;';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasHttpOrServiceUsage(
            content
          );

        expect(result).toBe(false);
      });
    });

    describe('hasAsyncOperationsInConstructor', () => {
      it('should detect subscribe in content', () => {
        const content = 'this.data$.subscribe(data => {});';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasAsyncOperationsInConstructor(
            content
          );

        expect(result).toBe(true);
      });

      it('should detect http in content', () => {
        const content = 'this.http.get(url)';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasAsyncOperationsInConstructor(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('hasInterfaceImplementation', () => {
      it('should detect interface with implements keyword', () => {
        const content = 'class Test implements OnInit';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasInterfaceImplementation(
            content,
            'OnInit'
          );

        expect(result).toBe(true);
      });

      it('should detect interface with comma separator', () => {
        const content = 'class Test implements SomeInterface, OnInit';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasInterfaceImplementation(
            content,
            'OnInit'
          );

        expect(result).toBe(true);
      });
    });

    describe('hasNgOnChanges', () => {
      it('should detect ngOnChanges method', () => {
        const content = 'ngOnChanges(changes: SimpleChanges) {}';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasNgOnChanges(
            content
          );

        expect(result).toBe(true);
      });
    });

    describe('hasSimpleChanges', () => {
      it('should detect SimpleChanges type', () => {
        const content = 'ngOnChanges(changes: SimpleChanges) {}';
        const result =
          AngularLifecycleConfiguration.PATTERN_DETECTORS.hasSimpleChanges(
            content
          );

        expect(result).toBe(true);
      });
    });
  });

  describe('extractConstructorContent', () => {
    it('should extract constructor body', () => {
      const content = `
        class Test {
          constructor() {
            this.init();
          }
        }
      `;
      const constructorIndex = content.indexOf('constructor');
      const result = AngularLifecycleConfiguration.extractConstructorContent(
        content,
        constructorIndex
      );

      expect(result).toContain('constructor');
      expect(result).toContain('this.init');
    });
  });

  describe('findConstructorIndex', () => {
    it('should find constructor position', () => {
      const content = 'class Test { constructor() {} }';
      const result =
        AngularLifecycleConfiguration.findConstructorIndex(content);

      expect(result).toBeGreaterThan(0);
    });

    it('should return -1 when no constructor', () => {
      const content = 'class Test { }';
      const result =
        AngularLifecycleConfiguration.findConstructorIndex(content);

      expect(result).toBe(-1);
    });
  });

  describe('findNgOnInitIndex', () => {
    it('should find ngOnInit position', () => {
      const content = 'ngOnInit() { }';
      const result = AngularLifecycleConfiguration.findNgOnInitIndex(content);

      expect(result).toBe(0);
    });

    it('should return -1 when no ngOnInit', () => {
      const content = 'class Test { }';
      const result = AngularLifecycleConfiguration.findNgOnInitIndex(content);

      expect(result).toBe(-1);
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should generate INTERFACE_WITHOUT_METHOD message', () => {
      const result =
        AngularLifecycleConfiguration.VALIDATION_MESSAGES.INTERFACE_WITHOUT_METHOD(
          'OnInit',
          'ngOnInit',
          'test.component.ts'
        );

      expect(result.violationMessage).toContain('OnInit');
      expect(result.violationMessage).toContain('ngOnInit');
      expect(result.violationMessage).toContain('test.component.ts');
      expect(result.suggestionMessage).toBeDefined();
    });

    it('should generate METHOD_WITHOUT_INTERFACE message', () => {
      const result =
        AngularLifecycleConfiguration.VALIDATION_MESSAGES.METHOD_WITHOUT_INTERFACE(
          'ngOnInit',
          'OnInit',
          'test.component.ts'
        );

      expect(result.violationMessage).toContain('ngOnInit');
      expect(result.violationMessage).toContain('OnInit');
      expect(result.suggestionMessage).toBeDefined();
    });

    it('should generate HTTP_IN_CONSTRUCTOR message', () => {
      const result =
        AngularLifecycleConfiguration.VALIDATION_MESSAGES.HTTP_IN_CONSTRUCTOR(
          'test.component.ts'
        );

      expect(result.violationMessage).toContain('HTTP');
      expect(result.violationMessage).toContain('constructor');
      expect(result.suggestionMessage).toContain('ngOnInit');
    });

    it('should generate ONCHANGES_WITHOUT_SIMPLECHANGES message', () => {
      const result =
        AngularLifecycleConfiguration.VALIDATION_MESSAGES.ONCHANGES_WITHOUT_SIMPLECHANGES(
          'test.component.ts'
        );

      expect(result.violationMessage).toContain('ngOnChanges');
      expect(result.violationMessage).toContain('SimpleChanges');
      expect(result.suggestionMessage).toBeDefined();
    });
  });
});
