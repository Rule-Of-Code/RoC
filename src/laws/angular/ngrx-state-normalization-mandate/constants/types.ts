/**
 * NgRx State Normalization Types
 * TypeScript interfaces for the analysis results
 */

export interface EntityUsageResult {
  hasEntityAdapter: boolean;
  version?: string;
  entityFiles: string[];
}

export interface NormalizationPatternResult {
  followsPatterns: boolean;
  violations: string[];
  issueCount: number;
}

export interface NestedStateResult {
  hasNestedState: boolean;
  examples: string[];
  severity: 'critical' | 'high' | 'low' | 'medium';
}

export interface SelectorCompositionResult {
  followsBestPractices: boolean;
  issues: string[];
  issueCount: number;
}

export interface StateConsistencyResult {
  isConsistent: boolean;
  inconsistencies: string[];
  stateShapeCount: number;
}

export interface StateNormalizationAnalysisResult {
  entityUsage: EntityUsageResult;
  normalization: NormalizationPatternResult;
  nestedState: NestedStateResult;
  selectorComposition: SelectorCompositionResult;
  stateConsistency: StateConsistencyResult;
}
