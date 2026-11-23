import type * as TS from 'typescript';
import { FileUtils } from '../../../../utils/file-utils';
import {
  type CodeView,
  readCodeView,
} from '../../../../utils/security/code-view';

/**
 * A file of the project through the parser (#550): what the program does,
 * with its strings and comments set apart, so a pattern table, a law's prose
 * or a comment is not read as the project's code. Null when unreadable.
 */
export function readApiCodeView(
  ts: typeof TS,
  file: string,
  content?: string
): CodeView | null {
  try {
    const text = content ?? FileUtils.readFile(file, { encoding: 'utf8' });
    return readCodeView(ts, text, file);
  } catch {
    return null;
  }
}

/** The note for a project whose TypeScript parser could not be loaded. */
export const API_FILES_NOT_READ =
  'the server and HTTP service files of API Security Standards';
