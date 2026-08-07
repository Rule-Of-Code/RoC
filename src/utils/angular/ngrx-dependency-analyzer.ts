import { ProjectTypeDetector } from '../config/project-type-detector';
import { NGRX_KEYWORDS, NGRX_MESSAGES } from '../constants';

/**
 * NgRx Dependency Analyzer
 * SRP: Responsible only for analyzing NgRx dependencies in package.json
 */
export class NgRxDependencyAnalyzer {
  /**
   * Required NgRx dependencies
   */
  static readonly REQUIRED_NGRX_DEPENDENCIES = {
    core: [NGRX_KEYWORDS.NGRX_STORE],
    optional: [NGRX_KEYWORDS.NGRX_EFFECTS],
    devtools: [NGRX_KEYWORDS.NGRX_STORE_DEVTOOLS],
  } as const;

  /**
   * RULE 1: Direct delegation to utilities (no wrapper logic)
   */
  static getPackageJsonData = ProjectTypeDetector.getPackageJson;
  static getAllProjectDependencies = ProjectTypeDetector.getAllDependencies;

  /**
   * RULE 2: Extract dependency keys to eliminate hardcoded array destructuring
   */
  private static getDependencyKeys() {
    const deps = this.REQUIRED_NGRX_DEPENDENCIES;
    return {
      store: deps.core[0],
      effects: deps.optional[0],
      devtools: deps.devtools[0],
    };
  }

  /**
   * Check if @ngrx/store-devtools is installed in dependencies
   * RULE 2: Optimized with helper method and cached keys
   */
  static checkDevToolsDependencyInstalled(projectRoot: string): boolean {
    const packageJson = ProjectTypeDetector.getPackageJson(projectRoot);
    if (!packageJson) return false;

    const { devtools } = this.getDependencyKeys();
    const deps = ProjectTypeDetector.getAllDependencies(packageJson);
    return Boolean(deps[devtools]);
  }

  /**
   * Analyze NgRx dependencies in package.json
   * RULE 2: Optimized with helper method and eliminated hardcoded patterns
   */
  static analyzeDependencies(packageJson: Record<string, unknown>): {
    dependencies: {
      hasStore: boolean;
      hasEffects: boolean;
      hasDevTools: boolean;
    };
    suggestions: string[];
  } {
    const suggestions: string[] = [];

    // RULE 2: Use helper method instead of hardcoded array destructuring
    // Keys are always defined from REQUIRED_NGRX_DEPENDENCIES constant
    const { store, effects, devtools } = this.getDependencyKeys();

    // RULE 2: Single call to getAllDependencies
    const allDependencies = ProjectTypeDetector.getAllDependencies(packageJson);

    // RULE 2: Optimized boolean checks with consistent pattern
    const hasStore = Boolean(allDependencies[store]);
    const hasEffects = Boolean(allDependencies[effects]);
    const hasDevTools = Boolean(allDependencies[devtools]);

    // RULE 2: Direct constant access with cached dependency keys
    if (!hasStore) suggestions.push(NGRX_MESSAGES.INSTALL_FOR_STATE(store));
    if (!hasEffects)
      suggestions.push(NGRX_MESSAGES.INSTALL_FOR_EFFECTS(effects));
    if (!hasDevTools)
      suggestions.push(NGRX_MESSAGES.INSTALL_FOR_DEBUGGING(devtools));

    return {
      dependencies: { hasStore, hasEffects, hasDevTools },
      suggestions,
    };
  }
}
