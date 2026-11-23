/**
 * @fileoverview Tests for event-listeners-configuration.ts
 * @description Tests for Event Listeners configuration utilities
 */

import { FileUtils } from '../../src/utils/file-utils';
import { EventListenersConfiguration } from '../../src/utils/performance/event-listeners/event-listeners-configuration';

describe('utils/performance/event-listeners/event-listeners-configuration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = FileUtils.createTempDirectory('event-listeners-config-test-');
  });

  afterEach(() => {
    FileUtils.deleteDirectory(tempDir);
  });

  describe('analyzeEventListenerPatterns', () => {
    it('should detect window.addEventListener', () => {
      const content = 'window.addEventListener("resize", handler);';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasWindowListener).toBe(true);
      expect(result.hasDocumentListener).toBe(false);
    });

    it('should detect document.addEventListener', () => {
      const content = 'document.addEventListener("click", handler);';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasDocumentListener).toBe(true);
      expect(result.hasWindowListener).toBe(false);
    });

    it('should detect element.addEventListener', () => {
      const content = 'this.element.addEventListener("scroll", handler);';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasElementListener).toBe(true);
    });

    it('should detect removeEventListener as cleanup indicator', () => {
      const content = 'element.removeEventListener("click", handler);';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasCleanupIndicators).toBe(true);
    });

    it('should detect ngOnDestroy as cleanup indicator', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasCleanupIndicators).toBe(true);
    });

    it('should return false for all when no patterns found', () => {
      const content = 'const x = 1 + 1;';
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasWindowListener).toBe(false);
      expect(result.hasDocumentListener).toBe(false);
      expect(result.hasElementListener).toBe(false);
      expect(result.hasCleanupIndicators).toBe(false);
    });

    it('should detect all patterns in same content', () => {
      const content = `
        window.addEventListener("resize", onResize);
        document.addEventListener("click", onClick);
        element.addEventListener("scroll", onScroll);
        ngOnDestroy() {}
      `;
      const result =
        EventListenersConfiguration.analyzeEventListenerPatterns(content);

      expect(result.hasWindowListener).toBe(true);
      expect(result.hasDocumentListener).toBe(true);
      expect(result.hasElementListener).toBe(true);
      expect(result.hasCleanupIndicators).toBe(true);
    });
  });

  describe('analyzeHostListenerPatterns', () => {
    it('should detect HostListener decorator', () => {
      const content = '@HostListener("click") onClick() {}';
      const result =
        EventListenersConfiguration.analyzeHostListenerPatterns(content);

      expect(result.hasHostListener).toBe(true);
    });

    it('should detect ngOnDestroy method', () => {
      const content = 'ngOnDestroy() { this.cleanup(); }';
      const result =
        EventListenersConfiguration.analyzeHostListenerPatterns(content);

      expect(result.hasNgOnDestroy).toBe(true);
    });

    it('should detect both HostListener and ngOnDestroy', () => {
      const content = `
        @HostListener("click") onClick() {}
        ngOnDestroy() { this.cleanup(); }
      `;
      const result =
        EventListenersConfiguration.analyzeHostListenerPatterns(content);

      expect(result.hasHostListener).toBe(true);
      expect(result.hasNgOnDestroy).toBe(true);
    });

    it('should return false for both when not present', () => {
      const content = 'class SimpleClass {}';
      const result =
        EventListenersConfiguration.analyzeHostListenerPatterns(content);

      expect(result.hasHostListener).toBe(false);
      expect(result.hasNgOnDestroy).toBe(false);
    });

    it('should detect HostListener with event name', () => {
      const content = '@HostListener("scroll") onScroll(e) {}';
      const result =
        EventListenersConfiguration.analyzeHostListenerPatterns(content);

      expect(result.hasHostListener).toBe(true);
    });
  });

  describe('extractEventListenerDetails', () => {
    it('should extract single event listener details', () => {
      const content = 'window.addEventListener("resize", onResize';
      const result =
        EventListenersConfiguration.extractEventListenerDetails(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.target).toBe('window');
      expect(result[0]?.event).toBe('resize');
      expect(result[0]?.handler).toBe('onResize');
    });

    it('should extract multiple event listener details', () => {
      const content = `
        window.addEventListener("resize", onResize
        document.addEventListener("click", onClick
        element.addEventListener("scroll", onScroll
      `;
      const result =
        EventListenersConfiguration.extractEventListenerDetails(content);

      expect(result).toHaveLength(3);
      expect(result[0]?.event).toBe('resize');
      expect(result[1]?.event).toBe('click');
      expect(result[2]?.event).toBe('scroll');
    });

    it('should return empty array when no listeners found', () => {
      const content = 'const x = 1;';
      const result =
        EventListenersConfiguration.extractEventListenerDetails(content);

      expect(result).toHaveLength(0);
    });

    it('should extract listener with this.element target', () => {
      const content = 'this.element.addEventListener("focus", onFocus';
      const result =
        EventListenersConfiguration.extractEventListenerDetails(content);

      expect(result).toHaveLength(1);
      expect(result[0]?.target).toBe('this.element');
      expect(result[0]?.event).toBe('focus');
    });

    it('should include full match in result', () => {
      const content = 'window.addEventListener("keydown", handleKey';
      const result =
        EventListenersConfiguration.extractEventListenerDetails(content);

      expect(result[0]?.full).toContain('addEventListener');
      expect(result[0]?.full).toContain('keydown');
    });
  });

  describe('hasListenerCleanup', () => {
    it('should return true when matching removeEventListener exists', () => {
      const content = `
        window.addEventListener("resize", onResize);
        window.removeEventListener("resize", onResize);
      `;
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'window',
        'resize',
        'onResize'
      );

      expect(result).toBe(true);
    });

    it('should return false when no removeEventListener exists', () => {
      const content = 'window.addEventListener("resize", onResize);';
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'window',
        'resize',
        'onResize'
      );

      expect(result).toBe(false);
    });

    it('should return false for mismatched event', () => {
      const content = `
        window.addEventListener("resize", onResize);
        window.removeEventListener("click", onResize);
      `;
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'window',
        'resize',
        'onResize'
      );

      expect(result).toBe(false);
    });

    it('should return false for mismatched handler', () => {
      const content = `
        window.addEventListener("resize", onResize);
        window.removeEventListener("resize", otherHandler);
      `;
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'window',
        'resize',
        'onResize'
      );

      expect(result).toBe(false);
    });

    it('should handle this.element target with escaping', () => {
      const content = `
        this.element.addEventListener("click", onClick);
        this.element.removeEventListener("click", onClick);
      `;
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'this.element',
        'click',
        'onClick'
      );

      expect(result).toBe(true);
    });

    it('should handle document target', () => {
      const content = `
        document.addEventListener("scroll", onScroll);
        document.removeEventListener("scroll", onScroll);
      `;
      const result = EventListenersConfiguration.hasListenerCleanup(
        content,
        'document',
        'scroll',
        'onScroll'
      );

      expect(result).toBe(true);
    });
  });
});
