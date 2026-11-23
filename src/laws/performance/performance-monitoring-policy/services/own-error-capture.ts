import { capturesErrors } from '../../../../checkers/code-quality-laws/global-error-handlers';
import type { RuleOfCodeConfig } from '../../../../config/types';
import { CheckerUtils } from '../../../../utils/checker-utils';
import { FileUtils } from '../../../../utils/file-utils';
import {
  loadTypeScript,
  parserUnavailable,
  TsxSource,
} from '../../../../utils/react/tsx-source';

/** Errors the project captures with its own code, and what could not be read. */
export interface OwnErrorCapture {
  /** `src/app/app.config.ts` — files that register a handler. */
  files: string[];
  /** Not-read notes, for the law's "NOT read" violation. */
  unread: string[];
}

/** Only these files can hold a handler; the rest are not parsed. */
const MAY_CAPTURE = /ErrorHandler|onerror|addEventListener|\.(?:on|once)\s*\(/;

function relative(projectRoot: string, file: string): string {
  return file
    .slice(projectRoot.length)
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
}

/**
 * An own error handler in the production sources (#553): an Angular
 * ErrorHandler provider wherever it is registered (app.config.ts,
 * bootstrapApplication's providers, a `provide…ErrorHandler()` helper), or a
 * window / process error listener — read with the detector Global Error
 * Handlers uses. Until #553 the law looked for the word `ErrorHandler` in
 * src/app/app.module.ts and src/app/app.component.ts only, which a
 * standalone app does not have.
 */
export function ownErrorCapture(
  projectRoot: string,
  config?: RuleOfCodeConfig,
  lawId?: string
): OwnErrorCapture {
  const candidates: Array<{ file: string; text: string }> = [];
  for (const file of CheckerUtils.findFilesByExtension(
    projectRoot,
    [...CheckerUtils.getCommonExtensions().ALL_CODE, '.mjs', '.cjs'],
    config ?? FileUtils.getMinimalDefaultConfig(),
    lawId
  )) {
    const text = FileUtils.readFileContentSync(file);
    if (text && MAY_CAPTURE.test(text)) candidates.push({ file, text });
  }
  if (candidates.length === 0) return { files: [], unread: [] };

  const ts = loadTypeScript(projectRoot);
  if (!ts) {
    return {
      files: [],
      unread: [
        `${candidates.length} file(s): ${parserUnavailable(projectRoot, 'the files that may register an error handler')}`,
      ],
    };
  }

  const files: string[] = [];
  const unread: string[] = [];
  for (const { file, text } of candidates) {
    const source = TsxSource.parse(ts, file, text);
    const [syntaxError] = source.parseErrors();
    if (syntaxError) {
      unread.push(
        `${relative(projectRoot, file)}: could not be parsed (${syntaxError}) — its code was NOT read`
      );
    } else if (capturesErrors(ts, source.sourceFile)) {
      files.push(relative(projectRoot, file));
    }
  }
  return { files, unread };
}
