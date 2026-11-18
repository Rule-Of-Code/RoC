/**
 * Which writing system a locale uses, and which `@font-face` subsets cover it.
 *
 * A web font split by `unicode-range` is downloaded one subset at a time: the
 * browser requests a subset only when text in its range is laid out. Whether
 * the subset for the app's own language is late is therefore a question of
 * two tables — locale → script, and unicode-range → script — plus the faces
 * the stylesheets declare.
 *
 * A subset "covers" a script when its unicode-range reaches the script's
 * basic letters (Cyrillic А–я, Greek Α–ω, …), not merely its block: an
 * extended-Cyrillic subset (U+0460–052F) holds no letter of Bulgarian or
 * Russian, and preloading it would not help them.
 */

import type { LawRequirement } from '../../types/enhanced-law.types';

export type Script =
  | 'Arabic'
  | 'Armenian'
  | 'Cyrillic'
  | 'Devanagari'
  | 'Georgian'
  | 'Greek'
  | 'Hebrew'
  | 'Latin'
  | 'Thai';

/** The basic letters of each script a subset must reach to serve its text. */
export const SCRIPT_CORE_LETTERS: Readonly<Record<Exclude<Script, 'Latin'>, ReadonlyArray<readonly [number, number]>>> = {
  Cyrillic: [[0x0410, 0x044f]],
  Greek: [[0x0391, 0x03c9]],
  Armenian: [[0x0531, 0x0587]],
  Hebrew: [[0x05d0, 0x05ea]],
  Arabic: [[0x0621, 0x064a]],
  Devanagari: [[0x0905, 0x0939]],
  Thai: [[0x0e01, 0x0e2e]],
  Georgian: [[0x10d0, 0x10fa]],
};

/** ISO 639 language → its default script. A language absent here is not judged. */
const LANGUAGE_SCRIPT: Readonly<Record<Script, readonly string[]>> = {
  Cyrillic: ['bg', 'ru', 'uk', 'be', 'mk', 'sr', 'kk', 'ky', 'tg', 'mn', 'ba', 'tt', 'cv', 'ce', 'os', 'sah'],
  Greek: ['el'],
  Hebrew: ['he', 'iw', 'yi'],
  Arabic: ['ar', 'fa', 'ur', 'ps', 'ckb', 'sd', 'ug'],
  Armenian: ['hy'],
  Georgian: ['ka'],
  Devanagari: ['hi', 'mr', 'ne', 'sa'],
  Thai: ['th'],
  Latin: [
    'af', 'ast', 'az', 'br', 'bs', 'ca', 'co', 'cs', 'cy', 'da', 'de', 'en', 'eo', 'es', 'et', 'eu', 'fi',
    'fil', 'fo', 'fr', 'fy', 'ga', 'gd', 'gl', 'ha', 'haw', 'hr', 'hu', 'id', 'ig', 'is', 'it', 'kl', 'ku',
    'la', 'lb', 'lt', 'lv', 'mg', 'mi', 'ms', 'mt', 'nb', 'nl', 'nn', 'no', 'oc', 'pl', 'pt', 'qu', 'rm',
    'ro', 'rw', 'se', 'sk', 'sl', 'sm', 'sn', 'so', 'sq', 'sv', 'sw', 'tk', 'tl', 'tn', 'to', 'tr', 'uz',
    'vi', 'wo', 'xh', 'yo', 'zu',
  ],
};

/** ISO 15924 script subtag (`sr-Latn`, `uz-Cyrl`) → script. */
const SCRIPT_SUBTAG: Readonly<Record<string, Script>> = {
  arab: 'Arabic',
  armn: 'Armenian',
  cyrl: 'Cyrillic',
  deva: 'Devanagari',
  geor: 'Georgian',
  grek: 'Greek',
  hebr: 'Hebrew',
  latn: 'Latin',
  thai: 'Thai',
};

const BY_LANGUAGE = new Map<string, Script>(
  (Object.entries(LANGUAGE_SCRIPT) as Array<[Script, readonly string[]]>).flatMap(([script, languages]) =>
    languages.map(language => [language, script] as [string, Script])
  )
);

/** The script a BCP 47 locale is written in, or null when the tables do not know it. */
export function scriptOfLocale(locale: string): Script | null {
  const parts = locale.trim().replace(/_/g, '-').split('-');
  const subtag = parts.slice(1).find(part => /^[A-Za-z]{4}$/.test(part));
  const fromSubtag = subtag ? SCRIPT_SUBTAG[subtag.toLowerCase()] : undefined;
  if (fromSubtag) return fromSubtag;
  return BY_LANGUAGE.get((parts[0] ?? '').toLowerCase()) ?? null;
}

/** `U+0400-045F, U+0490, U+04??` → code point intervals; null when a part is unreadable. */
export function parseUnicodeRange(value: string): Array<[number, number]> | null {
  const intervals: Array<[number, number]> = [];
  for (const raw of value.split(',')) {
    const part = raw.trim();
    const match = /^[Uu]\+([0-9A-Fa-f?]{1,6})(?:-([0-9A-Fa-f]{1,6}))?$/.exec(part);
    if (!match?.[1]) return null;
    const start = match[1];
    if (start.includes('?')) {
      intervals.push([parseInt(start.replace(/\?/g, '0'), 16), parseInt(start.replace(/\?/g, 'F'), 16)]);
      continue;
    }
    const from = parseInt(start, 16);
    intervals.push([from, match[2] ? parseInt(match[2], 16) : from]);
  }
  return intervals;
}

/** Does a unicode-range reach the basic letters of `script`? */
export function rangeCovers(intervals: ReadonlyArray<readonly [number, number]>, script: Exclude<Script, 'Latin'>): boolean {
  return SCRIPT_CORE_LETTERS[script].some(([low, high]) => intervals.some(([from, to]) => from <= high && to >= low));
}

/** The stylesheets and documents Primary Locale Font Preloaded reads faces from. */
export const FONT_FACE_FILE_GLOBS: readonly string[] = ['**/*.{css,scss,sass,less,html,htm,tsx,jsx,vue,svelte,astro}'];

/** Its subject, for `requires.anyFileContaining`: an @font-face block with a unicode-range. */
export const REQUIRES_UNICODE_RANGE_FONT: LawRequirement = {
  anyFileContaining: [{ files: FONT_FACE_FILE_GLOBS, pattern: String.raw`@font-face\s*\{[^}]*unicode-range` }],
};
