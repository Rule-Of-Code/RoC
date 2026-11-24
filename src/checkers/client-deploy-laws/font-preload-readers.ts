/**
 * Primary Locale Font Preloaded: the readers of its inputs — the
 * @font-face blocks of stylesheets and <style> elements, the declared
 * locales, and the font preloads of documents and hosting headers.
 */

import * as fs from 'fs';
import type { LawCheckContext } from '../../types/law.types';
import { CssRules } from '../../utils/ionic/css-rules';
import { PathOperations } from '../../utils/path-operations';
import { parseUnicodeRange } from '../../utils/performance/font-subsets';

export interface FontFace {
  family: string;
  where: string;
  /** File names of the non-inline sources. */
  files: string[];
  range: Array<[number, number]> | null;
  rangeText: string;
}

export interface DeclaredLocale {
  locale: string;
  where: string;
}

export interface Preload {
  /** File name of the preloaded URL; null when the href is not a literal. */
  file: string | null;
  where: string;
  crossorigin: boolean;
}

export interface Text {
  file: string;
  rel: string;
  text: string;
}

const lineAt = (text: string, index: number): number =>
  text.slice(0, index).split('\n').length;

function fileName(url: string): string {
  const path = url.split(/[?#]/)[0] ?? '';
  return path.slice(path.lastIndexOf('/') + 1).toLowerCase();
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(
    `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`,
    'i'
  ).exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

/** The files as project-relative texts; a file that cannot be read is left out. */
export function read(context: LawCheckContext, files: string[]): Text[] {
  return files.flatMap(file => {
    try {
      const rel = PathOperations.getRelative(context.projectRoot, file).replace(
        /\\/g,
        '/'
      );
      return [{ file, rel, text: fs.readFileSync(file, 'utf8') }];
    } catch {
      return [];
    }
  });
}

/** The @font-face blocks of one stylesheet text. */
export function facesIn(rel: string, text: string, firstLine = 1): FontFace[] {
  const source = CssRules.stripComments(
    text,
    /\.(?:scss|sass|less)$/i.test(rel)
  );
  return [...source.matchAll(/@font-face\s*\{([^}]*)\}/gi)].map(match => {
    const body = match[1] ?? '';
    const family =
      /(?:^|[;\s])font-family\s*:\s*([^;]+)/i
        .exec(body)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, '') ?? '';
    const rangeText =
      /(?:^|[;\s])unicode-range\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim() ?? '';
    const urls = [...body.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)].map(
      url => url[2] ?? ''
    );
    return {
      family,
      where: `${rel}:${lineAt(source, match.index ?? 0) + firstLine - 1}`,
      files: urls.filter(url => !url.startsWith('data:')).map(fileName),
      range: rangeText ? parseUnicodeRange(rangeText) : null,
      rangeText,
    };
  });
}

/** The @font-face blocks of a document's <style> elements, with their lines in the document. */
export function styleBlocks(document: Text): FontFace[] {
  return [
    ...document.text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi),
  ].flatMap(match =>
    facesIn(
      document.rel,
      match[1] ?? '',
      lineAt(document.text, (match.index ?? 0) + match[0].indexOf('>') + 1)
    )
  );
}

/** Families with two or more faces whose unicode-ranges differ: the split ones. */
export function splitFamilies(faces: FontFace[]): Map<string, FontFace[]> {
  const byFamily = new Map<string, FontFace[]>();
  for (const face of faces) {
    if (!face.family || !face.rangeText) continue;
    const key = face.family.toLowerCase();
    byFamily.set(key, [...(byFamily.get(key) ?? []), face]);
  }
  return new Map(
    [...byFamily].filter(
      ([, members]) => new Set(members.map(face => face.rangeText)).size > 1
    )
  );
}

/** The locale each <html lang> of a document declares. */
export function htmlLang(document: Text): DeclaredLocale[] {
  return [...document.text.matchAll(/<html\b[^>]*>/gi)].flatMap(match => {
    const lang = attribute(match[0], 'lang');
    return lang
      ? [
          {
            locale: lang,
            where: `${document.rel}:${lineAt(document.text, match.index ?? 0)} (<html lang="${lang}">)`,
          },
        ]
      : [];
  });
}

/** The locales a pattern finds in the texts (group 1 or 2), labelled with where. */
export function patternLocales(
  texts: Text[],
  pattern: RegExp,
  label: string
): DeclaredLocale[] {
  return texts.flatMap(({ rel, text }) =>
    [...text.matchAll(pattern)].map(match => ({
      locale: match[1] ?? match[2] ?? '',
      where: `${rel}:${lineAt(text, match.index ?? 0)} (${label})`,
    }))
  );
}

/** The <link rel="preload" as="font"> tags of a document. */
export function preloadsIn(document: Text): Preload[] {
  return [...document.text.matchAll(/<link\b[^>]*>/gi)].flatMap(match => {
    const tag = match[0];
    const rel = attribute(tag, 'rel') ?? '';
    if (
      !/\bpreload\b/i.test(rel) ||
      (attribute(tag, 'as') ?? '').toLowerCase() !== 'font'
    )
      return [];
    const href = attribute(tag, 'href');
    return [
      {
        file: href ? fileName(href) : null,
        where: `${document.rel}:${lineAt(document.text, match.index ?? 0)}`,
        crossorigin: /\bcrossorigin\b/i.test(tag),
      },
    ];
  });
}

/** The `Link: <…>; rel=preload` entries of hosting header files. */
export function headerPreloads(texts: Text[]): Preload[] {
  return texts.flatMap(({ rel, text }) =>
    [...text.matchAll(/<([^<>\s]+)>\s*;[^,"\n]*rel="?preload"?/gi)].map(
      match => ({
        file: fileName(match[1] ?? ''),
        where: `${rel}:${lineAt(text, match.index ?? 0)}`,
        crossorigin: true,
      })
    )
  );
}
