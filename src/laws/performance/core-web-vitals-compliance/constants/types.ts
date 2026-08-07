export interface LighthouseCheckResult {
  hasConfig: boolean;
  configFiles: string[];
}

export interface PerformanceBudgetsResult {
  hasBudgets: boolean;
  budgetFiles: string[];
}

export interface BundleOptimizationResult {
  isOptimized: boolean;
  optimizations: string[];
}

export interface BrowserCachingResult {
  hasStrategy: boolean;
  strategies: string[];
}

export interface ImageOptimizationResult {
  isOptimized: boolean;
  optimizations: string[];
}

export interface ResourceHintsResult {
  hasHints: boolean;
  hints: string[];
}

export interface CoreWebVitalsAnalysisResult {
  lighthouse: LighthouseCheckResult;
  performanceBudgets: PerformanceBudgetsResult;
  bundleOptimization: BundleOptimizationResult;
  browserCaching: BrowserCachingResult;
  imageOptimization: ImageOptimizationResult;
  resourceHints: ResourceHintsResult;
}

export interface AngularBuildConfig {
  architect?: {
    build?: {
      configurations?: {
        production?: {
          budgets?: unknown[];
          optimization?: Record<string, unknown> | boolean;
          [key: string]: unknown;
        };
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
