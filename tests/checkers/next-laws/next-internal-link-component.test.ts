/**
 * NextInternalLinkComponent (#233): a literal root-relative <a href> that
 * matches a page of the app is flagged; a reason (inline or in config) lets
 * it stand; links that are not page navigations of this tab are not judged.
 */
import { NextInternalLinkComponentLaw as Law } from '../../../src/checkers/next-laws/next-internal-link-component';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const ROUTES = {
  'src/app/page.tsx': PAGE,
  'src/app/pricing/page.tsx': PAGE,
  'src/app/blog/[slug]/page.tsx': PAGE,
  'src/app/docs/[[...path]]/page.tsx': PAGE,
  'src/app/api/export/route.ts': 'export function GET() {}',
};
const nav = (body: string, fullReloadLinks?: unknown) =>
  Law.check(
    nextCtx(
      { ...ROUTES, 'src/app/nav.tsx': `export function Nav() {\n  return (\n    <nav>\n      ${body}\n    </nav>\n  );\n}` },
      fullReloadLinks ? { fullReloadLinks } : {}
    )
  );

describe('NextInternalLinkComponentLaw (#233)', () => {
  it.each([
    ['a static page', '<a href="/pricing">Pricing</a>', '/pricing'],
    ['the home page', '<a href="/">Home</a>', '/'],
    ['a dynamic segment', '<a href="/blog/hello?ref=nav#top">Post</a>', '/blog/hello'],
    ['an optional catch-all', '<a href="/docs">Docs</a>', '/docs'],
    ['a trailing slash', '<a href="/pricing/">Pricing</a>', '/pricing'],
  ])('red: %s', (_name, body, path) => {
    const result = nav(body);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(`src/app/nav.tsx:4: <a href="${path}"> links to a page of this app`)]);
  });

  it.each([
    ['a route handler', '<a href="/api/export">CSV</a>'],
    ['a static file', '<a href="/brochure.pdf">PDF</a>'],
    ['an external URL', '<a href="https://example.com/pricing">x</a>'],
    ['a protocol-relative URL', '<a href="//cdn.example.com/pricing">x</a>'],
    ['a computed href', '<a href={url}>x</a>'],
    ['a download', '<a href="/pricing" download>x</a>'],
    ['a new tab', '<a href="/pricing" target="_blank" rel="noreferrer">x</a>'],
    ['a dynamic segment with too many parts', '<a href="/blog/a/b">x</a>'],
  ])('green: %s', (_name, body) => {
    expect(nav(body).violations).toEqual([]);
  });

  it('green: an inline reason before the link (control: red without it)', () => {
    expect(nav('<a href="/pricing">x</a>').passed).toBe(false);
    expect(nav('{/* roc-allow-full-reload: resets client state after sign-out */}\n      <a href="/pricing">x</a>').violations).toEqual([]);
  });

  it('a marker without a reason does not count', () => {
    expect(nav('{/* roc-allow-full-reload: */}\n      <a href="/pricing">x</a>').passed).toBe(false);
  });

  it('config: a listed path with a reason passes; one without a reason is reported', () => {
    expect(nav('<a href="/pricing">x</a>', [{ path: '/pricing', reason: 'A/B test needs a full load' }]).violations).toEqual([]);
    const result = nav('<a href="/pricing">x</a>', [{ path: '/pricing' }]);
    expect(result.violations).toEqual([
      expect.stringContaining('thresholds.next.fullReloadLinks[0] (/pricing): no reason given'),
      expect.stringContaining('<a href="/pricing">'),
    ]);
  });

  it('reads Pages Router routes too', () => {
    const jsx = Law.check(nextCtx({ 'pages/about.tsx': PAGE, 'pages/index.tsx': 'export default () => <a href="/about">About</a>;' }));
    expect(jsx.violations).toEqual([expect.stringContaining('pages/index.tsx:1: <a href="/about">')]);
  });
});
