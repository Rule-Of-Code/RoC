/**
 * NextMetadataDeclared (#226): a page is titled by its own metadata or by a
 * layout above it (Next merges metadata down the tree); a private route can
 * be listed; the Pages Router is read through next/head.
 */
import { NextMetadataDeclaredLaw as Law } from '../../../src/checkers/next-laws/next-metadata-declared';
import { ctx, project, removeProjects } from '../toolkit-fixture';
import { NEXT_MANIFEST, nextApp, nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const UNTITLED_LAYOUT = 'export default function L({ children }) { return <html lang="en"><body>{children}</body></html>; }';

describe('NextMetadataDeclaredLaw — App Router (#226)', () => {
  it('green: the root layout title covers a nested page (control: the page is found)', () => {
    const context = nextCtx({ 'src/app/blog/[slug]/page.tsx': PAGE });
    expect(Law.check(context).violations).toEqual([]);
    expect(Law.check(context).message).toContain('compliance verified');
  });

  it('red: no metadata in the page or any layout', () => {
    const result = Law.check(
      nextCtx({ 'src/app/layout.tsx': UNTITLED_LAYOUT, 'src/app/(shop)/cart/page.tsx': PAGE })
    );
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/\(shop\)\/cart\/page\.tsx \(\/cart\): no `metadata` or `generateMetadata`/),
    ]);
  });

  it('red: metadata declared but no title anywhere in the chain', () => {
    const result = Law.check(
      nextCtx({
        'src/app/layout.tsx': UNTITLED_LAYOUT,
        'src/app/page.tsx': `export const metadata = { description: 'x' };\n${PAGE}`,
      })
    );
    expect(result.violations).toEqual([expect.stringContaining('metadata is declared, but neither the page nor any layout above it gives a title')]);
  });

  it.each([
    ['metadata with a title', "export const metadata: Metadata = { title: 'Cart' };"],
    ['generateMetadata', 'export async function generateMetadata() { return { title: "x" }; }'],
    ['metadata satisfies', "export const metadata = { title: 'x' } satisfies Metadata;"],
    ['metadata from a variable', 'const m = build();\nexport const metadata = m;'],
    ['re-exported metadata', "export { metadata } from './meta';"],
  ])('green: page with %s', (_name, line) => {
    const result = Law.check(nextCtx({ 'src/app/layout.tsx': UNTITLED_LAYOUT, 'src/app/cart/page.tsx': `${line}\n${PAGE}` }));
    expect(result.violations).toEqual([]);
  });

  it('green: an intermediate layout title covers the pages below it', () => {
    const result = Law.check(
      nextCtx({
        'src/app/layout.tsx': UNTITLED_LAYOUT,
        'src/app/admin/layout.tsx': "export const metadata = { title: 'Admin' };\nexport default function A({ children }) { return children; }",
        'src/app/admin/users/page.tsx': PAGE,
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('a private folder is not routed, and a listed route is exempt', () => {
    const files = {
      'src/app/layout.tsx': UNTITLED_LAYOUT,
      'src/app/_drafts/page.tsx': PAGE,
      'src/app/internal/health/page.tsx': PAGE,
    };
    expect(Law.check(nextCtx(files)).violations).toEqual([expect.stringContaining('(/internal/health)')]);
    expect(Law.check(nextCtx(files, { metadataExemptRoutes: ['/internal/**'] })).violations).toEqual([]);
  });

  it('an app directory with no page passes and says there is nothing to title', () => {
    const result = Law.check(ctx(nextApp({})));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('there is no page to title');
  });

  it('fails closed when next is declared but there is no router directory', () => {
    const bare = Law.check(ctx(project({ 'package.json': NEXT_MANIFEST, 'lib/x.ts': 'export const x = 1;' })));
    expect(bare.passed).toBe(false);
    expect(bare.violations).toEqual([expect.stringContaining('no app/, src/app/, pages/ or src/pages/ directory')]);
  });
});

describe('NextMetadataDeclaredLaw — Pages Router (#226)', () => {
  const HEAD_PAGE = "import Head from 'next/head';\nexport default function P() { return <><Head><title>About</title></Head><main /></>; }";

  it('red: a page with no next/head title', () => {
    const result = Law.check(nextCtx({ 'pages/about.tsx': PAGE }));
    expect(result.violations).toEqual([expect.stringContaining('pages/about.tsx (/about): no <title> inside next/head')]);
  });

  it('green: the page renders <Head><title>', () => {
    expect(Law.check(nextCtx({ 'pages/about.tsx': HEAD_PAGE })).violations).toEqual([]);
  });

  it('green: _app renders the title; api routes and _document are not pages', () => {
    const result = Law.check(
      nextCtx({
        'pages/_app.tsx': "import Head from 'next/head';\nexport default function App({ Component }) { return <><Head><title>Site</title></Head><Component /></>; }",
        'pages/index.tsx': PAGE,
        'pages/api/hello.ts': 'export default function handler() {}',
      })
    );
    expect(result.violations).toEqual([]);
  });

  it('a <title> outside next/head does not count', () => {
    const result = Law.check(nextCtx({ 'pages/index.tsx': 'export default function P() { return <title>x</title>; }' }));
    expect(result.violations).toEqual([expect.stringContaining('pages/index.tsx (/)')]);
  });
});
