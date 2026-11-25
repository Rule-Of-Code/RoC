/**
 * Primary Locale Font Preloaded reads documents without their comments (#636).
 *
 * A preload inside `<!-- -->` or `{/* *\/}` counted as a preload (false
 * PASS), a commented-out `<html lang>` counted as the app's locale, and a
 * `<style lang="scss">` block of a .vue file was read with the comment rules of
 * CSS, so its `//` lines were judged.
 */
import { PrimaryLocaleFontPreloadedLaw as Law } from '../../../src/checkers/client-deploy-laws/primary-locale-font-preloaded';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const face = (family: string, file: string, range: string): string[] => [
  '@font-face {',
  `  font-family: '${family}';`,
  `  src: url('/assets/fonts/${file}') format('woff2');`,
  `  unicode-range: ${range};`,
  '}',
];
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+2000-206F';
const CYRILLIC = 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116';

/** 'Body Sans' split into a Latin and a Cyrillic subset. */
const FONTS_CSS = [
  ...face('Body Sans', 'body-latin.woff2', LATIN),
  ...face('Body Sans', 'body-cyrillic.woff2', CYRILLIC),
].join('\n');

const PRELOAD =
  '<link rel="preload" as="font" href="/assets/fonts/body-cyrillic.woff2" crossorigin>';
const JSX_PRELOAD =
  '<link rel="preload" as="font" href="/assets/fonts/body-cyrillic.woff2" crossOrigin="" />';

const html = (lang: string, head = ''): string =>
  `<!doctype html>\n<html lang="${lang}">\n<head>\n${head}\n</head>\n<body></body>\n</html>`;

const layout = (head: string): string =>
  [
    'export default function RootLayout({ children }) {',
    '  return (',
    '    <html lang="bg">',
    `      <head>${head}</head>`,
    '      <body>{children}</body>',
    '    </html>',
    '  );',
    '}',
  ].join('\n');

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

describe('Primary Locale Font Preloaded: a commented-out preload is not a preload (#636)', () => {
  it('control: lang="bg" and no preload fails with one finding', () => {
    const result = run({ 'src/index.html': html('bg') });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it('control: a real preload of the Cyrillic file passes', () => {
    const result = run({ 'src/index.html': html('bg', PRELOAD) });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('the same preload inside <!-- --> fails', () => {
    const result = run({
      'src/index.html': html('bg', `<!-- ${PRELOAD} -->`),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining("serves the app's locale 'bg'"),
    ]);
  });

  it('a preload in a comment spanning lines fails; the finding keeps its line', () => {
    const result = run({
      'src/index.html': html('bg', `<!--\n  ${PRELOAD}\n-->`),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining('src/index.html:2 (<html lang="bg">)'),
    ]);
  });

  it('control: a real preload in JSX passes', () => {
    const result = run({ 'src/app/layout.tsx': layout(JSX_PRELOAD) });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('the same preload inside a JSX comment fails', () => {
    const result = run({
      'src/app/layout.tsx': layout(`{/* ${JSX_PRELOAD} */}`),
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining("serves the app's locale 'bg'"),
    ]);
  });
});

describe('Primary Locale Font Preloaded: a commented-out <html lang> is not a locale (#636)', () => {
  it('real lang="en", <html lang="bg"> only in an HTML comment: passes', () => {
    const result = run({
      'src/index.html': `<!-- <html lang="bg"> -->\n${html('en')}`,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('control: an uncommented <html lang="bg"> is still the locale', () => {
    const result = run({
      'src/index.html': `${html('bg')}\n<!-- <html lang="en"> -->`,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining("serves the app's locale 'bg'"),
    ]);
  });
});

describe('Primary Locale Font Preloaded: <style lang> sets the comment rules (#636)', () => {
  /** 'Other Sans', split, every line commented out with `//`. */
  const COMMENTED_FACES = [
    ...face('Other Sans', 'other-latin.woff2', LATIN),
    ...face('Other Sans', 'other-cyrillic.woff2', CYRILLIC),
  ]
    .map(line => `// ${line}`)
    .join('\n');

  it('.vue with <style lang="scss">, every @font-face line commented with //: not judged', () => {
    const result = run({
      'src/index.html': html('bg', PRELOAD),
      'src/App.vue': `<template><div /></template>\n<style lang="scss">\n${COMMENTED_FACES}\n</style>\n`,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('control: the same commented lines in a .scss file are not judged', () => {
    const result = run({
      'src/index.html': html('bg', PRELOAD),
      'src/styles/other.scss': COMMENTED_FACES,
    });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('control: a <style> block without lang keeps the CSS rules, so `//` is not a comment there', () => {
    const result = run({
      'src/index.html': html('bg', PRELOAD),
      'src/App.vue': `<template><div /></template>\n<style>\n${COMMENTED_FACES}\n</style>\n`,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining("'Other Sans' is split by unicode-range"),
    ]);
  });
});
