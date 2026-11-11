/**
 * ClientFetchResponseChecked (#240): a fetch in client code reads res.ok or
 * res.status, or sits inside a catch.
 */
import { ClientFetchResponseCheckedLaw } from '../../../src/checkers/react-laws/client-fetch-response-checked';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, NEXT_DEPS, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ClientFetchResponseCheckedLaw;
const wrap = (body: string): string =>
  ["import { useState } from 'react';", 'export async function load(url: string, setData: (d: unknown) => void) {', body, '}'].join('\n');
const check = (body: string) => run(law, { 'src/load.ts': wrap(body) });

describe('ClientFetchResponseCheckedLaw (#240) — red', () => {
  it.each([
    ['straight to json', '  const res = await fetch(url);\n  setData(await res.json());'],
    ['a then chain without a status read', '  fetch(url).then(r => r.json()).then(setData);'],
    ['fire and forget', "  await fetch(url, { method: 'POST' });"],
    ['window.fetch', '  const res = await window.fetch(url);\n  setData(await res.json());'],
    ['a status read on a different response', '  const res = await fetch(url);\n  const other = await fetch(url);\n  if (!other.ok) return;\n  setData(await res.json());'],
  ])('%s', (_name, body) => {
    const result = check(body);
    expect(result.passed).toBe(false);
    expect(result.violations?.[0]).toMatch(/^src\/load\.ts:3: fetch response used without reading res\.ok or res\.status, and no catch around it/);
  });

  it('a try block in an OUTER function does not catch an async inner call', () => {
    const body = '  try {\n    const later = async () => { const r = await fetch(url); setData(await r.json()); };\n    void later;\n  } catch {}';
    expect(check(body).violations).toHaveLength(1);
  });
});

describe('ClientFetchResponseCheckedLaw (#240) — green', () => {
  it.each([
    ['res.ok checked', '  const res = await fetch(url);\n  if (!res.ok) throw new Error(String(res.status));\n  setData(await res.json());'],
    ['res.status checked', '  const res = await fetch(url);\n  if (res.status !== 200) return;\n  setData(await res.json());'],
    ['ok destructured', '  const { ok, json } = await fetch(url);\n  if (ok) setData(await json());'],
    ['ok read in the then callback', '  fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setData);'],
    ['inside a try with a catch (as the issue states)', '  try {\n    const res = await fetch(url);\n    setData(await res.json());\n  } catch (e) { setData(null); }'],
    ['a .catch on the chain', '  fetch(url).then(r => r.json()).then(setData).catch(() => setData(null));'],
    ['a rejection handler on then', '  fetch(url).then(r => r.json(), () => null);'],
    ['a returned fetch is a wrapper the callers receive', '  return fetch(url);'],
    ['a fetch in a comment or a string is not code', "  // const r = await fetch(url);\n  const s = 'fetch(url)';"],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it('server code of a Next app (no use client) is not client code', () => {
    const file = 'export default async function Page() { const r = await fetch("https://x"); return r.json(); }\n';
    const ok = run(law, { 'src/app/page.tsx': file }, NEXT_DEPS);
    expect(ok.violations).toEqual([]);
  });

  it("a 'use client' file in a Next app IS client code", () => {
    const file = "'use client';\nexport async function go(u: string) { const r = await fetch(u); return (await r.json()) as unknown; }\n";
    expect(run(law, { 'src/app/go.ts': file }, NEXT_DEPS).violations).toEqual([
      expect.stringContaining('src/app/go.ts:2: fetch response used'),
    ]);
  });

  it('a Next app in a workspace package scopes the server rule to that package', () => {
    const server = 'export async function GET() { const r = await fetch("https://x"); const d = await r.json(); return d; }\n';
    const result = law.check(
      ctx(
        project({
          'package.json': manifest({}),
          'apps/web/package.json': manifest(NEXT_DEPS),
          'apps/web/src/app/route.ts': server,
          'apps/spa/package.json': manifest(REACT_DEPS),
          'apps/spa/src/load.ts': server,
        })
      )
    );
    expect(result.violations).toEqual([expect.stringContaining('apps/spa/src/load.ts:1')]);
  });
});

describeFailsClosed('ClientFetchResponseCheckedLaw', law, REACT_DEPS);
describeSelection('ClientFetchResponseCheckedLaw.check', REACT_DEPS);
