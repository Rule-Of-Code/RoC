/**
 * NextSegmentConfigConsistent (#242): force-static or a positive revalidate
 * in a segment that calls cookies()/headers() from next/headers fails; either
 * alone passes; a look-alike `cookies` from elsewhere is not next/headers.
 */
import { NextSegmentConfigConsistentLaw as Law } from '../../../src/checkers/next-laws/next-segment-config-consistent';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { nextCtx } from './next-fixture';

afterAll(removeProjects);

const READS = "import { cookies } from 'next/headers';\nexport default async function P() {\n  const c = await cookies();\n  return <p>{c.get('x')?.value}</p>;\n}";

describe('NextSegmentConfigConsistentLaw (#242)', () => {
  it.each([
    ["dynamic = 'force-static'", "export const dynamic = 'force-static';", "exports dynamic = 'force-static' — without Cache Components force-static makes cookies() return empty values"],
    ['revalidate = 60', 'export const revalidate = 60;', 'exports revalidate = 60 — reading cookies() renders the route per request'],
  ])('red: %s with cookies()', (_name, exportLine, fragment) => {
    const result = Law.check(nextCtx({ 'src/app/account/page.tsx': `${exportLine}\n${READS}` }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining(`src/app/account/page.tsx:4: calls cookies() but ${fragment}`)]);
  });

  it('red: headers() through a namespace import in a route handler', () => {
    const result = Law.check(
      nextCtx({ 'src/app/api/me/route.ts': "import * as h from 'next/headers';\nexport const dynamic = 'force-static';\nexport async function GET() { const x = await h.headers(); return Response.json({}); }" })
    );
    expect(result.violations).toEqual([expect.stringContaining('route.ts:3: calls headers() but exports')]);
  });

  it.each([
    ['cookies() alone', READS],
    ['force-static alone', "export const dynamic = 'force-static';\nexport default function P() { return null; }"],
    ['revalidate = 0 with cookies()', `export const revalidate = 0;\n${READS}`],
    ["force-dynamic with cookies()", `export const dynamic = 'force-dynamic';\n${READS}`],
    ['a cookies() that is not next/headers', "import { cookies } from './jar';\nexport const revalidate = 60;\nexport default function P() { cookies(); return null; }"],
  ])('green: %s', (_name, content) => {
    expect(Law.check(nextCtx({ 'src/app/account/page.tsx': content })).violations).toEqual([]);
  });

  it('a non-segment module under app/ is not judged', () => {
    expect(Law.check(nextCtx({ 'src/app/account/helpers.tsx': `export const dynamic = 'force-static';\n${READS}` })).violations).toEqual([]);
  });

  it('without an app/ directory it passes and says segment config does not exist here', () => {
    const result = Law.check(ctx(project({ 'package.json': manifest({ next: '16.4.6' }), 'pages/index.tsx': 'export default () => null;' })));
    expect(result.passed).toBe(true);
    expect(result.message).toContain('route segment config exists only in the App Router');
  });
});
