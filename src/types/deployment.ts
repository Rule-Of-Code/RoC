/**
 * Deployment Types
 * Type definitions for deployment-related analysis
 */

export interface BuildConsistency {
  hasBuildScripts: boolean;
  hasEnvironmentSpecificBuilds: boolean;
  hasTestScripts: boolean;
  hasBuildConfig: boolean;
  violations: string[];
  suggestions: string[];
}

export interface EnvironmentDetection {
  hasEnvironmentDetection: boolean;
  violations: string[];
  suggestions: string[];
}

export interface DockerAnalysis {
  hasDockerfile: boolean;
  dockerfileHandlesEnv: boolean;
  hasDockerCompose: boolean;
  dockerComposeHandlesEnv: boolean;
  violations: string[];
  suggestions: string[];
}
