import type { RuleOfCodeConfig } from '../../../../types/law.types';
import { CheckerUtils, FileUtils, PathOperations } from '../../../../utils';
import { PerformanceBudgetComplianceFileDiscoveryConstants } from '../constants';

/**
 * CICDPerformanceGatesAnalyzerService
 *
 * Responsibility:
 * - Analyze CI/CD pipeline configuration
 * - Verify performance budget gates in GitHub Actions, GitLab CI, Bitbucket Pipelines
 */
export class CICDPerformanceGatesAnalyzerService {
  /**
   * Analyze CI/CD performance gates
   */
  static analyze(
    projectRoot: string,
    config: RuleOfCodeConfig
  ): { configured: boolean; pipelines: string[] } {
    const pipelines: string[] = [];

    // Check each CI/CD platform
    this.checkGitHubActions(projectRoot, config, pipelines);
    this.checkGitLabCI(projectRoot, pipelines);
    this.checkBitbucketPipelines(projectRoot, pipelines);

    return { configured: pipelines.length > 0, pipelines };
  }

  /**
   * Check GitHub Actions workflows
   */
  private static checkGitHubActions(
    projectRoot: string,
    config: RuleOfCodeConfig,
    pipelines: string[]
  ): void {
    const githubWorkflowsPath = PathOperations.join(
      projectRoot,
      PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
        .CI_CD.GITHUB
    );
    if (!FileUtils.exists(githubWorkflowsPath)) {
      return;
    }

    try {
      const yamlFiles = CheckerUtils.findFilesByExtension(
        githubWorkflowsPath,
        ['.yml', '.yaml'],
        config
      );

      for (const workflowPath of yamlFiles) {
        const workflow = PathOperations.getBasename(workflowPath);
        const content = FileUtils.readFile(workflowPath, { encoding: 'utf8' });

        if (
          PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
            content
          )
        ) {
          pipelines.push(`GitHub Actions: ${workflow}`);
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  /**
   * Check GitLab CI configuration
   */
  private static checkGitLabCI(projectRoot: string, pipelines: string[]): void {
    const gitlabCIPath = PathOperations.join(
      projectRoot,
      PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
        .CI_CD.GITLAB
    );
    if (!FileUtils.exists(gitlabCIPath)) {
      return;
    }

    try {
      const content = FileUtils.readFile(gitlabCIPath, { encoding: 'utf8' });
      if (
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          content
        )
      ) {
        pipelines.push('GitLab CI');
      }
    } catch {
      // Ignore file read errors
    }
  }

  /**
   * Check Bitbucket Pipelines configuration
   */
  private static checkBitbucketPipelines(
    projectRoot: string,
    pipelines: string[]
  ): void {
    const bitbucketPipelinesPath = PathOperations.join(
      projectRoot,
      PerformanceBudgetComplianceFileDiscoveryConstants.CONFIG_FILE_PATTERNS
        .CI_CD.BITBUCKET
    );
    if (!FileUtils.exists(bitbucketPipelinesPath)) {
      return;
    }

    try {
      const content = FileUtils.readFile(bitbucketPipelinesPath, {
        encoding: 'utf8',
      });
      if (
        PerformanceBudgetComplianceFileDiscoveryConstants.hasPerformanceKeywords(
          content
        )
      ) {
        pipelines.push('Bitbucket Pipelines');
      }
    } catch {
      // Ignore file read errors
    }
  }
}
