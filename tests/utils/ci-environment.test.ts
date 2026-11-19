/**
 * The CI signals the hook laws read (src/utils/ci-environment.ts), each from
 * the platform's own documentation — not from memory:
 *
 * | Variable               | Platform            | Documented as                                   | Source |
 * |------------------------|---------------------|-------------------------------------------------|--------|
 * | CI                     | GitHub Actions      | "Always set to `true`."                          | https://docs.github.com/en/actions/reference/workflows-and-actions/variables#default-environment-variables |
 * | GITHUB_ACTIONS         | GitHub Actions      | "Always set to `true` when GitHub Actions is running the workflow." | (same page) |
 * | CI, GITLAB_CI          | GitLab CI/CD        | "Available for all jobs executed in CI/CD. `true` when available." | https://docs.gitlab.com/ci/variables/predefined_variables/ |
 * | CI                     | Bitbucket Pipelines | "Set to `true` when pipeline runs"               | https://support.atlassian.com/bitbucket-cloud/docs/variables-and-secrets/ |
 * | BITBUCKET_BUILD_NUMBER | Bitbucket Pipelines | "Unique, incrementing build identifier"         | (same page) |
 * | CI, CIRCLECI           | CircleCI            | value `true`                                     | https://circleci.com/docs/reference/variables/ |
 * | CI, TRAVIS             | Travis CI           | `CI=true`, `TRAVIS=true`                         | https://docs.travis-ci.com/user/environment-variables/ |
 * | CI, BUILDKITE          | Buildkite           | "Always `true`"                                  | https://buildkite.com/docs/pipelines/configure/environment-variables |
 * | JENKINS_URL            | Jenkins             | "Full URL of Jenkins … only available if Jenkins URL set in System Configuration" | https://www.jenkins.io/doc/book/pipeline/jenkinsfile/ ("Using environment variables") |
 * | BUILD_TAG              | Jenkins             | "String of jenkins-${JOB_NAME}-${BUILD_NUMBER}" | (same page) |
 * | TF_BUILD               | Azure Pipelines     | "Set to `True` if a build task runs the script." | https://learn.microsoft.com/en-us/azure/devops/pipelines/build/variables |
 * | TEAMCITY_VERSION       | TeamCity            | "can be used to determine if the build runs within TeamCity" | https://www.jetbrains.com/help/teamcity/predefined-build-parameters.html |
 * | CODEBUILD_BUILD_ID     | AWS CodeBuild       | "The CodeBuild ID of the build"                  | https://docs.aws.amazon.com/codebuild/latest/userguide/build-env-ref-env-vars.html |
 *
 * Jenkins, Azure Pipelines, TeamCity and AWS CodeBuild document no `CI`
 * variable on those pages, which is why their own variables are in the list.
 */
import { CI_SIGNALS, ciSignalIn } from '../../src/utils/ci-environment';

describe('CI signals', () => {
  it('no CI variable: not CI', () => {
    expect(ciSignalIn({})).toBeNull();
  });

  it.each([
    ['CI', 'true', 'any'],
    ['GITHUB_ACTIONS', 'true', 'GitHub Actions'],
    ['GITLAB_CI', 'true', 'GitLab CI/CD'],
    ['BITBUCKET_BUILD_NUMBER', '42', 'Bitbucket Pipelines'],
    ['CIRCLECI', 'true', 'CircleCI'],
    ['TRAVIS', 'true', 'Travis CI'],
    ['BUILDKITE', 'true', 'Buildkite'],
    ['JENKINS_URL', 'https://ci.example.com/jenkins/', 'Jenkins'],
    ['BUILD_TAG', 'jenkins-app-153', 'Jenkins'],
    ['TF_BUILD', 'True', 'Azure Pipelines'],
    ['TEAMCITY_VERSION', '2025.07 (build 197242)', 'TeamCity'],
    ['CODEBUILD_BUILD_ID', 'demo-project:b1e6661e', 'AWS CodeBuild'],
  ])('%s=%s alone is a CI checkout (%s)', (variable, value, platform) => {
    expect(ciSignalIn({ [variable]: value })?.platform).toBe(platform);
  });

  it.each([
    ['CI', ''],
    ['CI', 'false'],
    ['CI', '0'],
    ['TF_BUILD', 'False'],
    ['BUILD_TAG', 'release-1.2.3'],
  ])('%s=%s is not a CI checkout', (variable, value) => {
    expect(ciSignalIn({ [variable]: value })).toBeNull();
  });

  it('every signal has a variable and a platform, and no variable is listed twice', () => {
    const names = CI_SIGNALS.map(s => s.variable);
    expect(new Set(names).size).toBe(names.length);
    for (const s of CI_SIGNALS) {
      expect(s.variable).toMatch(/^[A-Z][A-Z0-9_]*$/);
      expect(s.platform).not.toBe('');
    }
  });
});
