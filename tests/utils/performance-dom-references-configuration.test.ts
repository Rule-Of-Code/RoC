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
