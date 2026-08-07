import { CONFIG_FILES } from '../../constants';
import { FileSystemOperations } from '../../file-system-operations';
import { FileUtils } from '../../file-utils';
import { PathOperations } from '../../path-operations';
import { ProjectTypeDetectorConfiguration } from './project-type-detector-configuration';

/**
 * ProjectTypeDetectorValidation
 * Comprehensive project type detection and validation workflow
 */
export class ProjectTypeDetectorValidation {
  /**
   * Execute complete project type detection workflow
   */
  static executeProjectTypeDetectionWorkflow(
    projectRoot: string
  ): string | null {
    const detectionOrder =
      ProjectTypeDetectorConfiguration.getProjectTypeDetectionOrder(undefined);

    for (const type of detectionOrder.types) {
      if (this.isProjectOfType(projectRoot, type)) {
        return type;
      }
    }

    return null;
  }

  /**
   * Check if project matches specific type
   */
  private static isProjectOfType(projectRoot: string, type: string): boolean {
    switch (type) {
      case 'angular':
        return this.isAngularProject(projectRoot);
      case 'react':
        return this.isReactProject(projectRoot);
      case 'vue':
        return this.isVueProject(projectRoot);
      case 'node':
        return this.isNodeProject(projectRoot);
      case 'typescript':
        return this.isTypeScriptProject(projectRoot);
      case 'python':
        return this.isPythonProject(projectRoot);
      default:
        return false;
    }
  }

