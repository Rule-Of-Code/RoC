/**
 * Standard Result Interfaces for Analyzers
 * Provides consistent return types across all analyzer utilities
 */

/**
 * Standard analysis result interface
 * All analyzer utilities should return this consistent structure
 */
export interface AnalysisResult {
  violations: string[];
  suggestions: string[];
  passed?: boolean;
  score?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Extended checker result for law compliance
 * Used by law checkers and compliance analyzers
 */
export interface CheckerResult extends AnalysisResult {
  passed: boolean;
  score: number;
  lawId?: string;
  severity?: 'error' | 'info' | 'warning';
}

/**
 * Configuration analysis result
 * Used by configuration analyzers and setup checkers
 */
export interface ConfigAnalysisResult extends AnalysisResult {
  configPath?: string;
  configType?: string;
  isValid?: boolean;
  recommendations?: string[];
}

/**
 * Code quality analysis result
 * Used by code quality analyzers and pattern checkers
 */
export interface CodeQualityResult extends AnalysisResult {
  filesScanned: number;
  patternsFound: number;
  complexity?: number;
  maintainabilityIndex?: number;
}

/**
 * Security analysis result
 * Used by security analyzers and vulnerability scanners
 */
export interface SecurityAnalysisResult extends AnalysisResult {
  riskLevel?: 'critical' | 'high' | 'low' | 'medium';
  vulnerabilities?: Array<{
    type: string;
    severity: string;
    file: string;
    line?: number;
    description: string;
  }>;
  securityScore?: number;
}

/**
 * Performance analysis result
 * Used by performance analyzers and optimization checkers
 */
export interface PerformanceAnalysisResult extends AnalysisResult {
  performanceScore?: number;
  optimizations?: string[];
  bundleSize?: number;
  loadTime?: number;
}

/**
 * Angular-specific analysis result
 * Used by Angular analyzers and component checkers
 */
export interface AngularAnalysisResult extends CodeQualityResult {
  angularVersion?: string;
  componentCount?: number;
  serviceCount?: number;
  moduleCount?: number;
  bestPractices?: string[];
}

/**
 * NgRx-specific analysis result
 * Used by NgRx analyzers and state management checkers
 */
export interface NgRxAnalysisResult extends AngularAnalysisResult {
  storeCompliant?: boolean;
  actionCount?: number;
  reducerCount?: number;
  selectorCount?: number;
  effectCount?: number;
}

/**
 * Utility functions for creating standard results
 */
export class ResultFactory {
  /**
   * Calculate standard score from violations count
   */
  private static calculateScore(violations: string[]): number {
    const passed = violations.length === 0;
    return passed ? 100 : Math.max(0, 100 - violations.length * 10);
  }

  /**
   * Create a standard AnalysisResult
   */
  static createAnalysisResult(
    violations: string[] = [],
    suggestions: string[] = [],
    metadata?: Record<string, unknown>
  ): AnalysisResult {
    const score = this.calculateScore(violations);
    return {
      violations,
      suggestions,
      passed: score >= 100,
      score,
      metadata,
    };
  }

  /**
   * Create a CheckerResult
   */
  static createCheckerResult(
    violations: string[] = [],
    suggestions: string[] = [],
    lawId?: string,
    severity: 'error' | 'info' | 'warning' = 'error'
  ): CheckerResult {
    const score = this.calculateScore(violations);
    const passed = score >= 100;

    return {
      violations,
      suggestions,
      passed,
      score,
      lawId,
      severity,
    };
  }

  /**
   * Create base analysis result with common fields
   */
  private static createBaseResult(
    violations: string[] = [],
    suggestions: string[] = [],
    filesScanned = 0,
    patternsFound = 0
  ): {
    violations: string[];
    suggestions: string[];
    passed: boolean;
    score: number;
    filesScanned: number;
    patternsFound: number;
    componentCount: number;
    serviceCount: number;
    moduleCount: number;
    bestPractices: string[];
  } {
    const score = this.calculateScore(violations);
    return {
      violations,
      suggestions,
      passed: score >= 100,
      score,
      filesScanned,
      patternsFound,
      componentCount: 0,
      serviceCount: 0,
      moduleCount: 0,
      bestPractices: suggestions,
    };
  }

  /**
   * Create an AngularAnalysisResult
   */
  static createAngularResult(
    violations: string[] = [],
    suggestions: string[] = [],
    filesScanned = 0,
    patternsFound = 0
  ): AngularAnalysisResult {
    return this.createBaseResult(
      violations,
      suggestions,
      filesScanned,
      patternsFound
    ) as AngularAnalysisResult;
  }

  /**
   * Create an NgRxAnalysisResult
   */
  static createNgRxResult(
    violations: string[] = [],
    suggestions: string[] = [],
    filesScanned = 0,
    patternsFound = 0
  ): NgRxAnalysisResult {
    const baseResult = this.createBaseResult(
      violations,
      suggestions,
      filesScanned,
      patternsFound
    );
    return {
      ...baseResult,
      storeCompliant: baseResult.score >= 100,
      actionCount: 0,
      reducerCount: 0,
      selectorCount: 0,
      effectCount: 0,
    } as NgRxAnalysisResult;
  }
}
