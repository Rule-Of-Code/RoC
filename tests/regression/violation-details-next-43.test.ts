/**
 * #43, package 6 (react / next) — the Next laws whose violation line is a count
 * with a list cut to five name every artefact in `violationDetails`, at its
 * place. The violation lines are unchanged; six artefacts each, so the line
 * says "… and 1 more" and the details carry all six.
 */
import { ClientIpSingleBoundaryLaw } from '../../src/checkers/next-laws/client-ip-single-boundary';
import { NextPublicEnvIsBuildTimeLaw } from '../../src/checkers/next-laws/next-public-env-is-build-time';
import { NextRouteHandlerGuardedLaw } from '../../src/checkers/next-laws/next-route-handler-guarded';
import { NextServerActionAuthorizesLaw } from '../../src/checkers/next-laws/next-server-action-authorizes';
import type { ViolationDetail } from '../../src/types/law.types';
import { removeProjects } from '../checkers/toolkit-fixture';
import { nextApp, nextCtx } from '../checkers/next-laws/next-server-fixture';

afterAll(removeProjects);

const SIX = [1, 2, 3, 4, 5, 6];
const places = (details: ViolationDetail[] | undefined): string[] =>
  (details ?? []).map(d => `${d.file}:${d.line ?? '-'} ${d.message}`);

describe('#43 package 6: Next laws name every artefact they counted', () => {
  it('Client IP Single Boundary: each read, with nothing declared', () => {
    const files = Object.fromEntries(
      SIX.map(n => [
        `src/lib/ip${n}.ts`,
        `export const ip${n} = (h: Headers) => h.get('x-real-ip');\n`,
      ])
    );
    const result = ClientIpSingleBoundaryLaw.check(nextCtx(nextApp(files)));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^client IP headers are read in 6 module\(s\) \(src\/lib\/ip1\.ts:1, .* … and 1 more\) and no thresholds\.clientIp\.module is declared/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      SIX.map(
        n =>
          `src/lib/ip${n}.ts:1 reads 'x-real-ip' — no thresholds.clientIp.module is declared`
      )
    );
  });

  it('Next Route Handler Guarded: each mutating handler, with no guard declared', () => {
    const files = Object.fromEntries(
      SIX.map(n => [
        `src/app/api/r${n}/route.ts`,
        'export async function POST() {\n  return new Response(null);\n}\n',
      ])
    );
    const result = NextRouteHandlerGuardedLaw.check(nextCtx(nextApp(files)));
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^6 mutating route handler\(s\) \(POST \/api\/r1, .* … and 1 more\) and no thresholds\.next\.authGuards/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      SIX.map(
        n =>
          `src/app/api/r${n}/route.ts:1 POST /api/r${n}: mutating route handler — no thresholds.next.authGuards is declared`
      )
    );
  });

  it('Next Server Action Authorizes: each action, with no guard declared', () => {
    const actions = [
      "'use server';",
      ...SIX.map(n => `export async function act${n}() { return ${n}; }`),
    ].join('\n');
    const result = NextServerActionAuthorizesLaw.check(
      nextCtx(nextApp({ 'src/app/actions.ts': `${actions}\n` }))
    );
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^6 Server Action\(s\) \(src\/app\/actions\.ts:2 act1, .* … and 1 more\) and no thresholds\.next\.authGuards/
      ),
    ]);
    expect(places(result.violationDetails)).toEqual(
      SIX.map(
        n =>
          `src/app/actions.ts:${n + 1} Server Action 'act${n}' — no thresholds.next.authGuards is declared`
      )
    );
  });

  it('Next Public Env Is Build Time: each variable read with no build here, and each one a Dockerfile build lacks', () => {
    const page = `export default function Page() { return <p>{${SIX.map(n => `process.env.NEXT_PUBLIC_V${n}`).join(' + ')}}</p>; }\n`;
    const noBuild = NextPublicEnvIsBuildTimeLaw.check(
      nextCtx(nextApp({ 'src/app/page.tsx': page }))
    );
    expect(noBuild.violations).toEqual([
      expect.stringMatching(
        /^6 NEXT_PUBLIC_ variable\(s\) are read \(NEXT_PUBLIC_V1 at src\/app\/page\.tsx:1, .* … and 1 more\) and no Dockerfile or CI file here runs next build/
      ),
    ]);
    expect(places(noBuild.violationDetails)).toEqual(
      SIX.map(
        n =>
          `src/app/page.tsx:1 NEXT_PUBLIC_V${n} is read — no Dockerfile or CI file here runs next build`
      )
    );

    const dockerfile = [
      'FROM node:22 AS builder', //   1
      'ARG NEXT_PUBLIC_V1', //        2
      'ARG NEXT_PUBLIC_V2', //        3
      'ARG NEXT_PUBLIC_V3', //        4
      'ARG NEXT_PUBLIC_V4', //        5
      'RUN npx next build', //        6
    ].join('\n');
    const lacking = NextPublicEnvIsBuildTimeLaw.check(
      nextCtx(nextApp({ 'src/app/page.tsx': page, Dockerfile: dockerfile }))
    );
    expect(lacking.violations).toEqual([
      expect.stringMatching(
        /^Dockerfile:6: builds Next without NEXT_PUBLIC_V5, NEXT_PUBLIC_V6 — /
      ),
    ]);
    expect(places(lacking.violationDetails)).toEqual([
      'Dockerfile:6 NEXT_PUBLIC_V5: not declared before this build (read at src/app/page.tsx:1) — inlined as undefined',
      'Dockerfile:6 NEXT_PUBLIC_V6: not declared before this build (read at src/app/page.tsx:1) — inlined as undefined',
    ]);
  });
});
