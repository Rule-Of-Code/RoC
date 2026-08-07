/**
 * NgRx DevTools integration analysis result types
 */

export interface DependencyCheckResult {
  installed: boolean;
  version?: string;
}

export interface DevToolsConfigResult {
  configured: boolean;
  hasEnvironmentCheck: boolean;
  hasConfigOptions: boolean;
}

export interface DevToolsAnalysisResult {
  dependency: DependencyCheckResult;
  config: DevToolsConfigResult;
}
