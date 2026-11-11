/**
 * NextRouteHandlerGuarded (#217): each POST/PUT/PATCH/DELETE route handler
 * calls a configured guard (or is declared public with a reason), and one
 * that reads the body validates it.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextRouteHandlerGuardedLaw as Law } from '../../../src/checkers/next-laws/next-route-handler-guarded';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const CONFIG = { authGuards: ['requireUser', 'withAuth'], bodyValidators: ['parse'] };
const run = (files: Record<string, string>, next: Record<string, unknown> | null = CONFIG) =>
  Law.check(nextCtx(nextApp(files), next ?? undefined));
const ROUTE = 'src/app/api/posts/[id]/route.ts';

describe('NextRouteHandlerGuardedLaw — the guard rule', () => {
  it('red: a POST that calls no guard, named by route path', () => {
    const result = run({ [ROUTE]: 'export async function POST(request: Request) {\n  return Response.json({ ok: true });\n}\n' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/api\/posts\/\[id\]\/route\.ts:1: POST \/api\/posts\/\[id\] calls no guard/),
    ]);
  });

  it('green: a guard in the body, a guard wrapper, and GET is not judged', () => {
    const result = run({
      [ROUTE]: [
        'export async function GET() { return Response.json([]); }',
        'export async function DELETE(request: Request) { await requireUser(); return new Response(null); }',
        'export const PUT = withAuth(async (request: Request) => new Response(null));',
        'async function patch(request: Request) { await auth.requireUser(); return new Response(null); }',
        'export { patch as PATCH };',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('red: route groups and private folders shape the path; a private folder is no route', () => {
    const result = run({
      'src/app/(admin)/api/users/route.ts': 'export async function POST() { return new Response(null); }\n',
      'src/app/_lib/route.ts': 'export async function POST() { return new Response(null); }\n',
    });
    expect(result.violations).toEqual([expect.stringContaining('POST /api/users calls no guard')]);
  });

  it('green: a route declared public with a reason; red: a stale public entry', () => {
    const result = run(
      { 'src/app/api/webhooks/route.ts': 'export async function POST() { return new Response(null); }\n' },
      { ...CONFIG, publicRoutes: [{ route: '/api/webhooks', reason: 'signed webhook' }, { route: '/api/gone', reason: 'old' }] }
    );
    expect(result.violations).toEqual([expect.stringContaining("'/api/gone' is no route handler's path")]);
  });

  it('red: a public entry without a reason is not accepted', () => {
    const result = run(
      { 'src/app/api/webhooks/route.ts': 'export async function POST() { await requireUser(); return new Response(null); }\n' },
      { ...CONFIG, publicRoutes: [{ route: '/api/webhooks' }] }
    );
    expect(result.violations).toEqual([expect.stringContaining('publicRoutes[0] needs a non-empty route and a non-empty reason')]);
  });

  it('red: a re-exported handler cannot be read', () => {
    const result = run({ [ROUTE]: "export { POST } from '@/lib/handlers';\n" });
    expect(result.violations).toEqual([expect.stringContaining("is re-exported from '@/lib/handlers'")]);
  });
});

describe('NextRouteHandlerGuardedLaw — the body rule', () => {
  it('red: request.json() with no validator and no typeof', () => {
    const result = run({ [ROUTE]: 'export async function POST(request: Request) {\n  await requireUser();\n  const body = await request.json();\n  return Response.json(body);\n}\n' });
    expect(result.violations).toEqual([expect.stringContaining('reads the request body without a validator (parse)')]);
  });

  it('green: Schema.parse, or a typeof narrowing; the response json() is not a body read', () => {
    const result = run({
      [ROUTE]: [
        'export async function POST(request: Request) { await requireUser(); const input = Schema.parse(await request.json()); return Response.json(input); }',
        'export async function PUT(req: Request) { await requireUser(); const b = await req.formData(); if (typeof b.get("x") !== "string") return new Response(null, { status: 400 }); return new Response(null); }',
        'export async function PATCH(req: Request) { await requireUser(); const r = await fetch("https://x"); return Response.json(await r.json()); }',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('red: a public route still validates its body', () => {
    const result = run(
      { 'src/app/api/webhooks/route.ts': 'export async function POST(request: Request) { const e = await request.clone().json(); return Response.json(e); }\n' },
      { ...CONFIG, publicRoutes: [{ route: '/api/webhooks', reason: 'signed webhook' }] }
    );
    expect(result.violations).toEqual([expect.stringContaining('reads the request body')]);
  });
});

describe('NextRouteHandlerGuardedLaw — fail closed', () => {
  it('fails when mutating handlers exist and no authGuards is declared', () => {
    const result = run({ [ROUTE]: 'export async function POST() { await requireUser(); return new Response(null); }\n' }, null);
    expect(result.violations).toEqual([expect.stringMatching(/1 mutating route handler\(s\) \(POST \/api\/posts\/\[id\]\) and no thresholds\.next\.authGuards/)]);
  });

  it('fails when the parser cannot be loaded', () => {
    const root = nextApp({ [ROUTE]: 'export async function POST() { return new Response(null); }\n' });
    const result = withoutTypeScript(() => Law.check(nextCtx(root, CONFIG)));
    expect(result.violations).toEqual([expect.stringMatching(/^1 route file\(s\): could not load the 'typescript' package/)]);
  });

  it('control: app/ is used before src/app/ when both exist, as Next does', () => {
    const result = run({
      'app/api/a/route.ts': 'export async function POST() { return new Response(null); }\n',
      'src/app/api/b/route.ts': 'export async function POST() { return new Response(null); }\n',
    });
    expect(result.violations).toEqual([expect.stringContaining('POST /api/a calls no guard')]);
  });
});

describe('NextRouteHandlerGuardedLaw selection', () => {
  const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextRouteHandlerGuardedLaw.check');

  it('is selected where next is declared (also in a workspace app), not elsewhere', () => {
    expect(card?.defaultSeverity).toBe('error');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    const workspace = project({
      'package.json': JSON.stringify({ name: 'ws', workspaces: ['apps/*'] }),
      'apps/web/package.json': manifest({ next: '16.4.6' }),
    });
    expect(lawRequirementsMet(card?.requires, workspace)).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
  });
});
