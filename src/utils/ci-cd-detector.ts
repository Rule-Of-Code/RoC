import { ciConfigContent, hasCiConfig } from './project-discovery';

/**
 * Detects CI/CD configuration across providers — GitHub Actions, Bitbucket
 * Pipelines, GitLab CI, CircleCI, Azure Pipelines, Jenkins, Travis, Cloud Build
 * — so the constitution does NOT assume a single vendor (GitHub). A project on
 * Bitbucket with a `bitbucket-pipelines.yml` is just as compliant as one on
 * GitHub Actions.
 *
 * The provider list used to live here AND in project-discovery AND inline in six
 * laws — eight copies of the same idea, each missing something different, which
 * is precisely the drift a shared module is supposed to prevent. (project-discovery
 * was written as "the" shared module without noticing this one already existed.)
 * There is now one list, in project-discovery; this class stays as its published
 * name and delegates.
 */
export class CiCdDetector {
  /** True if the project has ANY recognized CI/CD configuration. */
  static hasAnyCiConfig(
    projectRoot: string,
    config?: { pathMappings?: { cicdConfig?: string | string[] } }
  ): boolean {
    return hasCiConfig(projectRoot, config);
  }

  /**
   * Concatenated content of every present CI config — for keyword scans like
   * "is security scanning wired into the pipeline?".
   */
  static readAllCiConfig(
    projectRoot: string,
    config?: { pathMappings?: { cicdConfig?: string | string[] } }
  ): string {
    return ciConfigContent(projectRoot, config);
  }
}