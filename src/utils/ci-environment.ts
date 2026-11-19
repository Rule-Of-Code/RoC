/**
 * Whether this process runs in a CI checkout, read from the environment the CI
 * system sets.
 *
 * Most CI systems set `CI`; some set only a variable of their own. Each entry
 * below is a variable a platform documents as set in every build, so a CI that
 * does not set `CI` is still recognised. The documentation each entry comes
 * from is linked in tests/utils/ci-environment.test.ts.
 *
 * A signal counts when the variable is set to something other than '', 'false'
 * or '0' (case-insensitive). A variable whose name other tools might also use
 * counts only with the platform's documented value prefix.
 */

export interface CiSignal {
  /** The environment variable. */
  readonly variable: string;
  /** The CI system that sets it ('any' for the cross-platform `CI`). */
  readonly platform: string;
  /** The value must start with this (for a name that is not the platform's own). */
  readonly prefix?: string;
}

export const CI_SIGNALS: readonly CiSignal[] = [
  { variable: 'CI', platform: 'any' },
  { variable: 'GITHUB_ACTIONS', platform: 'GitHub Actions' },
  { variable: 'GITLAB_CI', platform: 'GitLab CI/CD' },
  { variable: 'BITBUCKET_BUILD_NUMBER', platform: 'Bitbucket Pipelines' },
  { variable: 'CIRCLECI', platform: 'CircleCI' },
  { variable: 'TRAVIS', platform: 'Travis CI' },
  { variable: 'BUILDKITE', platform: 'Buildkite' },
  // Set only when the Jenkins URL is configured; BUILD_TAG is always set.
  { variable: 'JENKINS_URL', platform: 'Jenkins' },
  { variable: 'BUILD_TAG', platform: 'Jenkins', prefix: 'jenkins-' },
  { variable: 'TF_BUILD', platform: 'Azure Pipelines' },
  { variable: 'TEAMCITY_VERSION', platform: 'TeamCity' },
  { variable: 'CODEBUILD_BUILD_ID', platform: 'AWS CodeBuild' },
];

function isSet(value: string | undefined): boolean {
  const v = (value ?? '').trim().toLowerCase();
  return v !== '' && v !== 'false' && v !== '0';
}

/** The first CI signal present in `env`, or null. */
export function ciSignalIn(
  env: NodeJS.ProcessEnv = process.env
): CiSignal | null {
  for (const signal of CI_SIGNALS) {
    const value = env[signal.variable];
    if (!isSet(value)) continue;
    if (signal.prefix && !(value ?? '').trim().startsWith(signal.prefix))
      continue;
    return signal;
  }
  return null;
}
