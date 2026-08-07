/**
 * DOM References Validation Patterns
 * Complete validation workflow for DOM reference memory leak detection
 */

import { FileUtils } from '../../file-utils';
import type { MemoryLeakPatterns } from '../../types/memory.types';
import { DOMReferencesConfiguration } from './dom-references-configuration';

export class DOMReferencesValidationPatterns {
  /**
   * Master orchestrator method - validates all DOM reference patterns
   */
  static validateAllDOMPatterns(files: string[]): Partial<MemoryLeakPatterns> {
    const domReferences: string[] = [];
    const circularReferences: string[] = [];

    files.forEach(file => {
      this.analyzeDOMFile(file, domReferences, circularReferences);
    });

    return {
      domReferences,
      circularReferences,
    };
  }

  /**
   * Analyzes individual file for DOM reference issues
   */
  private static analyzeDOMFile(
    file: string,
    domReferences: string[],
    circularReferences: string[]
  ): void {
    const content = FileUtils.readFile(file, {
      encoding: 'utf8',
      fallbackToEmpty: true,
    });
    if (!content) return;

    this.validateDOMReferences(file, content, domReferences);
    this.validateCircularReferences(file, content, circularReferences);
  }

  /**
   * Validates DOM references for potential memory leaks
   */
  private static validateDOMReferences(
    file: string,
    content: string,
    domReferences: string[]
  ): void {
    const patterns = DOMReferencesConfiguration.analyzeDOMPatterns(content);

    // Check each DOM pattern
    for (const pattern of Object.values(
      DOMReferencesConfiguration.DOM_PATTERNS
    )) {
      const matches = content.match(pattern);
      if (matches && !patterns.hasCleanupIndicators) {
        const message =
          DOMReferencesConfiguration.VALIDATION_MESSAGES.DOM_REFERENCE_LEAK.replace(
            '{file}',
            file
          ).replace('{pattern}', pattern.source);
        domReferences.push(message);
      }
    }
  }

  /**
   * Validates circular reference patterns
   */
  private static validateCircularReferences(
    file: string,
    content: string,
    circularReferences: string[]
  ): void {
    const patterns =
      DOMReferencesConfiguration.analyzeCircularPatterns(content);

    if (patterns.hasSelfAssignment || patterns.hasParentChildPattern) {
      const message =
        DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_REFERENCE.replace(
          '{file}',
          file
        );
      circularReferences.push(message);
    }
  }

  /**
   * Analyzes ViewChild usage for potential memory leaks
   */
  static analyzeViewChildUsage(content: string): {
    viewChildren: string[];
    issues: string[];
    suggestions: string[];
  } {
    const viewChildren: string[] = [];
    const issues: string[] = [];
    const suggestions: string[] = [];

    const patterns =
      DOMReferencesConfiguration.analyzeViewChildPatterns(content);

    // Find ViewChild declarations
    const viewChildRegex = new RegExp(
      DOMReferencesConfiguration.DECORATORS.VIEW_CHILD.source,
      'g'
    );
    let match;
    while ((match = viewChildRegex.exec(content)) !== null) {
      const name = match[1];
      if (name) {
        viewChildren.push(name);

        // Check if it's properly cleaned up
        if (
          !content.includes(
            `${name} ${DOMReferencesConfiguration.CLEANUP_INDICATORS.NULL_ASSIGNMENT}`
          ) &&
          !patterns.hasNgOnDestroy
        ) {
          const issueMessage =
            DOMReferencesConfiguration.VALIDATION_MESSAGES.VIEW_CHILD_NEEDS_CLEANUP.replace(
              '{name}',
              name
            );
          issues.push(issueMessage);

          const suggestionMessage =
            DOMReferencesConfiguration.VALIDATION_MESSAGES.SET_NULL_IN_ONDESTROY.replace(
              '{name}',
              name
            );
          suggestions.push(suggestionMessage);
        }
      }
    }

    return { viewChildren, issues, suggestions };
  }

  /**
   * Detects circular references in content
   */
  static detectCircularReferences(content: string): string[] {
    const issues: string[] = [];

    const patterns =
      DOMReferencesConfiguration.analyzeCircularPatterns(content);

    // Look for potential circular reference patterns
    if (patterns.hasSelfAssignment) {
      const selfAssignmentPattern =
        DOMReferencesConfiguration.CIRCULAR_PATTERNS.SELF_ASSIGNMENT;
      let match: RegExpExecArray | null;
      while ((match = selfAssignmentPattern.exec(content)) !== null) {
        if (match[1]) {
          const message =
            DOMReferencesConfiguration.VALIDATION_MESSAGES.CIRCULAR_IN_PROPERTY.replace(
              '{property}',
              match[1]
            );
          issues.push(message);
        }
      }
    }

    // Look for parent-child circular patterns
    if (patterns.hasParentChildPattern) {
      issues.push(
        DOMReferencesConfiguration.VALIDATION_MESSAGES.PARENT_CHILD_CIRCULAR
      );
    }

    return issues;
  }

  /**
   * Analyzes ElementRef usage for potential issues
   */
  static analyzeElementRefUsage(content: string): string[] {
    const suggestions: string[] = [];

    const patterns =
      DOMReferencesConfiguration.analyzeElementRefPatterns(content);

    if (patterns.hasElementRef && patterns.hasNativeElement) {
      if (!patterns.hasNgOnDestroy) {
        suggestions.push(
          DOMReferencesConfiguration.VALIDATION_MESSAGES.IMPLEMENT_ONDESTROY
        );
      }

      if (patterns.hasEventListener) {
        suggestions.push(
          DOMReferencesConfiguration.VALIDATION_MESSAGES.REMOVE_EVENT_LISTENERS
        );
      }
    }

    return suggestions;
  }
}
