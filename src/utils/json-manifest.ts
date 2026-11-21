/**
 * Reading a JSON file that is not RoC's own config: package.json,
 * tsconfig.json, an ESLint `.json` config.
 *
 * `ConfigFileUtils.loadConfig` is the reader of RoC's config. It returns null
 * for any JSON without `ignores`, `includes` or `laws`, so a package.json or a
 * tsconfig.json read through it always came back empty (#486). Laws then
 * passed silently (no audit script seen, no ESLint rule seen) or reported a
 * finding about a file they never read ("No ESLint configuration found" next
 * to a valid .eslintrc.json). This reader returns the parsed object, or the
 * reason it could not be read, so a law can say the file was NOT read instead
 * of judging an empty object.
 */

import { FileSystemOperations } from './file-system-operations';

export type JsonManifest =
  | { data: Record<string, unknown>; notRead?: undefined }
  | { data?: undefined; notRead: string };

export interface JsonManifestOptions {
  /**
   * Accept `//` and block comments and trailing commas: tsconfig.json and
   * ESLint's `.eslintrc.json` are JSONC. package.json is plain JSON (npm
   * rejects comments), so it is read without this.
   */
  jsonc?: boolean;
}

/** Why a file could not be read, without its path or its content. */
function readFailure(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code ? `could not be read (${code})` : 'could not be read';
}

/** Why the text is not a JSON object. */
function parseFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return `is not valid JSON (${message})`;
}

/**
 * The JSON object in `filePath`, or why it was not read: the file could not be
 * read, its text is not JSON (JSONC with `jsonc`), or its value is not an
 * object. A UTF-8 BOM is ignored.
 */
export function readJsonManifest(
  filePath: string,
  options: JsonManifestOptions = {}
): JsonManifest {
  let text: string;
  try {
    text = FileSystemOperations.readFile(filePath, {
      fallbackToEmpty: false,
    }).replace(/^﻿/, '');
  } catch (error) {
    return { notRead: readFailure(error) };
  }
  let value: unknown;
  try {
    value = JSON.parse(
      options.jsonc ? FileSystemOperations.stripJsonComments(text) : text
    );
  } catch (error) {
    return { notRead: parseFailure(error) };
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { notRead: 'is not a JSON object' };
  }
  return { data: value as Record<string, unknown> };
}

/**
 * The note of a law that needed `file` and could not read it:
 * `package.json is not valid JSON (…) — its scripts were NOT read`. The
 * wording carries "NOT read", the 8.0.0 term for input a law did not judge.
 */
export function notReadNote(
  file: string,
  reason: string,
  unread: string
): string {
  return `${file} ${reason} — ${unread} NOT read`;
}
