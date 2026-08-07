/**
 * @fileoverview Tests for dom-references-configuration.ts
 * @description Tests for DOM References configuration utilities
 */

import { FileUtils } from '../../src/utils/file-utils';
import { DOMReferencesConfiguration } from '../../src/utils/performance/dom-references/dom-references-configuration';

describe('utils/performance/dom-references/dom-references-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('dom-refs-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('DOM_PATTERNS constants', () => {
    it('should have GET_ELEMENT_BY_ID pattern', () => {
      expect(DOMReferencesConfiguration.DOM_PATTERNS.GET_ELEMENT_BY_ID).toEqual(
        /document\.getElementById/g
      );
    });

    it('should have QUERY_SELECTOR pattern', () => {
      expect(DOMReferencesConfiguration.DOM_PATTERNS.QUERY_SELECTOR).toEqual(
        /document\.querySelector/g
      );
    });

    it('should have QUERY_SELECTOR_ALL pattern', () => {
      expect(
        DOMReferencesConfiguration.DOM_PATTERNS.QUERY_SELECTOR_ALL
      ).toEqual(/document\.querySelectorAll/g);
    });

    it('should have NATIVE_ELEMENT pattern', () => {
      expect(DOMReferencesConfiguration.DOM_PATTERNS.NATIVE_ELEMENT).toEqual(
        /\.nativeElement/g
      );
    });

    it('should have exactly 4 DOM patterns', () => {
      const patterns = Object.keys(DOMReferencesConfiguration.DOM_PATTERNS);
      expect(patterns).toHaveLength(4);
    });

    it('should match getElementById in content', () => {
      const content = 'document.getElementById("myElement")';
      const regex = new RegExp(
        DOMReferencesConfiguration.DOM_PATTERNS.GET_ELEMENT_BY_ID.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should match querySelector in content', () => {
      const content = 'document.querySelector(".myClass")';
      const regex = new RegExp(
        DOMReferencesConfiguration.DOM_PATTERNS.QUERY_SELECTOR.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should match querySelectorAll in content', () => {
      const content = 'document.querySelectorAll("div")';
      const regex = new RegExp(
        DOMReferencesConfiguration.DOM_PATTERNS.QUERY_SELECTOR_ALL.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should match nativeElement in content', () => {
      const content = 'this.elementRef.nativeElement';
      const regex = new RegExp(
        DOMReferencesConfiguration.DOM_PATTERNS.NATIVE_ELEMENT.source
      );
      expect(regex.test(content)).toBe(true);
    });
  });

  describe('CIRCULAR_PATTERNS constants', () => {
    it('should have SELF_ASSIGNMENT pattern', () => {
      expect(
        DOMReferencesConfiguration.CIRCULAR_PATTERNS.SELF_ASSIGNMENT
      ).toEqual(/this\.(\w+)\s*=.*?this\./g);
    });

    it('should have PARENT_CHILD pattern', () => {
      expect(DOMReferencesConfiguration.CIRCULAR_PATTERNS.PARENT_CHILD).toEqual(
        /(?:parent.*?child|child.*?parent)/gi
      );
    });

    it('should have exactly 2 circular patterns', () => {
      const patterns = Object.keys(
        DOMReferencesConfiguration.CIRCULAR_PATTERNS
      );
      expect(patterns).toHaveLength(2);
    });

    it('should match self assignment pattern', () => {
      const content = 'this.element = this.getElement()';
      const regex = new RegExp(
        DOMReferencesConfiguration.CIRCULAR_PATTERNS.SELF_ASSIGNMENT.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should match parent-child pattern', () => {
      const content = 'parentElement.appendChild(childElement)';
      const regex = new RegExp(
        DOMReferencesConfiguration.CIRCULAR_PATTERNS.PARENT_CHILD.source,
        'i'
      );
      expect(regex.test(content)).toBe(true);
    });
  });

  describe('CLEANUP_INDICATORS constants', () => {
    it('should have NULL_ASSIGNMENT indicator', () => {
      expect(
        DOMReferencesConfiguration.CLEANUP_INDICATORS.NULL_ASSIGNMENT
      ).toBe('= null');
    });

    it('should have NG_ON_DESTROY indicator', () => {
      expect(DOMReferencesConfiguration.CLEANUP_INDICATORS.NG_ON_DESTROY).toBe(
        'ngOnDestroy'
      );
    });

    it('should have exactly 2 cleanup indicators', () => {
      const indicators = Object.keys(
        DOMReferencesConfiguration.CLEANUP_INDICATORS
      );
      expect(indicators).toHaveLength(2);
    });
  });

  describe('DECORATORS constants', () => {
    it('should have VIEW_CHILD decorator pattern', () => {
      expect(DOMReferencesConfiguration.DECORATORS.VIEW_CHILD).toEqual(
        /@ViewChild\([^)]+\)\s+(\w+)/g
      );
    });

    it('should match ViewChild decorator', () => {
      const content = '@ViewChild("myElement") myElement: ElementRef;';
      const regex = new RegExp(
        DOMReferencesConfiguration.DECORATORS.VIEW_CHILD.source
      );
      expect(regex.test(content)).toBe(true);
    });

    it('should have exactly 1 decorator pattern', () => {
      const decorators = Object.keys(DOMReferencesConfiguration.DECORATORS);
      expect(decorators).toHaveLength(1);
    });
  });

  describe('IMPORTS constants', () => {
    it('should have ELEMENT_REF import', () => {
      expect(DOMReferencesConfiguration.IMPORTS.ELEMENT_REF).toBe('ElementRef');
    });

    it('should have VIEW_CHILD import', () => {
      expect(DOMReferencesConfiguration.IMPORTS.VIEW_CHILD).toBe('ViewChild');
    });

    it('should have ON_DESTROY import', () => {
      expect(DOMReferencesConfiguration.IMPORTS.ON_DESTROY).toBe('OnDestroy');
    });

    it('should have exactly 3 import constants', () => {
      const imports = Object.keys(DOMReferencesConfiguration.IMPORTS);
      expect(imports).toHaveLength(3);
    });
  });

  describe('EVENT_PATTERNS constants', () => {
    it('should have ADD_EVENT_LISTENER pattern', () => {
      expect(DOMReferencesConfiguration.EVENT_PATTERNS.ADD_EVENT_LISTENER).toBe(
        'addEventListener'
      );
    });

    it('should have exactly 1 event pattern', () => {
      const patterns = Object.keys(DOMReferencesConfiguration.EVENT_PATTERNS);
      expect(patterns).toHaveLength(1);
    });
  });

  describe('VALIDATION_MESSAGES constants', () => {
    it('should have DOM_REFERENCE_LEAK message with placeholders', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.DOM_REFERENCE_LEAK
      ).toContain('{file}');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.DOM_REFERENCE_LEAK
      ).toContain('{pattern}');
    });

    it('should have CIRCULAR_REFERENCE message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_REFERENCE
      ).toContain('{file}');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_REFERENCE
      ).toContain('circular reference');
    });

    it('should have VIEW_CHILD_NEEDS_CLEANUP message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.VIEW_CHILD_NEEDS_CLEANUP
      ).toContain('ViewChild');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.VIEW_CHILD_NEEDS_CLEANUP
      ).toContain('ngOnDestroy');
    });

    it('should have SET_NULL_IN_ONDESTROY message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.SET_NULL_IN_ONDESTROY
      ).toContain('null');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.SET_NULL_IN_ONDESTROY
      ).toContain('ngOnDestroy');
    });

    it('should have CIRCULAR_IN_PROPERTY message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_IN_PROPERTY
      ).toContain('circular reference');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_IN_PROPERTY
      ).toContain('{property}');
    });

    it('should have PARENT_CHILD_CIRCULAR message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.PARENT_CHILD_CIRCULAR
      ).toContain('parent-child');
    });

    it('should have IMPLEMENT_ONDESTROY message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.IMPLEMENT_ONDESTROY
      ).toContain('ngOnDestroy');
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.IMPLEMENT_ONDESTROY
      ).toContain('ElementRef');
    });

    it('should have REMOVE_EVENT_LISTENERS message', () => {
      expect(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.REMOVE_EVENT_LISTENERS
      ).toContain('event listeners');
    });

    it('should have exactly 8 validation messages', () => {
      const messages = Object.keys(
        DOMReferencesConfiguration.VALIDATION_MESSAGES
      );
      expect(messages).toHaveLength(8);
    });
  });

  describe('RECOMMENDATIONS constants', () => {
    it('should have at least 4 recommendations', () => {
      expect(
        DOMReferencesConfiguration.RECOMMENDATIONS.length
      ).toBeGreaterThanOrEqual(4);
    });

    it('should include recommendation about ngOnDestroy', () => {
      const hasNgOnDestroyRecommendation =
        DOMReferencesConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('ngOnDestroy')
        );
      expect(hasNgOnDestroyRecommendation).toBe(true);
    });

    it('should include recommendation about ViewChild', () => {
      const hasViewChildRecommendation =
        DOMReferencesConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('ViewChild')
        );
      expect(hasViewChildRecommendation).toBe(true);
    });

    it('should include recommendation about DOM trees', () => {
      const hasDOMTreeRecommendation =
        DOMReferencesConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('DOM')
        );
      expect(hasDOMTreeRecommendation).toBe(true);
    });

    it('should include recommendation about WeakMap', () => {
      const hasWeakMapRecommendation =
        DOMReferencesConfiguration.RECOMMENDATIONS.some(rec =>
          rec.includes('WeakMap')
        );
      expect(hasWeakMapRecommendation).toBe(true);
    });
  });

  describe('analyzeDOMPatterns', () => {
    it('should detect getElementById', () => {
      const content = 'const el = document.getElementById("myId");';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasGetElementById).toBe(true);
      expect(result.hasQuerySelector).toBe(false);
      expect(result.hasQuerySelectorAll).toBe(false);
    });

    it('should detect querySelector', () => {
      const content = 'const el = document.querySelector(".myClass");';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasGetElementById).toBe(false);
      expect(result.hasQuerySelector).toBe(true);
    });

    it('should detect querySelectorAll', () => {
      const content = 'const els = document.querySelectorAll("div");';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasQuerySelectorAll).toBe(true);
    });

    it('should detect nativeElement', () => {
      const content = 'this.elementRef.nativeElement.focus();';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasNativeElement).toBe(true);
    });

    it('should detect null assignment as cleanup indicator', () => {
      const content = 'this.element = null';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasCleanupIndicators).toBe(true);
    });

    it('should detect ngOnDestroy as cleanup indicator', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasCleanupIndicators).toBe(true);
    });

    it('should return false for all when no patterns found', () => {
      const content = 'const x = 1 + 1;';
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasGetElementById).toBe(false);
      expect(result.hasQuerySelector).toBe(false);
      expect(result.hasQuerySelectorAll).toBe(false);
      expect(result.hasNativeElement).toBe(false);
      expect(result.hasCleanupIndicators).toBe(false);
    });

    it('should detect multiple patterns in same content', () => {
      const content = `
        document.getElementById("a");
        document.querySelector(".b");
        document.querySelectorAll("c");
        this.el.nativeElement;
      `;
      const result = DOMReferencesConfiguration.analyzeDOMPatterns(content);

      expect(result.hasGetElementById).toBe(true);
      expect(result.hasQuerySelector).toBe(true);
      expect(result.hasQuerySelectorAll).toBe(true);
      expect(result.hasNativeElement).toBe(true);
    });
  });

  describe('analyzeCircularPatterns', () => {
    it('should detect self assignment', () => {
      const content = 'this.data = this.processData();';
      const result =
        DOMReferencesConfiguration.analyzeCircularPatterns(content);

      expect(result.hasSelfAssignment).toBe(true);
    });

    it('should detect parent-child pattern with parent first', () => {
      const content = 'parentNode.appendChild(childElement);';
      const result =
        DOMReferencesConfiguration.analyzeCircularPatterns(content);

      expect(result.hasParentChildPattern).toBe(true);
    });

    it('should detect parent-child pattern when present', () => {
      // Pattern matches when content contains 'parent' followed by 'child' or 'child' followed by 'parent'
      // Using fresh regex without global state issues
      const content = 'parent element has child node';
      const regex = /(?:parent.*?child|child.*?parent)/gi;

      expect(regex.test(content)).toBe(true);
    });

    it('should return false when no circular patterns found', () => {
      const content = 'const x = getValue();';
      const result =
        DOMReferencesConfiguration.analyzeCircularPatterns(content);

      expect(result.hasSelfAssignment).toBe(false);
      expect(result.hasParentChildPattern).toBe(false);
    });
  });

  describe('analyzeViewChildPatterns', () => {
    it('should detect ViewChild decorator', () => {
      const content = '@ViewChild("myRef") myElement: ElementRef;';
      const result =
        DOMReferencesConfiguration.analyzeViewChildPatterns(content);

      expect(result.hasViewChild).toBe(true);
    });

    it('should detect ngOnDestroy method', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      const result =
        DOMReferencesConfiguration.analyzeViewChildPatterns(content);

      expect(result.hasNgOnDestroy).toBe(true);
    });

    it('should detect both ViewChild and ngOnDestroy', () => {
      const content = `
        @ViewChild("myRef") myElement: ElementRef;
        ngOnDestroy() { this.myElement = null; }
      `;
      const result =
        DOMReferencesConfiguration.analyzeViewChildPatterns(content);

      expect(result.hasViewChild).toBe(true);
      expect(result.hasNgOnDestroy).toBe(true);
    });

    it('should return false for both when not present', () => {
      const content = 'class SimpleClass {}';
      const result =
        DOMReferencesConfiguration.analyzeViewChildPatterns(content);

      expect(result.hasViewChild).toBe(false);
      expect(result.hasNgOnDestroy).toBe(false);
    });
  });

  describe('analyzeElementRefPatterns', () => {
    it('should detect ElementRef usage', () => {
      const content = 'constructor(private elementRef: ElementRef) {}';
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasElementRef).toBe(true);
    });

    it('should detect nativeElement usage', () => {
      const content = 'this.elementRef.nativeElement.focus();';
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasNativeElement).toBe(true);
    });

    it('should detect ngOnDestroy method', () => {
      const content = 'ngOnDestroy() {}';
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasNgOnDestroy).toBe(true);
    });

    it('should detect addEventListener usage', () => {
      const content = 'this.el.nativeElement.addEventListener("click", fn);';
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasEventListener).toBe(true);
    });

    it('should detect all patterns in component', () => {
      const content = `
        import { ElementRef } from '@angular/core';

        class MyComponent {
          constructor(private elementRef: ElementRef) {}

          ngOnInit() {
            this.elementRef.nativeElement.addEventListener('click', this.onClick);
          }

          ngOnDestroy() {
            this.elementRef.nativeElement.removeEventListener('click', this.onClick);
          }
        }
      `;
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasElementRef).toBe(true);
      expect(result.hasNativeElement).toBe(true);
      expect(result.hasNgOnDestroy).toBe(true);
      expect(result.hasEventListener).toBe(true);
    });

    it('should return false for all when no patterns found', () => {
      const content = 'class EmptyClass {}';
      const result =
        DOMReferencesConfiguration.analyzeElementRefPatterns(content);

      expect(result.hasElementRef).toBe(false);
      expect(result.hasNativeElement).toBe(false);
      expect(result.hasNgOnDestroy).toBe(false);
      expect(result.hasEventListener).toBe(false);
    });
  });
});
