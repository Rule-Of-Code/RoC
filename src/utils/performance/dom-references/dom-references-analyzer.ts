/**
 * DOM References Memory Analyzer
 * Specialized analyzer for detecting memory leaks from DOM references and circular references
 */

import type { MemoryLeakPatterns } from '../../types/memory.types';
import { DOMReferencesConfiguration } from './dom-references-configuration';
import { DOMReferencesValidationPatterns } from './dom-references-validation-patterns';

export class DOMReferencesAnalyzer {
  static checkDOMReferences(files: string[]): Partial<MemoryLeakPatterns> {
    return DOMReferencesValidationPatterns.validateAllDOMPatterns(files);
  }

  static getDOMRecommendations(): string[] {
    return [...DOMReferencesConfiguration.RECOMMENDATIONS];
  }

  static analyzeViewChildUsage(content: string): {
    viewChildren: string[];
    issues: string[];
    suggestions: string[];
  } {
    return DOMReferencesValidationPatterns.analyzeViewChildUsage(content);
  }

  static detectCircularReferences(content: string): string[] {
    return DOMReferencesValidationPatterns.detectCircularReferences(content);
  }

  static analyzeElementRefUsage(content: string): string[] {
    return DOMReferencesValidationPatterns.analyzeElementRefUsage(content);
  }
}
