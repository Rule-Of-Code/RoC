/**
 * NextOpenRedirectGuarded (#249): a redirect whose target comes from
 * searchParams or the request body, in the same function, without a guard.
 */
import { NextOpenRedirectGuardedLaw } from '../../../src/checkers/react-laws/next-open-redirect-guarded';
import { REACT_SECURITY_LAWS } from '../../../src/data/react-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const NEXT = { 'package.json': manifest({ next: '16.4.6', react: '19.3.0' }) };
const NAV = "import { redirect } from 'next/navigation';\n";
const SERVER = "import { NextResponse, type NextRequest } from 'next/server';\n";
const check = (file: string, code: string, overrides: Record<string, unknown> = {}) =>
  NextOpenRedirectGuardedLaw.check(ctx(project({ ...NEXT, [file]: code }), overrides));
const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];

describe('NextOpenRedirectGuarded (#249): red', () => {
  it('a page redirecting to a searchParams value, through a destructured local', () => {
    const code = `${NAV}export default async function Page({ searchParams }) {\n  const { next } = await searchParams;\n  redirect(next);\n}`;
    expect(violations(check('src/app/login/page.tsx', code))).toEqual([
      expect.stringMatching(/^src\/app\/login\/page\.tsx:4: redirect\(next\) sends the visitor to a target taken from the request/),
    ]);
  });

  it('a route handler: NextResponse.redirect(new URL(param, request.url))', () => {
    const code = `${SERVER}export function GET(request: NextRequest) {\n  const to = request.nextUrl.searchParams.get('to') ?? '/';\n  return NextResponse.redirect(new URL(to, request.url));\n}`;
    expect(violations(check('src/app/go/route.ts', code))).toEqual([expect.stringMatching(/route\.ts:4: NextResponse\.redirect/)]);
  });

  it('a Server Action redirecting to a FormData field', () => {
    const code = `'use server';\n${NAV}export async function signIn(formData: FormData) {\n  redirect(String(formData.get('next')));\n}`;
    expect(violations(check('src/app/actions.ts', code))).toHaveLength(1);
  });

  it('a POST body read with request.json()', () => {
    const code = `export async function POST(request: Request) {\n  const body = await request.json();\n  return Response.redirect(body.returnTo, 303);\n}`;
    expect(violations(check('src/app/api/r/route.ts', code))).toHaveLength(1);
  });

  it('an aliased import of redirect, and permanentRedirect', () => {
    const code = `import { redirect as go, permanentRedirect } from 'next/navigation';\nexport default function P({ searchParams }) {\n  if (searchParams.a) go(searchParams.a);\n  permanentRedirect(\`\${searchParams.b}\`);\n}`;
    expect(violations(check('src/app/p/page.tsx', code))).toHaveLength(2);
  });

  it('a template whose static start is only "/" (/${x} can become //evil.com)', () => {
    const code = `${NAV}export default function P({ searchParams }) { redirect(\`/\${searchParams.to}\`); }`;
    expect(violations(check('src/app/p/page.tsx', code))).toHaveLength(1);
  });
});

describe('NextOpenRedirectGuarded (#249): green', () => {
  it.each([
    ['a literal target', `${NAV}export default function P() { redirect('/dashboard'); }`],
    [
      'a fixed same-site path carrying the param',
      `${NAV}export default function P({ searchParams }) { redirect(\`/login?next=\${encodeURIComponent(searchParams.next)}\`); }`,
    ],
    [
      'the canonical proxy redirect built from request.url',
      `${SERVER}export function proxy(request: NextRequest) { return NextResponse.redirect(new URL('/home', request.url)); }`,
    ],
    [
      'new URL with a same-site path carrying the param (found on a real Next app)',
      `${SERVER}export function GET(request: NextRequest) {\n  const to = request.nextUrl.searchParams.get('to') ?? '/';\n  return NextResponse.redirect(new URL(\`/go?to=\${encodeURIComponent(to)}\`, request.url));\n}`,
    ],
    [
      'a target from somewhere other than the request',
      `${NAV}export default async function P() { const user = await getUser(); redirect(user.homePath); }`,
    ],
    [
      'a redirect that is not Next’s (a local function named redirect)',
      `function redirect(to: string) { return to; }\nexport default function P({ searchParams }) { redirect(searchParams.to); }`,
    ],
  ])('%s', (_label, code) => {
    expect(check('src/app/p/page.tsx', code).violations).toEqual([]);
  });

  it('a configured guard at the redirect, or in the declaration', () => {
    const config = { thresholds: { react: { redirectGuards: ['safeNext'] } } };
    const atCall = `${NAV}export default function P({ searchParams }) { redirect(safeNext(searchParams.next)); }`;
    const inDecl = `${NAV}export default function P({ searchParams }) { const to = safeNext(searchParams.next); redirect(to); }`;
    expect(check('src/app/p/page.tsx', atCall, config).violations).toEqual([]);
    expect(check('src/app/p/page.tsx', inDecl, config).violations).toEqual([]);
  });

  it('control: the same guarded file without the guard configured is red', () => {
    const atCall = `${NAV}export default function P({ searchParams }) { redirect(safeNext(searchParams.next)); }`;
    expect(check('src/app/p/page.tsx', atCall).passed).toBe(false);
  });
});

describe('NextOpenRedirectGuarded (#249): cannot read, and selection', () => {
  it('fails when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check('src/app/p/page.tsx', `${NAV}export default function P() { redirect('/x'); }`);
      expect(result.passed).toBe(false);
      expect(violations(result)).toEqual([expect.stringMatching(/could not load the 'typescript' package/)]);
    } finally {
      spy.mockRestore();
    }
  });

  it('is selected where next is declared, not on plain React, Angular or Python', () => {
    const card = REACT_SECURITY_LAWS.find(law => law.checkFunction === 'NextOpenRedirectGuardedLaw.check');
    expect(card?.requires).toEqual({ anyDependency: ['next'] });
    expect(card?.defaultSeverity).toBe('warning');
    expect(lawRequirementsMet(card?.requires, project(NEXT))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19.3.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': "[project]\nname = 'x'\n" }))).toBe(false);
  });
});
