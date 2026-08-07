/**
 * Deployment Law Base Class
 * Base functionality for all deployment-related laws
 */

import { FileUtils } from '../../utils';
import { ProjectTypeDetector } from '../../utils/config/project-type-detector';
import { PathOperations } from '../../utils/path-operations';
import { LawBase } from '../law-base';

// Interface for Docker analysis results
interface DockerAnalysis {
  hasDockerfile: boolean;
  hasMultiStage?: boolean;
  hasOptimization?: boolean;
  hasSecurityBestPractices?: boolean;
  hasHealthCheck?: boolean;
  usesDistroless?: boolean;
  hasProperCaching?: boolean;
  violations?: string[];
  suggestions?: string[];
}

export class DeploymentLawBase extends LawBase {
  // Inherits createResult() from LawBase
  // Add deployment-specific methods below if needed

  /**
   * Checks if a file is a deployment configuration file
   */
  static isDeploymentFile(filePath: string): boolean {
    return ProjectTypeDetector.isDeploymentFile(filePath);
  }

  /**
   * Checks if deployment has proper environment separation
   */
  static hasEnvironmentSeparation(projectRoot: string): boolean {
    const environmentFiles = [
      'src/environments/environment.prod.ts',
      'src/environments/environment.staging.ts',
      'src/environments/environment.dev.ts',
      'src/environments/environment.ts',
    ];

    let envCount = 0;
    for (const envFile of environmentFiles) {
      if (FileUtils.exists(PathOperations.join(projectRoot, envFile))) {
        envCount++;
      }
    }

    return envCount >= 2; // At least dev and prod
  }

  /**
   * Checks for CI/CD configuration files
   */
  static hasCICDConfiguration(projectRoot: string): boolean {
    const cicdFiles = [
      '.github/workflows',
      '.gitlab-ci.yml',
      'azure-pipelines.yml',
      'bitbucket-pipelines.yml',
      'jenkins.yml',
      'Jenkinsfile',
    ];

    return cicdFiles.some(file =>
      FileUtils.exists(PathOperations.join(projectRoot, file))
    );
  }

  /**
   * Gets deployment configuration files
   */
  static getDeploymentFiles(projectRoot: string): string[] {
    return ProjectTypeDetector.getDeploymentConfigFiles(projectRoot);
  }

  /**
   * Checks for Docker optimization
   */
  static analyzeDockerfile(dockerfilePath: string): DockerAnalysis {
    if (!FileUtils.exists(dockerfilePath)) {
      return { hasDockerfile: false };
    }

    try {
      const content = FileUtils.readFile(dockerfilePath);

      return {
        hasDockerfile: true,
        hasMultiStage:
          content.includes('FROM') && content.split('FROM').length > 2,
        hasOptimization:
          content.includes('.dockerignore') || content.includes('--no-cache'),
        hasSecurityBestPractices:
          content.includes('USER ') && !content.includes('USER root'),
        hasHealthCheck: content.includes('HEALTHCHECK'),
        usesDistroless:
          content.includes('distroless') || content.includes('alpine'),
        hasProperCaching:
          content.includes('COPY package') && content.includes('RUN npm'),
      };
    } catch (_error) {
      return { hasDockerfile: false };
    }
  }
}
