import { NxWorkspace } from './nx-workspace';

/**
 * Recognises a MODERN Angular bundle setup so the performance/bundle laws stop
 * demanding webpack-era config from a project that no longer uses webpack.
 *
 * Angular's default builder since v17 is the esbuild `application` builder. It
 * tree-shakes, minifies and chunks automatically, so `webpack.config.js`,
 * `vendorChunk`, `splitChunks`, `namedChunks` and `commonChunk` DO NOT EXIST in
 * a correct modern project — requiring them false-fails it. Bundle SIZE is
 * controlled instead by the `budgets` array (maximumWarning / maximumError) in
 * angular.json / project.json. This reads across the whole workspace (root +
 * every apps/<name>/ and libs/<name>/ project.json) via NxWorkspace.
 */
export class AngularBundleConfig {
  /** The esbuild/application builder (or its browser-esbuild predecessor). */
  private static readonly ESBUILD_BUILDER =
    /@angular-devkit\/build-angular:(?:application|browser-esbuild)|@angular\/build:application/;

  /** A budgets array with a real size cap. */
  private static readonly BUDGET =
    /"budgets"\s*:\s*\[[\s\S]*?(?:maximumWarning|maximumError|"type"\s*:\s*"(?:initial|bundle|anyComponentStyle|all|allScript)")/;

  static usesEsbuildBuilder(projectRoot: string): boolean {
    return this.ESBUILD_BUILDER.test(
      NxWorkspace.getBuildConfigContent(projectRoot)
    );
  }

  static hasBudgets(projectRoot: string): boolean {
    return this.BUDGET.test(NxWorkspace.getBuildConfigContent(projectRoot));
  }

  /**
   * A project is on a modern Angular bundle setup when it declares budgets or
   * builds with esbuild — either way, the webpack-era knobs are the wrong thing
   * to require of it.
   */
  static hasModernBundleSetup(projectRoot: string): boolean {
    const content = NxWorkspace.getBuildConfigContent(projectRoot);
    return this.ESBUILD_BUILDER.test(content) || this.BUDGET.test(content);
  }
}
