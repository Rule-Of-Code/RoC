/**
 * Primary Locale Font Preloaded
 *
 * With `@font-face` split by `unicode-range`, the browser requests a subset
 * only when text in its range is laid out. When the app's own language needs
 * a subset other than the one the page starts with (Cyrillic, Greek, …), that
 * subset arrives after the first layout and forces a relayout right before
 * the screen is usable — unless the entry document preloads it.
 *
 * Read: the project's stylesheets (and `<style>` blocks) for `@font-face`
 * families split by unicode-range; the app's declared default locale(s) —
 * `<html lang>`, Angular `i18n.sourceLocale`, a `LOCALE_ID` provider, Next
 * `i18n.defaultLocale`; and every `<link rel="preload" as="font">` in a
 * document, plus `Link: <…>; rel=preload` in hosting header files. A preload
 * matches a face by the file name of its URL.
 */

import * as fs from 'fs';
import { glob } from 'glob';
import type { LawCheckContext, LawResult } from '../../types/law.types';
import { CssRules } from '../../utils/ionic/css-rules';
import { markJudgedNothing } from '../../utils/judged-nothing';
import { FileUtils } from '../../utils/file-utils';
import { NxWorkspace } from '../../utils/nx-workspace';
import { PathOperations } from '../../utils/path-operations';
import { readFilesContaining } from '../../utils/law-requirements';
import { parseUnicodeRange, rangeCovers, REQUIRES_UNICODE_RANGE_FONT, type Script, scriptOfLocale } from '../../utils/performance/font-subsets';
import { LawBase } from '../law-base';

interface FontFace {
  family: string;
  where: string;
  /** File names of the non-inline sources. */
  files: string[];
  range: Array<[number, number]> | null;
  rangeText: string;
}

interface DeclaredLocale {
  locale: string;
  where: string;
}

interface Preload {
  /** File name of the preloaded URL; null when the href is not a literal. */
  file: string | null;
  where: string;
  crossorigin: boolean;
}

interface Text {
  file: string;
  rel: string;
  text: string;
}

const DOCUMENT_EXTENSIONS = ['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte', '.astro'];
const STYLE_FILE = /\.(?:css|scss|sass|less)$/i;
const HOSTING_HEADER_FILES = ['firebase.json', '_headers', 'vercel.json', 'netlify.toml', 'staticwebapp.config.json'];
const TEST_FILE = /\.(?:spec|test|stories)\.[jt]sx?$/;

const lineAt = (text: string, index: number): number => text.slice(0, index).split('\n').length;

