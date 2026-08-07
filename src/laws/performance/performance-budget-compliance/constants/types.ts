/**
 * PerformanceBudgetTypes
 *
 * Type definitions for performance budget analysis.
 */
export interface PerformanceBudget {
  type: string;
  maximumWarning?: string;
  maximumError?: string;
  [key: string]: boolean | number | string | undefined;
}

export interface BuildConfiguration {
  budgets?: PerformanceBudget[];
  optimization?: boolean | object;
  outputHashing?: string;
  [key: string]: PerformanceBudget[] | boolean | object | string | undefined;
}

export interface AngularProject {
  architect?: {
    build?: {
      configurations?: Record<string, BuildConfiguration>;
    };
  };
}

export class PerformanceBudgetTypesConstants {
  /**
   * Check if Angular project has budget configuration
   */
  static hasBudgetConfiguration(
    buildConfig: BuildConfiguration,
    projectName: string,
    configName: string,
    projects: string[]
  ): boolean {
    if (
      buildConfig.budgets &&
      Array.isArray(buildConfig.budgets) &&
      buildConfig.budgets.length > 0
    ) {
      const budgetTypes = buildConfig.budgets.map(
        (b: PerformanceBudget) => b.type
      );
      // Any real budget type means budgets ARE configured. The `initial` budget
      // is the primary bundle-size cap (maximumWarning/maximumError), so a lone
      // `[{ type: 'initial', … }]` — the common modern setup — is enough. The old
      // `initial && (anyComponentStyle | bundle)` demanded two types and
      // false-failed a correct single-budget project.
      const hasRealBudget = budgetTypes.some(t =>
        ['initial', 'anyComponentStyle', 'bundle', 'allScript', 'all'].includes(
          t
        )
      );

      if (hasRealBudget) {
        projects.push(`${projectName}:${configName}`);
        return true;
      }
    }
    return false;
  }
}
