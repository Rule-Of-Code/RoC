/**
 * Where a project's CI and build configuration actually lives.
 *
 * One defect wearing several faces: an analyzer looking for an artefact by
 * hard-coded path, in a project that legitimately keeps it somewhere else.
 * Budgets looked for in `angular.json` by a workspace that uses
 * `apps/<name>/project.json`. CI looked for in `.github/workflows/` by a
 * repository hosted anywhere else. Build config looked for as
 * `webpack.config.js` by a Python service.
 *
 * Every such list was written once and then drifted from every other list —
 * one law knowing about a provider that nine others did not. This module is the
 * single list: adding a provider here reaches every law at once.
 */

import { glob } from 'glob';
import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { NxWorkspace } from './nx-workspace';
import { PathOperations } from './path-operations';

/** CI configuration, by provider. Order is discovery order, not preference. */
const CI_CONFIG_FILES: readonly string[] = [
  '.github/workflows',
  '.gitlab-ci.yml',
  'bitbucket-pipelines.yml',
  'azure-pipelines.yml',
  '.circleci/config.yml',
  'Jenkinsfile',
  '.travis.yml',
  'buildkite.yml',
  '.drone.yml',
  'cloudbuild.yaml',
];

/** Build/tooling configuration that means "this project has a build", per stack. */
const BUILD_CONFIG_FILES_JS: readonly string[] = [
  'webpack.config.js',
  'webpack.config.ts',
  'vite.config.ts',
  'vite.config.js',
  'rollup.config.js',
  'esbuild.config.js',
  'tsconfig.json',
  'angular.json',
  'project.json',
  '.babelrc',
  'babel.config.js',
];

const BUILD_CONFIG_FILES_PYTHON: readonly string[] = [
  'pyproject.toml',
  'setup.py',
  'setup.cfg',
  'tox.ini',
  'noxfile.py',
  'Makefile',
  'Dockerfile',
  'Procfile',
  'requirements.txt',
];

/** Container/runtime build files that count on any stack. */
const BUILD_CONFIG_FILES_UNIVERSAL: readonly string[] = [
  'Dockerfile',
  'docker-compose.yml',
  'Makefile',
];

/**
 * Every CI configuration this project actually has.
 *
 * `pathMappings.cicdConfig` is consulted first. A provider allowlist is always
 * incomplete by construction, and one provider defeats it outright: Google Cloud
 * Build takes its config from whatever path the trigger's `--build-config=`
 * names, so there is no filename to add. A project that declares where its CI
 * lives should not have to keep a decoy `bitbucket-pipelines.yml` around to look
 * compliant — that is the tick-box lie these laws exist to prevent.
 */
export function ciConfigPaths(
  projectRoot: string,
  config?: { pathMappings?: { cicdConfig?: string | string[] } }
): string[] {
  const declared = config?.pathMappings?.cicdConfig;
  const declaredPatterns =
    declared === undefined
      ? []
      : Array.isArray(declared)
        ? declared
        : [declared];

  const declaredPaths = declaredPatterns.flatMap(pattern =>
    pattern.includes('*')
      ? glob.sync(pattern, {
          cwd: projectRoot,
          absolute: true,
          ignore: ['**/node_modules/**'],
        })
      : [PathOperations.join(projectRoot, pattern)]
  );

  const knownPaths = CI_CONFIG_FILES.map(f =>
    PathOperations.join(projectRoot, f)
  );

  return [...new Set([...declaredPaths, ...knownPaths])].filter(p =>
    FileUtils.exists(p)
  );
}

/** True when the project is wired to any CI provider we recognise. */
export function hasCiConfig(
  projectRoot: string,
  config?: { pathMappings?: { cicdConfig?: string | string[] } }
): boolean {
  return ciConfigPaths(projectRoot, config).length > 0;
}

/**
 * Combined text of every CI configuration present, for keyword checks
 * ("is there a lighthouse step?", "is there a security scan?"). A workflows
 * DIRECTORY contributes each file inside it.
 */
export function ciConfigContent(
  projectRoot: string,
  config?: { pathMappings?: { cicdConfig?: string | string[] } }
): string {
  const parts: string[] = [];
  for (const p of ciConfigPaths(projectRoot, config)) {
    if (FileUtils.isDirectory(p)) {
      for (const entry of FileSystemOperations.readDirectory(p)) {
        if (!entry.isFile()) continue;
        parts.push(FileUtils.readFile(PathOperations.join(p, entry.name)));
      }
      continue;
    }
    parts.push(FileUtils.readFile(p));
  }
  return parts.filter(Boolean).join('\n');
}

/**
 * Build-configuration filenames worth looking for on this stack.
 *
 * A Python repository cannot have `webpack.config.js`, so demanding one made the
 * sub-check unsatisfiable there — the law could never reach 100 no matter what
 * the project did, and the only ways out were a fake `tsconfig.json` or waiving a
 * law that genuinely applied.
 */
export function buildConfigFileNames(projectType?: string): readonly string[] {
  const stack = (projectType ?? '').toLowerCase();
  if (stack === 'python') {
    return [...BUILD_CONFIG_FILES_PYTHON, ...BUILD_CONFIG_FILES_UNIVERSAL];
  }
  if (stack) {
    return [...BUILD_CONFIG_FILES_JS, ...BUILD_CONFIG_FILES_UNIVERSAL];
  }
  // No stack declared: the question is only "does this project have a build
  // configuration", and a pyproject.toml answers it as well as a vite.config.ts.
  return [
    ...BUILD_CONFIG_FILES_JS,
    ...BUILD_CONFIG_FILES_PYTHON,
    ...BUILD_CONFIG_FILES_UNIVERSAL,
  ];
}

/**
 * Does the project have a build configuration? Searches the workspace root AND
 * every monorepo project folder, so an Nx app whose config is
 * `apps/<name>/project.json` counts.
 */
export function hasBuildConfig(
  projectRoot: string,
  projectType?: string
): boolean {
  for (const name of buildConfigFileNames(projectType)) {
    if (FileUtils.exists(PathOperations.join(projectRoot, name))) return true;
    if (NxWorkspace.resolveSourceFiles(projectRoot, name).length > 0) {
      return true;
    }
  }
  return false;
}