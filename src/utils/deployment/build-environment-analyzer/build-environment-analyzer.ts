import type { RuleOfCodeConfig } from '../../../config/types';
import type {
  BuildConsistency,
  DockerAnalysis,
  EnvironmentDetection,
} from '../../../types/deployment';
import { BuildEnvironmentAnalyzerValidation } from './build-environment-analyzer-validation';

/**
 * Build Environment Analyzer
 * Specialized utility for analyzing build consistency and environment detection
 */
export class BuildEnvironmentAnalyzer {
  /**
   * Check build consistency across environments
   */
  static checkBuildConsistency(projectRoot: string): BuildConsistency {
    return BuildEnvironmentAnalyzerValidation.validateBuildConsistency(
      projectRoot
    );
  }

  /**
   * Check environment detection mechanisms
   */
  static checkEnvironmentDetection(
    projectRoot: string,
    config: RuleOfCodeConfig,
    lawId?: string
  ): EnvironmentDetection {
    return BuildEnvironmentAnalyzerValidation.validateEnvironmentDetection(
      projectRoot,
      config,
      lawId
    );
  }

  /**
   * Analyze Docker environments for consistency
   */
  static analyzeDockerEnvironments(projectRoot: string): DockerAnalysis {
    return BuildEnvironmentAnalyzerValidation.validateDockerEnvironments(
      projectRoot
    );
  }
}
