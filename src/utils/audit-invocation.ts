/**
 * Where does this project RUN the audit?
 *
 * Three laws ask "is the audit part of how this project works?" and each
 * looked in one place: Constitutional Supremacy and Continuous Compliance
 * read package.json scripts (and Continuous Compliance wanted the package
 * as a dependency), Pull Request Workflow wanted scripts named precommit /
 * prepush. A project that runs `npx ruleofcode audit` from a committed git
 * hook and from a CI step — and declares no such script and no dependency,
 * because npx fetches the tool — was told it enforced nothing (#434).
 *
 * One probe, three places, the same reader for all three laws:
 *   - package scripts, every workspace manifest (the command, not the name);
 *   - committed git hooks: `.husky/<hook>`, `.githooks/<hook>`, lefthook
 *     config, `.pre-commit-config.yaml`, `simple-git-hooks` in package.json;
 *   - CI configuration (the shared provider list and `pathMappings.cicdConfig`).
 * Comments and YAML `name:` lines are dropped before matching, so a step
 * that only mentions the audit in its title is not an invocation.
 */

import { RUNS_AUDIT } from './compliance-scripts';
import { commandText } from './ci-command-text';
import { FileSystemOperations } from './file-system-operations';
import { FileUtils } from './file-utils';
import { PathOperations } from './path-operations';
import { ciConfigPaths } from './project-discovery';
import { WorkspaceManifests } from './workspace-manifests';

/** The git hooks a project commits, in each layout we read. */
const HOOK_DIRS = ['.husky', '.githooks'];
const HOOK_CONFIG_FILES = [
  'lefthook.yml',
  '.lefthook.yml',
  'lefthook.yaml',
  '.lefthook.yaml',
  '.pre-commit-config.yaml',
];

/** Git hook names (githooks(5)) a hook directory may hold. */
const GIT_HOOK_NAME =
  /^(?:pre-commit|prepare-commit-msg|commit-msg|post-commit|pre-push|pre-rebase|post-checkout|post-merge|pre-merge-commit)$/;

type CiConfig = Parameters<typeof ciConfigPaths>[1];

/** One committed git hook: where it is written, which hook, and its commands. */
export interface CommittedHook {
  where: string;
  hook: string;
  commands: string;
}

function read(file: string): string {
  try {
    return FileUtils.readFile(file);
  } catch {
    return '';
  }
}

/** Hook files in a hook directory (.husky/pre-commit, .githooks/pre-push). */
function hookDirectoryFiles(projectRoot: string): CommittedHook[] {
  return HOOK_DIRS.flatMap(dir => {
    const path = PathOperations.join(projectRoot, dir);
    if (!FileUtils.isDirectory(path)) return [];
    return FileSystemOperations.readDirectory(path)
      .filter(entry => entry.isFile() && GIT_HOOK_NAME.test(entry.name))
      .map(entry => ({
        where: `${dir}/${entry.name}`,
        hook: entry.name,
        commands: commandText(read(PathOperations.join(path, entry.name))),
      }));
  });
}

/** Hook configs (lefthook, pre-commit): each hook the config names counts. */
function hookConfigFiles(projectRoot: string): CommittedHook[] {
  return HOOK_CONFIG_FILES.flatMap(name => {
    const file = PathOperations.join(projectRoot, name);
    if (!FileUtils.exists(file)) return [];
    const text = read(file);
    const named = text.match(
      /\b(?:pre-commit|commit-msg|pre-push|post-merge|post-checkout)\b/g
    ) ?? ['pre-commit'];
    return [...new Set(named)].map(hook => ({
      where: name,
      hook,
      commands: commandText(text),
    }));
  });
}

/** `simple-git-hooks` in the root package.json. */
function simpleGitHooks(projectRoot: string): CommittedHook[] {
  const rootManifest = WorkspaceManifests.all(projectRoot).find(
    manifest => PathOperations.getRelative(projectRoot, manifest.dir) === ''
  );
  const declared = rootManifest?.raw['simple-git-hooks'];
  if (!declared || typeof declared !== 'object') return [];
  return Object.entries(declared as Record<string, unknown>)
    .filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && GIT_HOOK_NAME.test(entry[0])
    )
    .map(([hook, commands]) => ({ where: 'simple-git-hooks', hook, commands }));
}

/** Every git hook the project commits: hook files, hook configs, package.json. */
export function committedHooks(projectRoot: string): CommittedHook[] {
  return [
    ...hookDirectoryFiles(projectRoot),
    ...hookConfigFiles(projectRoot),
    ...simpleGitHooks(projectRoot),
  ];
}

/** The text of every CI configuration file (a workflows directory: each file in it). */
function ciTexts(
  projectRoot: string,
  config?: CiConfig
): Array<[string, string]> {
  const texts: Array<[string, string]> = [];
  for (const path of ciConfigPaths(projectRoot, config)) {
    const files = FileUtils.isDirectory(path)
      ? FileSystemOperations.readDirectory(path)
          .filter(entry => entry.isFile())
          .map(entry => PathOperations.join(path, entry.name))
      : [path];
    for (const file of files) {
      texts.push([
        PathOperations.getRelative(projectRoot, file),
        commandText(read(file)),
      ]);
    }
  }
  return texts;
}

/** A line that prints text rather than running a command (`echo "run roc audit"`). */
const PRINTS = /^\s*(?:-\s+)?(?:run:\s*)?(?:echo|printf)\b/;

/** One command line of the text runs the audit (a file is matched line by line). */
function runsAudit(text: string): boolean {
  return text
    .split(/\r?\n/)
    .some(line => !PRINTS.test(line) && RUNS_AUDIT.test(line));
}

/**
 * Every place the project runs `ruleofcode audit` / `roc audit`: a package
 * script, a committed git hook, a CI step — e.g. `script "audit"`,
 * `.husky/pre-push`, `.github/workflows/ci.yml`. Empty when none does.
 */
export function auditInvocations(
  projectRoot: string,
  config?: CiConfig
): string[] {
  const found: string[] = [];
  for (const manifest of WorkspaceManifests.all(projectRoot)) {
    for (const [name, command] of Object.entries(manifest.scripts)) {
      if (RUNS_AUDIT.test(String(command))) found.push(`script "${name}"`);
    }
  }
  for (const hook of committedHooks(projectRoot)) {
    if (runsAudit(hook.commands)) found.push(hook.where);
  }
  for (const [where, text] of ciTexts(projectRoot, config)) {
    if (runsAudit(text)) found.push(where);
  }
  return [...new Set(found)];
}
