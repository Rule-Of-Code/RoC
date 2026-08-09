/**
 * Does this project have a RuleOfCode configuration, and where?
 *
 * Laws must answer that question the same way the loader does. Two of them did
 * not: they looked for the literal string `ruleofcode.config.json` while the
 * loader accepts six filenames across three directories — and `init` writes
 * `ruleofcode.config.js`. A project configured by our own `init` command was
 * therefore told its configuration was missing, by an audit that had just read
 * that very file.
 *
 * The list lives in one place (the loader's) and everything consults it here,
 * so the two cannot drift apart again.
 */

import { FileUtils } from '../file-utils';
import { PathOperations } from '../path-operations';
import { ConfigurationFileLoaderConfiguration } from './configuration-file-loader/configuration-file-loader-configuration';

/** Every path the loader would accept as this project's config, in its order. */
export function candidateConfigPaths(projectRoot: string): string[] {
  const { directories } =
    ConfigurationFileLoaderConfiguration.getConfigurationDirectories(undefined);
  const { files } =
    ConfigurationFileLoaderConfiguration.getConfigurationFiles(undefined);

  const paths: string[] = [];
  for (const dir of directories) {
    for (const file of files) {
      paths.push(PathOperations.resolve(projectRoot, dir, file));
    }
  }
  return paths;
}

/**
 * The config file this project actually has, or null. Same discovery order the
 * loader uses, so a law and the loader can never disagree about its existence.
 */
export function findRuleOfCodeConfig(projectRoot: string): string | null {
  for (const candidate of candidateConfigPaths(projectRoot)) {
    if (FileUtils.exists(candidate)) return candidate;
  }
  return null;
}

/** True when the project carries a RuleOfCode config in any accepted form. */
export function hasRuleOfCodeConfig(projectRoot: string): boolean {
  return findRuleOfCodeConfig(projectRoot) !== null;
}

/** The accepted filenames, for messages that need to list them. */
export function acceptedConfigFileNames(): readonly string[] {
  return ConfigurationFileLoaderConfiguration.getConfigurationFiles(undefined)
    .files;
}
