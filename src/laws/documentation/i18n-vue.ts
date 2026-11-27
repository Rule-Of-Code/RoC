/**
 * User-facing text in Vue single-file components, for the i18n law (#12).
 *
 * The same heuristic the JSX reading uses, on a `.vue` file's `<template>`
 * (its script and style are not markup): text written directly inside an
 * element, or a static attribute a user reads (`placeholder`, `title`, `alt`,
 * `aria-label`), with four-plus Latin letters. The template is read as
 * elements (TemplateMarkup), so a `>` inside a binding does not end a tag.
 *
 * Not hardcoded:
 * - text inside `{{ … }}` (`{{ $t('home.title') }}`) — it is code;
 * - a bound attribute (`:placeholder="$t('…')"`) — the binding decides;
 * - an element whose text a directive replaces (`v-t`, `v-text`, `v-html`);
 * - children of vue-i18n's translation component (`<i18n-t>`): they fill
 *   the slots of a translated message.
 *
 * A template that cannot be read is reported, never passed.
 */

import type { LawCheckContext } from '../../types/law.types';
import {
  TemplateMarkup,
  type MarkupElement,
} from '../../checkers/accessibility-laws/template-markup';
import { FileUtils } from '../../utils/file-utils';
import { ReactProject } from '../../utils/react/react-project';
import { scriptView, templateView } from '../../utils/vue/vue-sfc';

/** Characters of a hardcoded text quoted in a finding. */
const TEXT_QUOTE_LENGTH = 40;

/** The same "looks like words" heuristic the JSX and Angular checks use. */
const WORDS = /[A-Za-z][A-Za-z\s]{3,}/;
const READ_ATTRIBUTES = ['placeholder', 'title', 'alt', 'aria-label'];
/** Directives that replace an element's own text. */
const TEXT_REPLACING = ['v-t', 'v-text', 'v-html'];
/** vue-i18n's translation component, as a template may write it. */
const TRANSLATION_COMPONENTS = new Set(['i18n-t', 'i18nt']);
/** A translation in the template: `$t(…)`, `$tc(…)`, `$rt(…)` or `v-t`. */
const TEMPLATE_TRANSLATION = /\$(?:t|tc|rt|te)\s*\(|\sv-t\s*=/;
/** vue-i18n's Composition API in the script. */
const SCRIPT_TRANSLATION = /\buseI18n\s*\(/;

export interface VueTextAnalysis {
  /** `path:line "text"` for each hardcoded text, in scan order. */
  hardcoded: string[];
  /** The same texts as places: file (project-relative), line and quote. */
  sites: Array<{ file: string; line: number; text: string }>;
  /** Whether any component translates text with vue-i18n. */
  usesTranslations: boolean;
  /** Components whose template could not be read. */
  unread: string[];
  /** How many `.vue` files were read. */
  read: number;
}

export function analyzeVueText(context: LawCheckContext): VueTextAnalysis {
  const files = ReactProject.sourceFiles(context, ['.vue']);
  const analysis: VueTextAnalysis = {
    hardcoded: [],
    sites: [],
    usesTranslations: false,
    unread: [],
    read: 0,
  };
  for (const file of files) {
    const content = FileUtils.readFileContentSync(file);
    if (content === null) continue;
    analysis.read++;
    const rel = ReactProject.relative(context, file);
    const template = templateView(content);
    if (
      TEMPLATE_TRANSLATION.test(template) ||
      SCRIPT_TRANSLATION.test(scriptView(content))
    ) {
      analysis.usesTranslations = true;
    }
    const document = TemplateMarkup.parse(template);
    if (document.error) {
      analysis.unread.push(
        `${rel}: the <template> could not be read (${document.error}) — its text was not checked for i18n`
      );
      continue;
    }
    for (const element of document.elements) {
      for (const { text, line } of hardcodedTexts(element)) {
        const quote = text
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, TEXT_QUOTE_LENGTH);
        analysis.hardcoded.push(`${rel}:${line} "${quote}"`);
        analysis.sites.push({ file: rel, line, text: quote });
      }
    }
  }
  return analysis;
}

/**
 * The hardcoded texts of one element, each at its line: its own text (at the
 * line the text starts), then its read attributes (at the element's line).
 */
function hardcodedTexts(
  element: MarkupElement
): Array<{ text: string; line: number }> {
  if (insideTranslation(element)) return [];
  const texts: Array<{ text: string; line: number }> = [];
  const own = element.text.replace(/\{\{[\s\S]*?\}\}/g, ' ');
  const replaced = TEXT_REPLACING.some(name =>
    TemplateMarkup.has(element, name)
  );
  if (!replaced && WORDS.test(own))
    texts.push({ text: own, line: element.textLine ?? element.line });
  for (const name of READ_ATTRIBUTES) {
    const value = TemplateMarkup.staticValue(element, name);
    if (value !== undefined && WORDS.test(value))
      texts.push({ text: value, line: element.line });
  }
  return texts;
}

function insideTranslation(element: MarkupElement): boolean {
  for (let node: MarkupElement | null = element; node; node = node.parent) {
    if (TRANSLATION_COMPONENTS.has(node.tag)) return true;
  }
  return false;
}
