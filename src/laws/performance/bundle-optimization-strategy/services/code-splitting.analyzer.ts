import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import {
  BundleOptimizationStrategyCheckConstants,
  BundleOptimizationStrategyFileDiscoveryConstants,
} from '../constants';

/**
 * CodeSplittingAnalyzerService
 *
 * Responsibility:
 * - Analyze code splitting configuration
 * - Verify lazy loading and dynamic imports
 */
export class CodeSplittingAnalyzerService {
  /**
   * Analyze code splitting configuration
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): {
    isConfigured: boolean;
    strategies: string[];
  } {
    const strategies: string[] = [];

    this.checkRoutingFiles(projectRoot, config, strategies);
    this.checkDynamicImports(projectRoot, config, strategies);

    return {
      isConfigured: strategies.length > 0,
      strategies,
    };
  }

  /**
   * Check for lazy loading in routing files
   */
  private static checkRoutingFiles(
    projectRoot: string,
    config: RuleOfCodeConfig,
    strategies: string[]
  ): void {
    // Scan the WHOLE workspace, not <root>/src — an Nx app's routes live at
    // apps/<name>/src. And recognise the standalone forms: `.routes.ts` files
    // (not just *routing*) and `loadComponent` (not just `loadChildren`), the
    // Angular-20 lazy route. The old scan was root-src + loadChildren-in-a-
    // *routing*-file only — blind to a modern app whose every route is lazy.
    const routingFiles = CheckerUtils.findFilesByExtension(
      projectRoot,
      ['.ts'],
      config
    ).filter(
      (file: string) => file.includes('routing') || file.includes('.routes.')
    );

    for (const file of routingFiles) {
      if (!FileUtils.exists(file)) continue;

      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        const lazyRoute =
          content.includes('loadChildren') ||
          content.includes('loadComponent');
        if (
          lazyRoute &&
          content.includes(
            BundleOptimizationStrategyCheckConstants.DYNAMIC_IMPORT_PATTERN
          )
        ) {
          strategies.push(
            BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
              .ROUTE_BASED_SPLITTING
          );
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  /**
   * Check for manual dynamic imports in TypeScript files
   */
  private static checkDynamicImports(
    projectRoot: string,
    config: RuleOfCodeConfig,
    strategies: string[]
  ): void {
    const tsFiles = CheckerUtils.findTypeScriptFiles(projectRoot, config);

    for (const file of tsFiles) {
      try {
        const content = FileUtils.readFile(file, { encoding: 'utf8' });
        if (
          content.includes(
            BundleOptimizationStrategyCheckConstants.DYNAMIC_IMPORT_PATTERN
          ) &&
          content.includes(
            BundleOptimizationStrategyCheckConstants.THEN_PATTERN
          )
        ) {
          strategies.push(
            BundleOptimizationStrategyCheckConstants.STRATEGY_MESSAGES
              .MANUAL_DYNAMIC_IMPORTS
          );
          break;
        }
      } catch {
        // Ignore read errors
      }
    }
  }
}
