import { ProjectTypeDetectorValidation } from './project-type-detector-validation';

/**
 * Project Type Detector
 * Specialized utility for detecting project type and framework
 */
export class ProjectTypeDetector {
  static detectProjectType(projectRoot: string): string | null {
    return ProjectTypeDetectorValidation.executeProjectTypeDetectionWorkflow(
      projectRoot
    );
  }

  static isAngularProject(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.isAngularProject(projectRoot);
  }

  static isPythonProject(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.isPythonProject(projectRoot);
  }

  static hasPackageDependency(
    projectRoot: string,
    dependencies: string[]
  ): boolean {
    return ProjectTypeDetectorValidation.hasPackageDependency(
      projectRoot,
      dependencies
    );
  }

  static getAngularVersion(projectRoot: string): string | null {
    return ProjectTypeDetectorValidation.getAngularVersion(projectRoot);
  }

  static hasTestingFramework(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.hasTestingFramework(projectRoot);
  }

  static isNxWorkspace(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.isNxWorkspace(projectRoot);
  }

  static hasAngularConfigWithoutNx(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.hasAngularConfigWithoutNx(projectRoot);
  }

  static getPackageScripts(projectRoot: string): Record<string, string> | null {
    return ProjectTypeDetectorValidation.getPackageScripts(projectRoot);
  }

  static getBuildConfigFiles(projectRoot: string): string[] {
    return ProjectTypeDetectorValidation.getBuildConfigFiles(projectRoot);
  }

  static hasBundleOptimizationConfig(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.hasBundleOptimizationConfig(
      projectRoot
    );
  }

  static getPackageDependencies(
    projectRoot: string
  ): Record<string, string> | null {
    return ProjectTypeDetectorValidation.getPackageDependencies(projectRoot);
  }

  static getHeavyLibraries(projectRoot: string): string[] {
    return ProjectTypeDetectorValidation.getHeavyLibraries(projectRoot);
  }

  static hasStrictTypeScriptConfig(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.hasStrictTypeScriptConfig(projectRoot);
  }

  static getTypeScriptConfig(projectRoot: string): unknown {
    return ProjectTypeDetectorValidation.getTypeScriptConfig(projectRoot);
  }

  static hasTypeScriptConfig(projectRoot: string): boolean {
    return ProjectTypeDetectorValidation.hasTypeScriptConfig(projectRoot);
  }

  static getPackageJson(projectRoot: string): unknown {
    return ProjectTypeDetectorValidation.getPackageJson(projectRoot);
  }

  static getAllDependencies(packageJson: unknown): Record<string, string> {
    return ProjectTypeDetectorValidation.getAllDependencies(packageJson);
  }

  static getDeploymentConfigFiles(projectRoot: string): string[] {
    return ProjectTypeDetectorValidation.getDeploymentConfigFiles(projectRoot);
  }

  static isDeploymentFile(filePath: string): boolean {
    return ProjectTypeDetectorValidation.isDeploymentFile(filePath);
  }

  static createMockPackageJson(
    packageContent: Record<string, unknown>
  ): string {
    return ProjectTypeDetectorValidation.createMockPackageJson(packageContent);
  }

  static createMockTsConfig(configContent: Record<string, unknown>): string {
    return ProjectTypeDetectorValidation.createMockTsConfig(configContent);
  }

  static getPackageInfo(projectRoot: string): {
    exists: boolean;
    content?: unknown;
  } {
    return ProjectTypeDetectorValidation.getPackageInfo(projectRoot);
  }
}
