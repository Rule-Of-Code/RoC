/**
 * Primary Locale Font Preloaded (#359): a family split by unicode-range, the
 * app's default locale, and a <link rel="preload" as="font"> for the subset
 * that covers the locale's script.
 */
import { PrimaryLocaleFontPreloadedLaw as Law } from '../../../src/checkers/client-deploy-laws/primary-locale-font-preloaded';
import {
  parseUnicodeRange,
  rangeCovers,
  scriptOfLocale,
} from '../../../src/utils/performance/font-subsets';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const FONTS_CSS = [
  '/* latin */',
  '@font-face {',
  "  font-family: 'Body Sans';",
  "  src: url('/assets/fonts/body-latin.woff2') format('woff2');",
  '  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F;',
  '}',
  '/* cyrillic */',
  '@font-face {',
  "  font-family: 'Body Sans';",
  "  src: url('/assets/fonts/body-cyrillic.woff2') format('woff2');",
  '  unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;',
  '}',
  '/* cyrillic-ext */',
  '@font-face {',
  "  font-family: 'Body Sans';",
  "  src: url('/assets/fonts/body-cyrillic-ext.woff2') format('woff2');",
  '  unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F;',
  '}',
].join('\n');

const index = (lang: string, head = ''): string =>
  `<!doctype html>\n<html lang="${lang}">\n<head>\n  <link rel="preconnect" href="https://api.example.test">\n${head}\n</head>\n<body></body>\n</html>`;

const run = (files: Record<string, string>) =>
  Law.check(
    ctx(
      project({
        'package.json': manifest({ '@angular/core': '20.0.0' }),
        'src/styles/fonts.css': FONTS_CSS,
        ...files,
      })
    )
  );

describe('PrimaryLocaleFontPreloadedLaw', () => {
  it('red: Latin + Cyrillic subsets, lang="bg", no preload — one finding at the Cyrillic face', () => {
    const result = run({ 'src/index.html': index('bg') });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    const [finding] = result.violations ?? [];
    expect(finding).toMatch(
      /^src\/styles\/fonts\.css:8: 'Body Sans' is split by unicode-range and its Cyrillic subset \(src\/styles\/fonts\.css:8 body-cyrillic\.woff2\)/
    );
    expect(finding).toContain(
      "serves the app's locale 'bg' (src/index.html:2 (<html lang=\"bg\">))"
    );
    expect(finding).not.toContain('body-cyrillic-ext.woff2'); // no Bulgarian letter in the extended subset
  });

  it('green: the same with a preload of the Cyrillic subset (attributes in any order)', () => {
    const head =
      '  <link crossorigin href="/assets/fonts/body-cyrillic.woff2" as="font" type="font/woff2" rel="preload">';
    const result = run({ 'src/index.html': index('bg', head) });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('green: lang="en" — a Latin locale gives no finding', () => {
    const result = run({ 'src/index.html': index('en') });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('red: a preload of the wrong subset (Latin) does not count', () => {
    const head =
      '  <link rel="preload" as="font" href="/assets/fonts/body-latin.woff2" crossorigin>';
    expect(run({ 'src/index.html': index('ru', head) }).violations).toEqual([
      expect.stringContaining("serves the app's locale 'ru'"),
    ]);
  });

  it('red: a preload without crossorigin is not reused for the font — reported at the link', () => {
    const head =
      '  <link rel="preload" as="font" href="/assets/fonts/body-cyrillic.woff2">';
    expect(run({ 'src/index.html': index('bg', head) }).violations).toEqual([
      expect.stringMatching(
        /^src\/index\.html:5: the font preload of body-cyrillic\.woff2 .* has no crossorigin attribute/
      ),
    ]);
  });

  it('the locale can come from Angular i18n.sourceLocale or a LOCALE_ID provider', () => {
    const angularJson = JSON.stringify(
      {
        projects: {
          app: { i18n: { sourceLocale: { code: 'uk', baseHref: '' } } },
        },
      },
      null,
      2
    );
    expect(
      run({
        'angular.json': angularJson,
        'src/index.html': '<html><head></head></html>',
      }).violations
    ).toEqual([
      expect.stringContaining(
        "locale 'uk' (angular.json:5 (i18n.sourceLocale))"
      ),
    ]);
    const config =
      "import { LOCALE_ID } from '@angular/core';\nexport const appConfig = { providers: [{ provide: LOCALE_ID, useValue: 'sr-Latn' }] };";
    expect(
      run({
        'src/app/app.config.ts': config,
        'src/index.html': '<html><head></head></html>',
      }).violations
    ).toEqual([]);
  });

  it('a Link preload header in the hosting config counts', () => {
    const firebase = JSON.stringify({
      hosting: {
        headers: [
          {
            source: '/',
            headers: [
              {
                key: 'Link',
                value:
                  '</assets/fonts/body-cyrillic.woff2>; rel=preload; as=font; crossorigin',
              },
            ],
          },
        ],
      },
    });
    expect(
      run({ 'src/index.html': index('bg'), 'firebase.json': firebase })
        .violations
    ).toEqual([]);
  });

  it('judged nothing: no family split by unicode-range', () => {
    const result = Law.check(
      ctx(
        project({
          'src/index.html': index('bg'),
          'src/a.css': '@font-face { font-family: X; src: url(x.woff2); }',
        })
      )
    );
    expect(result.judgedNothing).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0);
  });

  it('judged nothing: a split family but no declared locale, or one the table does not know', () => {
    expect(
      run({ 'src/index.html': '<html><head></head></html>' }).judgedNothing
    ).toBe(true);
    expect(run({ 'src/index.html': index('ja') }).violations?.[0]).toContain(
      'the declared locale(s) ja at src/index.html:2'
    );
  });
});

describe('font-subsets tables', () => {
  it('locale → script, with the script subtag winning', () => {
    expect(scriptOfLocale('bg-BG')).toBe('Cyrillic');
    expect(scriptOfLocale('el')).toBe('Greek');
    expect(scriptOfLocale('sr')).toBe('Cyrillic');
    expect(scriptOfLocale('sr-Latn-RS')).toBe('Latin');
    expect(scriptOfLocale('uz_Cyrl')).toBe('Cyrillic');
    expect(scriptOfLocale('en-US')).toBe('Latin');
    expect(scriptOfLocale('ja')).toBeNull();
  });

  it('unicode-range → covered script by basic letters; wildcards; unreadable parts', () => {
    expect(
      rangeCovers(parseUnicodeRange('U+0400-045F') ?? [], 'Cyrillic')
    ).toBe(true);
    expect(
      rangeCovers(parseUnicodeRange('U+0460-052F') ?? [], 'Cyrillic')
    ).toBe(false);
    expect(rangeCovers(parseUnicodeRange('U+04??') ?? [], 'Cyrillic')).toBe(
      true
    );
    expect(rangeCovers(parseUnicodeRange('U+0370-03FF') ?? [], 'Greek')).toBe(
      true
    );
    expect(parseUnicodeRange('$cyrillic-range')).toBeNull();
  });
});
