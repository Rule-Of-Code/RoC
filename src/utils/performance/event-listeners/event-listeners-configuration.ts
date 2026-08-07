/**
 * Event Listeners Configuration
 * Centralized patterns, messages and thresholds for event listener memory leak detection
 */

import { ANGULAR_CONSTANTS } from '../../angular-constants';

export class EventListenersConfiguration {
  static readonly EVENT_PATTERNS = {
    WINDOW_LISTENER: /window\.addEventListener\(/g,
    DOCUMENT_LISTENER: /document\.addEventListener\(/g,
    ELEMENT_LISTENER: /\.addEventListener\(/g,
    ADD_LISTENER_DETAIL: /([\w.]+)\.addEventListener\(['"](\w+)['"],\s*(\w+)/g,
  } as const;

  static readonly METHOD_NAMES = {
    ADD_EVENT_LISTENER: ANGULAR_CONSTANTS.ADD_EVENT_LISTENER,
    REMOVE_EVENT_LISTENER: 'removeEventListener',
  } as const;

  static readonly CLEANUP_PATTERNS = {
    REMOVE_LISTENER: this.METHOD_NAMES.REMOVE_EVENT_LISTENER,
    NG_ON_DESTROY: ANGULAR_CONSTANTS.NG_ON_DESTROY,
  } as const;

  static readonly DECORATORS = {
    HOST_LISTENER: /@HostListener\(['"](\w+)['"].*?\)/g,
  } as const;

  static readonly VALIDATION_MESSAGES = {
    MISSING_REMOVAL: (file: string) =>
      `${file}: Event listener added without corresponding removal`,
    MISSING_CLEANUP: (listener: string) => `Missing cleanup for: ${listener}`,
    CONSIDER_ONDESTROY:
      'Consider implementing ngOnDestroy for complex event handling scenarios',
  } as const;

  static readonly RECOMMENDATIONS = [
    'Always remove event listeners in ngOnDestroy or component cleanup',
    'Consider using HostListener decorator for automatic cleanup',
    'Store event listener references for proper removal',
    'Use Angular Renderer2 for safer DOM manipulation',
  ] as const;

  /**
   * Analyzes content for event listener patterns
   * RULE 1: Centralized pattern analysis (single source of truth)
   */
  static analyzeEventListenerPatterns(content: string): {
    hasWindowListener: boolean;
    hasDocumentListener: boolean;
    hasElementListener: boolean;
    hasCleanupIndicators: boolean;
  } {
    return {
      hasWindowListener: this.EVENT_PATTERNS.WINDOW_LISTENER.test(content),
      hasDocumentListener: this.EVENT_PATTERNS.DOCUMENT_LISTENER.test(content),
      hasElementListener: this.EVENT_PATTERNS.ELEMENT_LISTENER.test(content),
      hasCleanupIndicators:
        content.includes(this.CLEANUP_PATTERNS.REMOVE_LISTENER) ||
        content.includes(this.CLEANUP_PATTERNS.NG_ON_DESTROY),
    };
  }

  /**
   * Analyzes content for HostListener usage
   * RULE 1: Centralized pattern analysis
   */
  static analyzeHostListenerPatterns(content: string): {
    hasHostListener: boolean;
    hasNgOnDestroy: boolean;
  } {
    return {
      hasHostListener: this.DECORATORS.HOST_LISTENER.test(content),
      hasNgOnDestroy: content.includes(this.CLEANUP_PATTERNS.NG_ON_DESTROY),
    };
  }

  /**
   * Extracts detailed event listener information
   * RULE 1: Centralized listener extraction logic
   */
  static extractEventListenerDetails(
    content: string
  ): Array<{ target: string; event: string; handler: string; full: string }> {
    const details: Array<{
      target: string;
      event: string;
      handler: string;
      full: string;
    }> = [];
    const regex = new RegExp(
      this.EVENT_PATTERNS.ADD_LISTENER_DETAIL.source,
      'g'
    );
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match[1] && match[2] && match[3]) {
        details.push({
          target: match[1],
          event: match[2],
          handler: match[3],
          full: match[0],
        });
      }
    }

    return details;
  }

  /**
   * Checks if a specific listener has cleanup
   * RULE 1: Centralized cleanup detection
   */
  static hasListenerCleanup(
    content: string,
    target: string,
    event: string,
    handler: string
  ): boolean {
    const escapedTarget = target.replace(/\./g, '\\.');
    const removePattern = new RegExp(
      `${escapedTarget}\\.${this.METHOD_NAMES.REMOVE_EVENT_LISTENER}\\(['"]${event}['"],\\s*${handler}\\)`
    );
    return removePattern.test(content);
  }
}
