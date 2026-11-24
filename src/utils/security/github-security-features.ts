/**
 * GitHub security features a project sets up: Dependabot, and a workflow
 * that scans for vulnerabilities. Moved out of SecurityPolicyChecker
 * unchanged (#559); each returns the points it takes off the score.
 */

import { ConfigFileUtils } from '../config-file-utils';
import { DirectoryScanner } from '../directory-scanner';
import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';

/** `.github` with Dependabot and a security workflow; suggestions for what is missing. */
export function checkGitHubSecurityFeatures(
  projectRoot: string,
  suggestions: string[]
): number {
  const githubDir = PathOperations.join(projectRoot, '.github');
  if (!FileUtils.exists(githubDir)) {
    suggestions.push('Consider setting up GitHub security features');
    suggestions.push('Enable Dependabot and security advisories');
    return -10;
  }

  let score = 0;
  score += checkDependabotConfig(githubDir, suggestions);
  score += checkSecurityWorkflows(githubDir, suggestions);
  return score;
}

function checkDependabotConfig(
  githubDir: string,
  suggestions: string[]
): number {
  const dependabotConfig = PathOperations.join(githubDir, 'dependabot.yml');
  const dependabotConfigV1 = PathOperations.join(githubDir, 'dependabot.yaml');

  const hasDependabot =
    FileUtils.exists(dependabotConfig) || FileUtils.exists(dependabotConfigV1);

  if (!hasDependabot) {
    suggestions.push('Enable GitHub Dependabot for automated security updates');
    suggestions.push('Create .github/dependabot.yml configuration');
    return -10;
  }
  return 0;
}

function checkSecurityWorkflows(
  githubDir: string,
  suggestions: string[]
): number {
  const workflowsDir = PathOperations.join(githubDir, 'workflows');
  if (!FileUtils.exists(workflowsDir)) {
    return 0;
  }

  try {
    const workflows = DirectoryScanner.scanDirectory(
      workflowsDir,
      ConfigFileUtils.getMinimalDefaultConfig(),
      { filesOnly: true }
    );
    let hasSecurityWorkflow = false;

    for (const workflow of workflows.files) {
      if (isSecurityWorkflow(workflow, workflowsDir)) {
        hasSecurityWorkflow = true;
        break;
      }
    }

    if (!hasSecurityWorkflow) {
      suggestions.push('Add GitHub Actions workflow for security scanning');
      suggestions.push('Include npm audit in CI/CD pipeline');
      return -5;
    }
  } catch (_error) {
    // Skip if can't read workflows directory
  }
  return 0;
}

function isSecurityWorkflow(workflow: string, workflowsDir: string): boolean {
  if (workflow.includes('security') || workflow.includes('audit')) {
    return true;
  }

  // Check workflow content for security-related actions
  if (workflow.endsWith('.yml') || workflow.endsWith('.yaml')) {
    try {
      const workflowPath = PathOperations.join(workflowsDir, workflow);
      const workflowContent = FileUtils.readFile(workflowPath);
      return (
        workflowContent.includes('npm audit') ||
        workflowContent.includes('security') ||
        workflowContent.includes('snyk')
      );
    } catch (_error) {
      // Skip unreadable workflow files
    }
  }
  return false;
}
