/**
 * User-facing text in JSX, for the i18n law.
 *
 * Hardcoded text in a React component is JSX text between tags, or a string
 * literal in an attribute a user reads (`placeholder`, `title`, `alt`,
 * `aria-label`). Both are read on the syntax tree with the project's own
 * TypeScript, so a string in a comment or in code that is not rendered is not
 * mistaken for it. Text inside react-i18next's `<Trans>` is translated, not
 * hardcoded. A file that cannot be parsed is reported, never passed.
 */

import type * as TS from 'typescript';
import type { LawCheckContext } from '../../types/law.types';
import { ReactProject } from '../../utils/react/react-project';

/** The same "looks like words" heuristic the Angular template check uses. */
const WORDS = /[A-Za-z][A-Za-z\s]{3,}/;
const READ_ATTRIBUTES = new Set(['placeholder', 'title', 'alt', 'aria-label']);
const TRANSLATED_ELEMENTS = new Set(['Trans']);
/** Hooks / functions of next-intl and react-i18next that fetch translations. */
const TRANSLATION_CALLS = new Set(['useTranslations', 'getTranslations', 'useTranslation']);

export interface JsxTextAnalysis {
  /** `path:line "text"` for each hardcoded text, in scan order. */
  hardcoded: string[];
  /** Whether any component calls a translation hook. */
  usesTranslations: boolean;
  /** Files that were not read (see ReactProject.parse). */
  unread: string[];
}

export function analyzeJsxText(context: LawCheckContext): JsxTextAnalysis {
  const files = ReactProject.sourceFiles(context, ['.tsx', '.jsx']);
  const { sources, unread } = ReactProject.parse(context, files);
  const hardcoded: string[] = [];
  let usesTranslations = false;
  for (const source of sources) {
    const ts = source.ts;
    const rel = ReactProject.relative(context, source.fileName);
    const report = (node: TS.Node, text: string): void => {
      hardcoded.push(`${rel}:${source.lineOf(node)} "${text.trim().replace(/\s+/g, ' ').slice(0, 40)}"`);
    };
    source.walk(node => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && TRANSLATION_CALLS.has(node.expression.text)) {
        usesTranslations = true;
      } else if (ts.isJsxText(node) && WORDS.test(node.text) && !insideTranslated(ts, node, source.sourceFile)) {
        report(node, node.text);
      } else if (
        ts.isJsxAttribute(node) &&
        READ_ATTRIBUTES.has(node.name.getText(source.sourceFile)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        WORDS.test(node.initializer.text)
      ) {
        report(node, node.initializer.text);
      }
    });
  }
  return { hardcoded, usesTranslations, unread };
}

function insideTranslated(ts: typeof TS, node: TS.Node, sourceFile: TS.SourceFile): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent) && TRANSLATED_ELEMENTS.has(parent.openingElement.tagName.getText(sourceFile))) {
      return true;
    }
  }
  return false;
}
