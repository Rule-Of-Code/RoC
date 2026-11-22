/**
 * The ESLint configs a law can read without running them: a `.eslintrc.json`
 * or `.eslintrc` file (JSONC, as ESLint reads it) and the `eslintConfig` key
 * of package.json. A YAML config is found but not read, and says so.
 *
 * These were read with RoC's own config loader, which returns null for any
 * JSON without `ignores`/`includes`/`laws` (#486): a valid `.eslintrc.json`
 * read as "no ESLint configuration".
 */

import { notReadNote, readJsonManifest } from './json-manifest';

export type ESLintConfigRead =
  | { config: Record<string, unknown>; notRead?: undefined }
  | { config?: undefined; notRead: string };

/** ESLint's legacy config files that are not JavaScript. */
export const ESLINTRC_DATA_FILES = [
  '.eslintrc.json',
  '.eslintrc',
  '.eslintrc.yaml',
  '.eslintrc.yml',
] as const;

const isYaml = (name: string): boolean => /\.ya?ml$/.test(name);

/**
 * The config in an `.eslintrc*` data file, or the note saying it was not
 * read. `shownAs` names the file in the note.
 */
export function readESLintDataConfig(
  file: string,
  shownAs: string,
  unread = 'its rules were'
): ESLintConfigRead {
  if (isYaml(shownAs)) {
    return {
      notRead: notReadNote(
        shownAs,
        'is YAML, which this law does not read',
        unread
      ),
    };
  }
  const read = readJsonManifest(file, { jsonc: true });
  return read.notRead !== undefined
    ? { notRead: notReadNote(shownAs, read.notRead, unread) }
    : { config: read.data };
}

/**
 * The `eslintConfig` of the package.json at `file`; null when the file was
 * read and has none (or it is not an object), the note when it was not read.
 */
export function readPackageJsonESLintConfig(
  file: string,
  unread = 'its eslintConfig was'
): ESLintConfigRead | null {
  const read = readJsonManifest(file);
  if (read.notRead !== undefined) {
    return { notRead: notReadNote('package.json', read.notRead, unread) };
  }
  const config = read.data.eslintConfig;
  return config && typeof config === 'object' && !Array.isArray(config)
    ? { config: config as Record<string, unknown> }
    : null;
}