  /**
   * Check if project is Python — by canonical project markers (pyproject.toml,
   * setup.py/cfg, requirements.txt, Pipfile, uv.lock, poetry.lock, tox.ini).
   */
  static isPythonProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getPythonProjectPatterns(undefined);
    return this.hasAnyFile(projectRoot, patterns.files);
  }

  /**
   * Check if project is Angular with comprehensive validation
   */
  static isAngularProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getAngularProjectPatterns(undefined);

    if (this.hasAnyFile(projectRoot, patterns.files)) {
      return true;
    }

    return this.hasPackageDependency(projectRoot, patterns.dependencies);
  }

  /**
   * Check if project is React with comprehensive validation
   */
  private static isReactProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getReactProjectPatterns(undefined);
    return this.isProjectOfTypeByPatterns(projectRoot, patterns);
  }

  /**
   * Check if project is Vue with comprehensive validation
   */
  private static isVueProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getVueProjectPatterns(undefined);
    return this.isProjectOfTypeByPatterns(projectRoot, patterns);
  }

  /**
   * Check if project is Node.js with comprehensive validation
   */
  private static isNodeProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getNodeProjectPatterns(undefined);
    return this.isProjectOfTypeByPatterns(projectRoot, patterns);
  }

  /**
   * Check if project is TypeScript with comprehensive validation
   */
  private static isTypeScriptProject(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getTypeScriptProjectPatterns(undefined);
    return this.isProjectOfTypeByPatterns(projectRoot, patterns);
  }

  /**
   * Check if any file exists in project
   */
  private static hasAnyFile(
    projectRoot: string,
    files: readonly string[]
  ): boolean {
    return files.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );
  }

  /**
   * Generic helper: Check if project matches type by patterns
   * Eliminates duplicated logic in isReactProject, isVueProject, isNodeProject, isTypeScriptProject
   */
  private static isProjectOfTypeByPatterns(
    projectRoot: string,
    patterns: { files: readonly string[]; dependencies: readonly string[] }
  ): boolean {
    if (this.hasAnyFile(projectRoot, patterns.files)) {
      return true;
    }
    return this.hasPackageDependency(projectRoot, patterns.dependencies);
  }

  /**
   * Generic helper: Find existing config files from patterns
   * Eliminates duplicated logic in getBuildConfigFiles, getDeploymentConfigFiles
   */
  private static findExistingConfigFiles(
    projectRoot: string,
    files: readonly string[]
  ): string[] {
    return files
      .map(file => PathOperations.join(projectRoot, file))
      .filter(filePath => FileUtils.exists(filePath));
  }

  /**
   * Execute package dependency checking workflow
   */
  static hasPackageDependency(
    projectRoot: string,
    dependencies: readonly string[]
  ): boolean {
    const allDeps = this.getProjectDependencies(projectRoot);
    return dependencies.some(dep => allDeps[dep]);
  }

  /**
   * Execute Angular version detection workflow
   */
  static getAngularVersion(projectRoot: string): string | null {
    try {
      const dependencies = this.getProjectDependencies(projectRoot);
      return dependencies['@angular/core'] ?? null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Execute testing framework detection workflow
   */
  static hasTestingFramework(projectRoot: string): boolean {
    try {
      const patterns =
        ProjectTypeDetectorConfiguration.getTestingFrameworkPatterns(undefined);
      const dependencies = this.getProjectDependencies(projectRoot);

      return patterns.dependencies.some(dep => dep in dependencies);
    } catch (_error) {
      return false;
    }
  }

  /**
   * Execute Nx workspace detection workflow
   */
  static isNxWorkspace(projectRoot: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getNxWorkspacePatterns(undefined);
    return this.hasAnyFile(projectRoot, patterns.files);
  }

  /**
   * Execute Angular config without Nx detection workflow
   */
  static hasAngularConfigWithoutNx(projectRoot: string): boolean {
    const angularConfig = PathOperations.join(
      projectRoot,
      CONFIG_FILES.ANGULAR_JSON
    );
    const workspaceConfig = PathOperations.join(projectRoot, 'workspace.json');
    return (
      FileUtils.exists(angularConfig) && !FileUtils.exists(workspaceConfig)
    );
  }

  /**
   * Execute package scripts retrieval workflow
   */
  static getPackageScripts(projectRoot: string): Record<string, string> | null {
    const info = this.getPackageInfo(projectRoot);
    if (!info.exists || !info.content) return null;

    const pkg = info.content as Record<string, unknown>;
    return pkg.scripts as Record<string, string>;
  }

  /**
   * Execute build config files detection workflow
   */
  static getBuildConfigFiles(projectRoot: string): string[] {
    const patterns =
      ProjectTypeDetectorConfiguration.getBuildConfigPatterns(undefined);
    return this.findExistingConfigFiles(projectRoot, patterns.files);
  }

  /**
   * Execute bundle optimization config detection workflow
   */
  static hasBundleOptimizationConfig(projectRoot: string): boolean {
    return this.getBuildConfigFiles(projectRoot).length > 0;
  }

  /**
   * Execute package dependencies retrieval workflow
   */
  static getPackageDependencies(
    projectRoot: string
  ): Record<string, string> | null {
    const dependencies = this.getProjectDependencies(projectRoot);
    return Object.keys(dependencies).length > 0 ? dependencies : null;
  }

  /**
   * Execute heavy libraries detection workflow
   */
  static getHeavyLibraries(projectRoot: string): string[] {
    const dependencies = this.getPackageDependencies(projectRoot);
    if (!dependencies) return [];

    const patterns =
      ProjectTypeDetectorConfiguration.getHeavyLibraryPatterns(undefined);
    return patterns.libraries.filter(lib => dependencies[lib]);
  }

  /**
   * Execute TypeScript strict config detection workflow
   */
  static hasStrictTypeScriptConfig(projectRoot: string): boolean {
    const tsConfig = this.getTypeScriptConfig(projectRoot);
    if (!tsConfig) return false;

    const config = tsConfig as { compilerOptions?: { strict?: boolean } };
    return config.compilerOptions?.strict === true;
  }

  /**
   * Execute TypeScript config retrieval workflow
   */
  static getTypeScriptConfig(projectRoot: string): unknown {
    try {
      const tsConfigPath = PathOperations.join(
        projectRoot,
        CONFIG_FILES.TSCONFIG_JSON
      );
      if (!FileUtils.exists(tsConfigPath)) return null;

      // tsconfig.json is JSONC — comments and trailing commas are valid.
      return FileSystemOperations.readJsoncFile(tsConfigPath);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Execute TypeScript config existence check workflow
   */
  static hasTypeScriptConfig(projectRoot: string): boolean {
    const tsConfigPath = PathOperations.join(
      projectRoot,
      CONFIG_FILES.TSCONFIG_JSON
    );
    return FileUtils.exists(tsConfigPath);
  }

  /**
   * Read package.json and get all merged dependencies
   * Utility method for analyzing project dependencies
   */
  static getProjectDependencies(projectRoot: string): Record<string, string> {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      CONFIG_FILES.PACKAGE_JSON
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return {};
    }

    try {
      const packageJson = FileSystemOperations.readJsonFile(packageJsonPath);
      return this.mergeDependencies(packageJson);
    } catch {
      return {};
    }
  }

  /**
   * Execute deployment config files detection workflow
   */
  static getDeploymentConfigFiles(projectRoot: string): string[] {
    const patterns =
      ProjectTypeDetectorConfiguration.getDeploymentConfigPatterns(undefined);
    return this.findExistingConfigFiles(projectRoot, patterns.files);
  }

  /**
   * Execute deployment file detection workflow
   */
  static isDeploymentFile(filePath: string): boolean {
    const patterns =
      ProjectTypeDetectorConfiguration.getDeploymentConfigPatterns(undefined);

    return patterns.patterns.some(pattern => filePath.includes(pattern));
  }

  /**
   * Execute mock package.json creation workflow (testing utility)
   */
  static createMockPackageJson(
    packageContent: Record<string, unknown>
  ): string {
    return JSON.stringify(packageContent, null, 2);
  }

  /**
   * Execute mock tsconfig.json creation workflow (testing utility)
   */
  static createMockTsConfig(configContent: Record<string, unknown>): string {
    return JSON.stringify(configContent, null, 2);
  }

  /**
   * Execute package.json information retrieval workflow
   */
  static getPackageInfo(projectRoot: string): {
    exists: boolean;
    content?: unknown;
  } {
    const packageJsonPath = PathOperations.join(
      projectRoot,
      CONFIG_FILES.PACKAGE_JSON
    );

    if (!FileUtils.exists(packageJsonPath)) {
      return { exists: false };
    }

    try {
      const packageJson = FileSystemOperations.readJsonFile(packageJsonPath);
      return { exists: true, content: packageJson };
    } catch (_error) {
      return { exists: false };
    }
  }

  /**
   * Get package.json content
   * Wrapper around getPackageInfo for backwards compatibility
   */
  static getPackageJson(projectRoot: string): unknown {
    const info = this.getPackageInfo(projectRoot);
    return info.content;
  }

  /**
   * Merge dependencies and devDependencies from package object
   */
  private static mergeDependencies(
    packageJson: unknown
  ): Record<string, string> {
    if (!packageJson || typeof packageJson !== 'object') return {};

    const pkg = packageJson as Record<string, unknown>;
    const deps = (pkg.dependencies ?? {}) as Record<string, string>;
    const devDeps = (pkg.devDependencies ?? {}) as Record<string, string>;

    return { ...deps, ...devDeps };
  }

  /**
   * Get all dependencies (dependencies + devDependencies merged) from package.json object
   * Wrapper for backwards compatibility
   */
  static getAllDependencies(packageJson: unknown): Record<string, string> {
    return this.mergeDependencies(packageJson);
  }
}
