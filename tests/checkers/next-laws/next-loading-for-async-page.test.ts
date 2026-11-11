/**
 * NextLoadingForAsyncPage (#243): an async page with no loading file in its
 * segment or above and no <Suspense> in the page is listed; a sync page is not.
 */
import { NextLoadingForAsyncPageLaw as Law } from '../../../src/checkers/next-laws/next-loading-for-async-page';
import { removeProjects } from '../toolkit-fixture';
import { nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const ASYNC_PAGE = 'export default async function Orders() { const o = await load(); return <ul>{o}</ul>; }';
const LOADING = 'export default function Loading() { return <p>Loading…</p>; }';

describe('NextLoadingForAsyncPageLaw (#243)', () => {
  it.each([
    ['an async function declaration', ASYNC_PAGE],
    ['an async arrow', 'const Orders = async () => <ul />;\nexport default Orders;'],
    ['a named async function exported by name', 'async function Orders() { return <ul />; }\nexport default Orders;'],
  ])('red: %s with no boundary', (_name, content) => {
    const result = Law.check(nextCtx({ 'src/app/dashboard/orders/page.tsx': content }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringContaining('src/app/dashboard/orders/page.tsx (/dashboard/orders): async page with no loading file'),
    ]);
  });

  it.each([
    ['loading beside the page', 'src/app/dashboard/orders/loading.tsx'],
    ['loading in a parent segment', 'src/app/dashboard/loading.tsx'],
    ['loading in a route group above', 'src/app/loading.tsx'],
  ])('green: %s (control: red without it)', (_name, loadingFile) => {
    const files = { 'src/app/dashboard/orders/page.tsx': ASYNC_PAGE };
    expect(Law.check(nextCtx(files)).passed).toBe(false);
    expect(Law.check(nextCtx({ ...files, [loadingFile]: LOADING })).violations).toEqual([]);
  });

  it('a loading file in a sibling segment does not cover the page', () => {
    const result = Law.check(nextCtx({ 'src/app/dashboard/orders/page.tsx': ASYNC_PAGE, 'src/app/settings/loading.tsx': LOADING }));
    expect(result.passed).toBe(false);
  });

  it.each([
    ['Suspense by name', "import { Suspense } from 'react';\nexport default async function P() { return <Suspense fallback={null}><Orders /></Suspense>; }"],
    ['React.Suspense', "import React from 'react';\nexport default async function P() { return <React.Suspense fallback={null}><Orders /></React.Suspense>; }"],
  ])('green: %s in the page', (_name, content) => {
    expect(Law.check(nextCtx({ 'src/app/orders/page.tsx': content })).violations).toEqual([]);
  });

  it('a <Suspense> that is not React’s does not count, and a sync page is not listed', () => {
    const fake = "import { Suspense } from './ui';\nexport default async function P() { return <Suspense />; }";
    expect(Law.check(nextCtx({ 'src/app/orders/page.tsx': fake })).passed).toBe(false);
    expect(Law.check(nextCtx({ 'src/app/orders/page.tsx': PAGE })).violations).toEqual([]);
  });
});