function fileName(url: string): string {
  const path = url.split(/[?#]/)[0] ?? '';
  return path.slice(path.lastIndexOf('/') + 1).toLowerCase();
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*["'\`]([^"'\`]*)["'\`]\\s*\\})`, 'i').exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? '';
}

function read(context: LawCheckContext, files: string[]): Text[] {
  return files.flatMap(file => {
    try {
      const rel = PathOperations.getRelative(context.projectRoot, file).replace(/\\/g, '/');
      return [{ file, rel, text: fs.readFileSync(file, 'utf8') }];
    } catch {
      return [];
    }
  });
}

/** The @font-face blocks of one stylesheet text. */
function facesIn(rel: string, text: string, firstLine = 1): FontFace[] {
  const source = CssRules.stripComments(text, /\.(?:scss|sass|less)$/i.test(rel));
  return [...source.matchAll(/@font-face\s*\{([^}]*)\}/gi)].map(match => {
    const body = match[1] ?? '';
    const family = /(?:^|[;\s])font-family\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim().replace(/^["']|["']$/g, '') ?? '';
    const rangeText = /(?:^|[;\s])unicode-range\s*:\s*([^;]+)/i.exec(body)?.[1]?.trim() ?? '';
    const urls = [...body.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi)].map(url => url[2] ?? '');
    return {
      family,
      where: `${rel}:${lineAt(source, match.index ?? 0) + firstLine - 1}`,
      files: urls.filter(url => !url.startsWith('data:')).map(fileName),
      range: rangeText ? parseUnicodeRange(rangeText) : null,
      rangeText,
    };
  });
}

function styleBlocks(document: Text): FontFace[] {
  return [...document.text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].flatMap(match =>
    facesIn(document.rel, match[1] ?? '', lineAt(document.text, (match.index ?? 0) + match[0].indexOf('>') + 1))
  );
}

/** Families with two or more faces whose unicode-ranges differ: the split ones. */
function splitFamilies(faces: FontFace[]): Map<string, FontFace[]> {
  const byFamily = new Map<string, FontFace[]>();
  for (const face of faces) {
    if (!face.family || !face.rangeText) continue;
    const key = face.family.toLowerCase();
    byFamily.set(key, [...(byFamily.get(key) ?? []), face]);
  }
  return new Map([...byFamily].filter(([, members]) => new Set(members.map(face => face.rangeText)).size > 1));
}

function htmlLang(document: Text): DeclaredLocale[] {
  return [...document.text.matchAll(/<html\b[^>]*>/gi)].flatMap(match => {
    const lang = attribute(match[0], 'lang');
    return lang ? [{ locale: lang, where: `${document.rel}:${lineAt(document.text, match.index ?? 0)} (<html lang="${lang}">)` }] : [];
  });
}

function patternLocales(texts: Text[], pattern: RegExp, label: string): DeclaredLocale[] {
  return texts.flatMap(({ rel, text }) =>
    [...text.matchAll(pattern)].map(match => ({
      locale: match[1] ?? match[2] ?? '',
      where: `${rel}:${lineAt(text, match.index ?? 0)} (${label})`,
    }))
  );
}

function preloadsIn(document: Text): Preload[] {
  return [...document.text.matchAll(/<link\b[^>]*>/gi)].flatMap(match => {
    const tag = match[0];
    const rel = attribute(tag, 'rel') ?? '';
    if (!/\bpreload\b/i.test(rel) || (attribute(tag, 'as') ?? '').toLowerCase() !== 'font') return [];
    const href = attribute(tag, 'href');
    return [{ file: href ? fileName(href) : null, where: `${document.rel}:${lineAt(document.text, match.index ?? 0)}`, crossorigin: /\bcrossorigin\b/i.test(tag) }];
  });
}

function headerPreloads(texts: Text[]): Preload[] {
  return texts.flatMap(({ rel, text }) =>
    [...text.matchAll(/<([^<>\s]+)>\s*;[^,"\n]*rel="?preload"?/gi)].map(match => ({
      file: fileName(match[1] ?? ''),
      where: `${rel}:${lineAt(text, match.index ?? 0)}`,
      crossorigin: true,
    }))
  );
}

export class PrimaryLocaleFontPreloadedLaw extends LawBase {
  static readonly LAW_NAME = 'Primary Locale Font Preloaded';

  static check(context: LawCheckContext): LawResult {
    const scan = (extensions: string[]): string[] =>
      FileUtils.scanForFiles(context.projectRoot, context.config, extensions, context.lawId, false).filter(file => !TEST_FILE.test(file));
    const documents = read(context, scan(DOCUMENT_EXTENSIONS));
    // The faces come from exactly the files that selected the law (its
    // requires.anyFileContaining set, read through the gate's reader).
    const faceFiles = (REQUIRES_UNICODE_RANGE_FONT.anyFileContaining ?? []).flatMap(entry => readFilesContaining(context.projectRoot, entry, context.config.ignores?.global ?? []));
    const faces = faceFiles.flatMap(found =>
      STYLE_FILE.test(found.rel) ? facesIn(found.rel, found.content) : styleBlocks({ file: found.file, rel: found.rel, text: found.content })
    );
    const families = splitFamilies(faces);
    const metrics = { faceFilesRead: faceFiles.length, splitFamilies: families.size };
    if (faceFiles.length === 0) {
      return { ...this.nothing(context, 'read no file with an @font-face that has a unicode-range'), metrics };
    }
    if (families.size === 0) {
      const result = this.createResult([], this.LAW_NAME, 'PERFORMANCE', [], context);
      return {
        ...result,
        message: `${this.LAW_NAME}: ${faceFiles.length} file(s) with @font-face read, no family is split into subsets by unicode-range — no subset to preload`,
        metrics,
      };
    }
    const locales = this.locales(context, documents);
    const judged = locales.flatMap(declared => {
      const script = scriptOfLocale(declared.locale);
      return script ? [{ ...declared, script }] : [];
    });
    if (judged.length === 0) {
      const seen = locales.map(declared => `${declared.locale} at ${declared.where}`).join(', ');
      return this.nothing(
        context,
        locales.length === 0
          ? 'found no default locale (<html lang>, i18n.sourceLocale, a LOCALE_ID provider, i18n.defaultLocale)'
          : `the declared locale(s) ${seen} are not in the locale → script table`
      );
    }
    const preloads = [...documents.flatMap(preloadsIn), ...headerPreloads(this.hostingHeaders(context))];
    const result = this.createResult(
      this.judge(families, judged, preloads),
      this.LAW_NAME,
      'PERFORMANCE',
      [
        'Preload the subset that covers the app\'s locale in the entry document: <link rel="preload" as="font" type="font/woff2" href="…" crossorigin>',
        'Preload only the weights the first screen uses; every preload competes with the rest of the first load',
      ],
      context
    );
    const counted = result.passed
      ? { ...result, message: `${result.message} — ${families.size} split famil${families.size === 1 ? 'y' : 'ies'} in ${faceFiles.length} file(s), locale(s) ${judged.map(declared => declared.locale).join(', ')}` }
      : result;
    return { ...counted, metrics: { ...metrics, localesJudged: judged.length } };
  }

  private static judge(families: Map<string, FontFace[]>, locales: Array<DeclaredLocale & { script: Script }>, preloads: Preload[]): string[] {
    const violations: string[] = [];
    const scripts = new Map<Exclude<Script, 'Latin'>, DeclaredLocale>();
    for (const declared of locales) {
      if (declared.script !== 'Latin' && !scripts.has(declared.script)) scripts.set(declared.script, declared);
    }
    for (const members of families.values()) {
      for (const [script, declared] of scripts) {
        const covering = members.filter(face => face.range && rangeCovers(face.range, script) && face.files.length > 0);
        if (covering.length > 0) violations.push(...this.judgeSubset(covering, script, declared, preloads));
      }
    }
    return violations;
  }

  private static judgeSubset(covering: FontFace[], script: Script, declared: DeclaredLocale, preloads: Preload[]): string[] {
    const files = new Set(covering.flatMap(face => face.files));
    const matching = preloads.filter(preload => preload.file !== null && files.has(preload.file));
    const family = covering[0]?.family ?? '';
    if (matching.some(preload => preload.crossorigin)) return [];
    if (matching.length > 0) {
      return matching.map(
        preload =>
          `${preload.where}: the font preload of ${preload.file} (the ${script} subset of '${family}') has no crossorigin attribute — fonts are fetched in CORS mode, so the browser does not reuse this preload and requests the file again when the text is laid out; add crossorigin`
      );
    }
    const opaque = preloads.filter(preload => preload.file === null).map(preload => preload.where);
    const subsets = covering.map(face => `${face.where} ${face.files.join(', ')}`).join('; ');
    const unread = opaque.length > 0 ? ` (font preloads whose href is not a literal were not matched: ${opaque.join(', ')})` : '';
    return [
      `${covering[0]?.where}: '${family}' is split by unicode-range and its ${script} subset (${subsets}) serves the app's locale '${declared.locale}' (${declared.where}), but no <link rel="preload" as="font"> loads it${unread} — the browser requests it only when ${script} text is first laid out, and the relayout when it arrives lands right before the screen is usable`,
    ];
  }

  private static locales(context: LawCheckContext, documents: Text[]): DeclaredLocale[] {
    const root = context.projectRoot;
    const buildConfigs = read(context, [
      ...glob.sync('angular.json', { cwd: root, absolute: true }),
      ...NxWorkspace.resolveSourceFiles(root, 'project.json'),
    ]);
    const ts = read(context, FileUtils.scanForFiles(root, context.config, ['.ts'], context.lawId, false)).filter(file => file.text.includes('LOCALE_ID'));
    const nextConfigs = read(context, glob.sync('**/next.config.{js,mjs,cjs,ts}', { cwd: root, absolute: true, ignore: ['**/node_modules/**'] }));
    return [
      ...documents.flatMap(htmlLang),
      ...patternLocales(buildConfigs, /"sourceLocale"\s*:\s*(?:"([^"]+)"|\{[^}]*?"code"\s*:\s*"([^"]+)")/g, 'i18n.sourceLocale'),
      ...patternLocales(ts, /provide\s*:\s*LOCALE_ID\s*,\s*useValue\s*:\s*['"`]([\w-]+)['"`]/g, 'LOCALE_ID'),
      ...patternLocales(nextConfigs, /defaultLocale\s*:\s*['"`]([\w-]+)['"`]/g, 'i18n.defaultLocale'),
    ];
  }

  private static hostingHeaders(context: LawCheckContext): Text[] {
    return read(context, HOSTING_HEADER_FILES.flatMap(name => NxWorkspace.resolveSourceFiles(context.projectRoot, name)));
  }

  private static nothing(context: LawCheckContext, why: string): LawResult {
    return markJudgedNothing(
      this.createResult(
        [`${why} — this law judged nothing. It was selected because a project file holds an @font-face with a unicode-range; if that file is under the ignores, or the faces are built at runtime, the law cannot see them`],
        this.LAW_NAME,
        'PERFORMANCE',
        [],
        context
      )
    );
  }
}
