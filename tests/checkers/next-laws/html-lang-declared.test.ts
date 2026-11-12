/**
 * HtmlLangDeclared (#232): the root layout's <html> has a non-empty lang; in
 * the Pages Router, _document's <Html> does, or i18n is configured. A root
 * layout that cannot be found is reported, never passed.
 */
import { HtmlLangDeclaredLaw as Law } from '../../../src/checkers/next-laws/html-lang-declared';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const layout = (html: string) => `export default function L({ children }) {\n  return ${html.replace('BODY', '<body>{children}</body>')};\n}`;

describe('HtmlLangDeclaredLaw — App Router (#232)', () => {
  it.each([
    ['no lang', '<html>BODY</html>', /src\/app\/layout\.tsx:2: <html> has no lang/],
    ['an empty lang', '<html lang="">BODY</html>', /<html> has an empty lang/],
    ['a spread and no lang', '<html {...props}>BODY</html>', /a \{\.\.\.spread\} may set it/],
  ])('red: %s', (_name, html, pattern) => {
    const result = Law.check(nextCtx({ 'src/app/layout.tsx': layout(html), 'src/app/page.tsx': PAGE }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(pattern)]);
  });

  it.each([
    ['a literal lang (control: the <html> is read)', '<html lang="en">BODY</html>'],
    ['lang from a [locale] param', '<html lang={locale}>BODY</html>'],
  ])('green: %s', (_name, html) => {
    expect(Law.check(nextCtx({ 'src/app/layout.tsx': layout(html), 'src/app/page.tsx': PAGE })).violations).toEqual([]);
  });

  it('checks every root layout under route groups, and global-error', () => {
    const result = Law.check(
      nextCtx({
        'src/app/layout.tsx': '',
        'src/app/(marketing)/layout.tsx': layout('<html lang="en">BODY</html>'),
        'src/app/(app)/layout.tsx': layout('<html>BODY</html>'),
        'src/app/(app)/page.tsx': PAGE,
        'src/app/global-error.tsx': "'use client';\nexport default function E() { return <html><body>x</body></html>; }",
      })
    );
    expect(result.violations).toEqual([
      expect.stringContaining('src/app/(app)/layout.tsx:2: <html> has no lang'),
      expect.stringContaining('src/app/global-error.tsx:2: <html> has no lang'),
    ]);
  });

  it('a root layout that renders <html> through another component is reported as not found', () => {
    const result = Law.check(
      nextCtx({
        'src/app/layout.tsx': "import { Shell } from './shell';\nexport default function L({ children }) { return <Shell>{children}</Shell>; }",
        'src/app/page.tsx': PAGE,
      })
    );
    expect(result.violations).toEqual([expect.stringContaining("src/app: no layout under this app directory renders <html>")]);
  });
});

describe('HtmlLangDeclaredLaw — Pages Router (#232)', () => {
  const DOCUMENT = (html: string) =>
    `import { Html, Head, Main, NextScript } from 'next/document';\nexport default function D() {\n  return ${html};\n}`;

  it('red: _document <Html> without lang', () => {
    const result = Law.check(nextCtx({ 'pages/_document.tsx': DOCUMENT('<Html><Head /><body><Main /><NextScript /></body></Html>'), 'pages/index.tsx': PAGE }));
    expect(result.violations).toEqual([expect.stringContaining('pages/_document.tsx:3: <Html> has no lang')]);
  });

  it('green: _document <Html lang>', () => {
    const result = Law.check(nextCtx({ 'pages/_document.tsx': DOCUMENT('<Html lang="en"><body /></Html>'), 'pages/index.tsx': PAGE }));
    expect(result.violations).toEqual([]);
  });

  it('red: no _document and no i18n; green once next.config configures i18n', () => {
    const files = { 'pages/index.tsx': PAGE };
    expect(Law.check(nextCtx(files)).violations).toEqual([expect.stringContaining('pages: no _document and no i18n in next.config')]);
    const withI18n = { ...files, 'next.config.js': "module.exports = { i18n: { locales: ['en'], defaultLocale: 'en' } };" };
    expect(Law.check(nextCtx(withI18n)).violations).toEqual([]);
  });
});
