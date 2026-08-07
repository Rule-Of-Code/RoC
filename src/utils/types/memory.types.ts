/**
 * Memory Management Types
 * Type definitions for memory leak detection patterns
 */

export interface MemoryLeakPatterns {
  unsubscribedObservables: string[];
  missingOnDestroy: string[];
  globalEventListeners: string[];
  setIntervalWithoutClear: string[];
  domReferences: string[];
  circularReferences: string[];
}

export interface MemoryPractices {
  largeDataStructures: string[];
  violations: string[];
  suggestions: string[];
}

export interface MemoryAnalysisResult {
  patterns: MemoryLeakPatterns;
  practices: MemoryPractices;
  recommendations: string[];
  totalIssues: number;
}

export interface ComponentMemoryProfile {
  fileName: string;
  subscriptions: number;
  timers: number;
  eventListeners: number;
  domReferences: number;
  hasOnDestroy: boolean;
  memoryRisk: 'high' | 'low' | 'medium';
}
