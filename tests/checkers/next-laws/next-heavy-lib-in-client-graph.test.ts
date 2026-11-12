/**
 * NextHeavyLibInClientGraph (#227): a heavy library imported statically by a
 * module that ships to the browser — reached from a 'use client' entry
 * through relative imports and the `@/*` alias — fails; next/dynamic,
 * React.lazy and import() pass; a server-only import passes; an alias that
 * does not resolve is reported, never passed over.
 */
import { NextHeavyLibInClientGraphLaw as Law } from '../../../src/checkers/next-laws/next-heavy-lib-in-client-graph';
import { ctx, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, PAGE } from './next-fixture';

afterAll(removeProjects);

const CLOCK = "'use client';\nimport { format } from '@/lib/dates';\nexport function Clock() { return <span>{format()}</span>; }";
const DATES = "import moment from 'moment';\nexport const format = () => moment().format();";

describe('NextHeavyLibInClientGraphLaw (#227)', () => {
  it('red: reached through the @/* alias from a client entry, with the chain', () => {
    const result = Law.check(nextCtx({ 'src/app/page.tsx': PAGE, 'src/components/clock.tsx': CLOCK, 'src/lib/dates.ts': DATES }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      "src/lib/dates.ts:1: imports 'moment' statically, and this module ships to the browser (src/components/clock.tsx → src/lib/dates.ts) — load it with next/dynamic or import()",
    ]);
  });

  it('red: through a relative import, a re-export and an index file', () => {
    const result = Law.check(
      nextCtx({
        'src/components/chart.tsx': "'use client';\nimport { Bar } from '../charts';\nexport const C = () => <Bar />;",
        'src/charts/index.ts': "export { Bar } from './bar';",
        // Chart is used as a value: an import nothing uses is erased by the compiler (#316).
        'src/charts/bar.tsx': "import { Chart } from 'chart.js/auto';\nexport const Bar = () => String(Chart);",
      })
    );
    expect(result.violations).toEqual([expect.stringContaining("src/charts/bar.tsx:1: imports 'chart.js/auto' statically")]);
  });

  it('green: the same library imported by a Server Component only (control: the client module is walked)', () => {
    const result = Law.check(
      nextCtx({
        'src/app/page.tsx': "import moment from 'moment';\nimport { Clock } from '@/components/clock';\nexport default function P() { return <Clock now={moment().toISOString()} />; }",
        'src/components/clock.tsx': "'use client';\nimport debounce from 'lodash/debounce';\nexport function Clock() { return null; }",
      })
    );
    expect(result.violations).toEqual([]);
    expect(result.message).toContain('compliance verified');
  });

  it.each([
    ['next/dynamic', "'use client';\nimport dynamic from 'next/dynamic';\nconst Chart = dynamic(() => import('./chart'));\nexport const D = () => <Chart />;"],
    ['React.lazy', "'use client';\nimport { lazy } from 'react';\nconst Chart = lazy(() => import('./chart'));\nexport const D = () => <Chart />;"],
    ['import()', "'use client';\nexport async function load() { const { default: moment } = await import('moment'); return moment(); }"],
    ['a type-only import', "'use client';\nimport type { Moment } from 'moment';\nexport const f = (m: Moment) => m;"],
  ])('green: %s', (_name, entry) => {
    const result = Law.check(nextCtx({ 'src/components/dash.tsx': entry, 'src/components/chart.tsx': DATES }));
    expect(result.violations).toEqual([]);
  });

  it('a configured list replaces the default', () => {
    const files = { 'src/components/clock.tsx': CLOCK, 'src/lib/dates.ts': DATES, 'src/components/x.tsx': "'use client';\nimport 'big-lib';\nexport const X = 1;" };
    const result = Law.check(nextCtx(files, { heavyClientLibraries: ['big-lib'] }));
    expect(result.violations).toEqual([expect.stringContaining("src/components/x.tsx:2: imports 'big-lib' statically")]);
  });

  it('Pages Router: a page is a client entry, but an import used only by getServerSideProps is stripped', () => {
    const served = "import moment from 'moment';\nexport default function P() { return <p>{moment().year()}</p>; }";
    const stripped = "import moment from 'moment';\nexport default function P({ y }) { return <p>{y}</p>; }\nexport async function getServerSideProps() { return { props: { y: moment().year() } }; }";
    expect(Law.check(nextCtx({ 'pages/index.tsx': served })).violations).toEqual([expect.stringContaining("pages/index.tsx:1: imports 'moment'")]);
    expect(Law.check(nextCtx({ 'pages/index.tsx': stripped })).violations).toEqual([]);
  });

  it('fails closed on an alias that does not resolve: the graph below it was not read', () => {
    const result = Law.check(nextCtx({ 'src/components/x.tsx': "'use client';\nimport { y } from '@/missing/y';\nexport const X = y;" }));
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringContaining("src/components/x.tsx:2: '@/missing/y' did not resolve to a file — the modules below it were not read")]);
  });

  it('a stylesheet or image import is not code and is not reported', () => {
    const result = Law.check(nextCtx({ 'src/components/x.tsx': "'use client';\nimport './x.module.css';\nimport logo from '@/assets/logo.svg';\nexport const X = () => <img src={logo} />;" }));
    expect(result.violations).toEqual([]);
  });

  it('with no client module it passes and says so', () => {
    const result = Law.check(ctx(nextApp({ 'src/app/page.tsx': PAGE })));
    expect(result.passed).toBe(true);
    expect(result.message).toContain("no 'use client' module");
  });
});
