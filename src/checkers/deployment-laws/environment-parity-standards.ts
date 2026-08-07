/**
 * Environment Parity Standards Law (Streamlined)
 * Ensures consistent behavior across development, staging, and production environments
 */

import type { LawCheckContext, LawResult } from '../../types/law.types';
import {
  BuildEnvironmentAnalyzer,
  DeploymentEnvironmentAnalyzer,
  SecretsAnalyzer,
} from '../../utils/deployment';

export class EnvironmentParityStandardsLaw {
  static check(context: LawCheckContext): LawResult {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Analyze environment files using specialized utility
    const environmentFiles = DeploymentEnvironmentAnalyzer.getEnvironmentFiles(
      context.projectRoot,
      context.config
    );

    const consistencyAnalysis =
      DeploymentEnvironmentAnalyzer.checkEnvironmentConsistency(
        environmentFiles
      );
    violations.push(...consistencyAnalysis.violations);
    suggestions.push(...consistencyAnalysis.suggestions);

    const envFileAnalysis = DeploymentEnvironmentAnalyzer.analyzeEnvFiles(
      context.projectRoot
    );
    violations.push(...envFileAnalysis.violations);
    suggestions.push(...envFileAnalysis.suggestions);

    // Analyze secrets handling using specialized utility
    const secretsAnalysis = SecretsAnalyzer.analyzeSecretsHandling(
      context.projectRoot,
      context.config
    );
    violations.push(...secretsAnalysis.violations);
    suggestions.push(...secretsAnalysis.suggestions);

    // Check build consistency using specialized utility
    const buildConsistency = BuildEnvironmentAnalyzer.checkBuildConsistency(
      context.projectRoot
    );
    violations.push(...buildConsistency.violations);
    suggestions.push(...buildConsistency.suggestions);

    // Check environment detection using specialized utility
    const envDetection = BuildEnvironmentAnalyzer.checkEnvironmentDetection(
      context.projectRoot,
      context.config
    );
    violations.push(...envDetection.violations);
    suggestions.push(...envDetection.suggestions);

    // Analyze Docker environments using specialized utility
    const dockerAnalysis = BuildEnvironmentAnalyzer.analyzeDockerEnvironments(
      context.projectRoot
    );
    violations.push(...dockerAnalysis.violations);
    suggestions.push(...dockerAnalysis.suggestions);

    return {
      passed: violations.length === 0,
      lawName: 'Environment Parity Standards',
      message:
        violations.length === 0
          ? 'Environment Parity Standards compliance verified'
          : `${violations.length} Environment Parity Standards violations found`,
      violations,
      suggestions,
      score:
        violations.length === 0
          ? 100
          : Math.max(0, 100 - violations.length * 10),
      config: context.config,
    };
  }
}
