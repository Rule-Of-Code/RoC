import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';

/**
 * Detects CI/CD configuration across providers — GitHub Actions, Bitbucket
 * Pipelines, GitLab CI, CircleCI, Azure Pipelines, Jenkins, Travis — so the
 * constitution does NOT assume a single vendor (GitHub). A project on Bitbucket
 * with a `bitbucket-pipelines.yml` is just as compliant as one on GitHub Actions.
 */
export class CiCdDetector {
  /** Single-file CI configs (provider → repo-root file). */
  private static readonly CI_FILES = [
    'bitbucket-pipelines.yml',
    '.gitlab-ci.yml',
    '.circleci/config.yml',
    'azure-pipelines.yml',
    'azure-pipelines.yaml',
    'Jenkinsfile',
    '.travis.yml',
  ];

  /** Directory-based CI config (GitHub Actions). */
  private static readonly CI_DIR = '.github/workflows';

  /** True if the project has ANY recognized CI/CD configuration. */
  static hasAnyCiConfig(projectRoot: string): boolean {
    if (FileUtils.exists(PathOperations.join(projectRoot, this.CI_DIR))) {
      return true;
    }
    return this.CI_FILES.some((rel) =>
      FileUtils.exists(PathOperations.join(projectRoot, rel))
    );
  }

  /**
   * Concatenated content of all present single-file CI configs (Bitbucket,
   * GitLab, CircleCI, …) — for keyword scans like "is security scanning wired
   * into the pipeline?". GitHub workflow files are read by callers that already
   * enumerate `.github/workflows`.
   */
  static readAllCiConfig(projectRoot: string): string {
    const parts: string[] = [];
    for (const rel of this.CI_FILES) {
      const fullPath = PathOperations.join(projectRoot, rel);
      if (FileUtils.exists(fullPath)) {
        try {
          parts.push(FileUtils.readFile(fullPath));
        } catch {
          // unreadable — skip
        }
      }
    }
    return parts.join('\n');
  }
}
