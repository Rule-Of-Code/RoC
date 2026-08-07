import type { DependenciesState } from './ngrx-module-configuration';
import { NgRxModuleConfiguration } from './ngrx-module-configuration';

/**
 * NgRx Module Analyzer
 * RULE 1: Delegation facade - all logic moved to NgRxModuleConfiguration
 * Single Responsibility: Analyze NgRx module configuration in app.module.ts
 */
export class NgRxModuleAnalyzer {
  /**
   * RULE 1: Pure delegation to NgRxModuleConfiguration (100% external coverage)
   */
  static analyze(
    projectRoot: string,
    dependencies: DependenciesState
  ): { violations: string[]; suggestions: string[] } {
    return NgRxModuleConfiguration.analyzeModuleSetup(
      projectRoot,
      dependencies
    );
  }
}
