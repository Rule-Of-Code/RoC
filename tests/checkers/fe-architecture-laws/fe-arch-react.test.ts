/**
 * The FE architecture laws on a project without Angular (#210). The Angular
 * gate made six of them report "compliance verified" on every other frontend
 * without reading a file; they are framework-neutral now, the layer laws take
 * configurable layers, and a layer law that finds no file in its layer says it
 * judged nothing. Real temp fixtures, no mocks (except the one test that makes
 * the parser unavailable).
 */
import { DefensiveArrayCoercionLaw } from '../../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoHostnameGatingLaw } from '../../../src/checkers/fe-architecture-laws/no-hostname-gating';
import { NoLayoutTransitionLaw } from '../../../src/checkers/fe-architecture-laws/no-layout-transition';
import { NoPassthroughCastLaw } from '../../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { RequiresSpecLaw } from '../../../src/checkers/fe-architecture-laws/requires-spec';
import { StoresInDataAccessLaw } from '../../../src/checkers/fe-architecture-laws/stores-in-data-access';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const REACT = { 'package.json': manifest({ react: '19.3.0', next: '16.4.6' }) };
const react = (files: Record<string, string>): string => project({ ...REACT, ...files });
const layers = (featureLayers: string[], dataAccessLayers: string[]) => ({
  thresholds: { frontend: { featureLayers, dataAccessLayers } },
});
const lines = (n: number): string =>
  Array.from({ length: n }, (_, i) => `const x${i} = ${i};`).join('\n');
const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];

describe('Stores In Data Access on React (#210)', () => {
  it('red: a createSlice imported from @reduxjs/toolkit in the feature layer', () => {
    const root = react({
      'src/feature-cart/cart.slice.ts':
        "import { createSlice } from '@reduxjs/toolkit';\nexport const cart = createSlice({ name: 'cart', initialState: {}, reducers: {} });",
    });
    expect(violations(StoresInDataAccessLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/^src\/feature-cart\/cart\.slice\.ts:2: createSlice \(Redux Toolkit\) defined in the feature layer/),
    ]);
  });

  it('red: zustand create, through an alias and the curried form', () => {
    const root = react({
      'src/feature-cart/useCart.ts':
        "import { create as make } from 'zustand';\nexport const useCart = make<{ n: number }>()(() => ({ n: 0 }));",
    });
    expect(violations(StoresInDataAccessLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/useCart\.ts:2: create \(zustand\) defined in the feature layer/),
    ]);
  });

  it('green: a create( that is not zustand, and a type-only import, are not stores', () => {
    const root = react({
      'src/feature-cart/factory.ts':
        "import type { create } from 'zustand';\nimport { create as build } from './builder';\nexport const x = build();",
    });
    expect(StoresInDataAccessLaw.check(ctx(root)).passed).toBe(true);
  });

  it('green: the slice lives in the configured data layer, the feature layer consumes it', () => {
    const root = react({
      'src/lib/store/cart.slice.ts':
        "import { createSlice } from '@reduxjs/toolkit';\nexport const cart = createSlice({ name: 'c', initialState: {}, reducers: {} });",
      'src/components/Cart.tsx': "import { cart } from '../lib/store/cart.slice';\nexport const Cart = () => null;",
    });
    const result = StoresInDataAccessLaw.check(
      ctx(root, layers(['src/components/**'], ['src/lib/**']))
    );
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
  });

  it('control: the configured feature layer IS scanned — the same slice there is red', () => {
    const root = react({
      'src/components/cart.slice.ts':
        "import { createSlice } from '@reduxjs/toolkit';\nexport const cart = createSlice({ name: 'c', initialState: {}, reducers: {} });",
    });
    const result = StoresInDataAccessLaw.check(
      ctx(root, layers(['src/components/**'], ['src/lib/**']))
    );
    expect(result.passed).toBe(false);
  });

  it('no file in the feature layer: it says it judged nothing, and does not pass', () => {
    const root = react({ 'src/app/page.tsx': 'export default function Page() { return null; }' });
    const result = StoresInDataAccessLaw.check(ctx(root));
    expect(result.passed).toBe(false);
    expect(violations(result)).toEqual([
      expect.stringMatching(/no source file is in the feature layer \(default: a \/feature\*\/ directory\) — this law judged nothing.*thresholds\.frontend\.featureLayers/),
    ]);
  });

  it('a file it needed the parser for and could not parse fails, naming why', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const root = react({
        'src/feature-cart/cart.slice.ts':
          "import { createSlice } from '@reduxjs/toolkit';\nexport const c = createSlice({});",
      });
      const result = StoresInDataAccessLaw.check(ctx(root));
      expect(result.passed).toBe(false);
      expect(violations(result)).toEqual([
        expect.stringMatching(/1 file\(s\): could not load the 'typescript' package/),
      ]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('Requires Spec on React (#210)', () => {
  it('red: a large .tsx in the feature layer without a sibling test', () => {
    const root = react({ 'src/feature-cart/Basket.tsx': lines(250) });
    expect(violations(RequiresSpecLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/^src\/feature-cart\/Basket\.tsx: 250 LOC \(> 200\) but has no co-located/),
    ]);
  });

  it.each(['Basket.test.tsx', 'Basket.spec.tsx', 'Basket.test.ts'])(
    'green: the sibling %s counts',
    sibling => {
      const root = react({
        'src/feature-cart/Basket.tsx': lines(250),
        [`src/feature-cart/${sibling}`]: "it('renders', () => {});",
      });
      expect(RequiresSpecLaw.check(ctx(root)).passed).toBe(true);
    }
  );

  it('green: a small .tsx needs no test; the layer was judged', () => {
    const root = react({ 'src/feature-cart/Badge.tsx': lines(20) });
    expect(RequiresSpecLaw.check(ctx(root)).passed).toBe(true);
  });

  it('configured layers: the large file outside them is not a candidate, inside them it is', () => {
    const root = react({
      'src/components/Basket.tsx': lines(250),
      'src/scripts/Big.tsx': lines(250),
    });
    const result = RequiresSpecLaw.check(ctx(root, layers(['src/components/**'], [])));
    expect(violations(result)).toEqual([expect.stringMatching(/^src\/components\/Basket\.tsx:/)]);
  });

  it('no file in either layer: judged nothing, not a pass', () => {
    const root = react({ 'src/app/page.tsx': lines(250) });
    expect(violations(RequiresSpecLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/no source file is in the feature layer .* or the data-access layer .* judged nothing/),
    ]);
  });
});

describe('No Layout Transition and No Hostname Gating on React (#210)', () => {
  it('red/green: a CSS Module transition on height vs on transform', () => {
    const red = react({ 'src/app/page.module.css': '.a { transition: height 200ms; }' });
    const green = react({ 'src/app/page.module.css': '.a { transition: transform 200ms; }' });
    expect(NoLayoutTransitionLaw.check(ctx(red)).passed).toBe(false);
    expect(NoLayoutTransitionLaw.check(ctx(green)).passed).toBe(true);
  });

  it.each(['src/app/page.tsx', 'src/app/legacy.jsx', 'src/lib/flags.js'])(
    'red: a hostname comparison in %s',
    file => {
      const root = react({ [file]: "export const demo = location.hostname === 'demo.example.com';" });
      expect(violations(NoHostnameGatingLaw.check(ctx(root)))).toEqual([
        expect.stringMatching(new RegExp(`^${file.replace(/\./g, '\\.')}:1: feature gating via location.hostname`)),
      ]);
    }
  );

  it('green: reading the hostname without comparing it', () => {
    const root = react({ 'src/app/page.tsx': 'export const host = location.hostname;' });
    expect(NoHostnameGatingLaw.check(ctx(root)).passed).toBe(true);
  });
});

describe('Defensive Array Coercion on React (#210)', () => {
  it('red/green in a configured data layer', () => {
    const config = layers([], ['src/lib/api/**']);
    const red = react({
      'src/lib/api/orders.ts': 'export const ids = (r: RawOrders) => r.items.map(i => i.id);',
    });
    const green = react({
      'src/lib/api/orders.ts':
        'export const ids = (r: RawOrders) => (Array.isArray(r.items) ? r.items : []).map(i => i.id);',
    });
    expect(DefensiveArrayCoercionLaw.check(ctx(red, config)).passed).toBe(false);
    expect(DefensiveArrayCoercionLaw.check(ctx(green, config)).passed).toBe(true);
  });

  it('no data-access file: judged nothing, not a pass', () => {
    const root = react({ 'src/lib/api/orders.ts': 'export const ids = (r: RawOrders) => r.items.map(i => i);' });
    expect(violations(DefensiveArrayCoercionLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/no source file is in the data-access layer/),
    ]);
  });
});

describe('No Passthrough Cast: the fetch shape (#210)', () => {
  const inDataAccess = (code: string): string =>
    react({ 'src/data-access/orders.ts': code });

  it.each([
    ['(await res.json()) as Order', 'const o = (await res.json()) as Order;', 'Order'],
    ['await res.json() as Order[]', 'const o = await res.json() as Order[];', 'Order'],
    ['res.json() as Promise<Order>', 'return res.json() as Promise<Order>;', 'Order'],
    ['as unknown as Order', 'const o = (await res.json()) as unknown as Order;', 'Order'],
    ['a typed declaration', 'const o: Order = await res.json();', 'Order'],
  ])('red: %s', (_label, statement, type) => {
    const root = inDataAccess(`export async function load(res: Response) {\n  ${statement}\n}`);
    expect(violations(NoPassthroughCastLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(new RegExp(`^src/data-access/orders\\.ts:2: the body of res\\.json\\(\\) is relabelled as ${type} without being parsed`)),
    ]);
  });

  it.each([
    ['unknown, then parsed', 'const body: unknown = await res.json();\n  return OrderSchema.parse(body);'],
    ['a Raw* envelope', 'const raw = (await res.json()) as RawOrder;\n  return toOrder(raw);'],
    ['no cast at all', 'return toOrder(await res.json());'],
    ['a cast that is not over json()', 'const o = cache.get(key) as Order;'],
  ])('green: %s', (_label, body) => {
    const root = inDataAccess(`export async function load(res: Response) {\n  ${body}\n}`);
    expect(NoPassthroughCastLaw.check(ctx(root)).passed).toBe(true);
  });

  it('a json() cast outside the data-access layer is not judged; the layer must exist', () => {
    const root = react({
      'src/app/page.tsx': 'export async function load(res: Response) { return (await res.json()) as Order; }',
    });
    expect(violations(NoPassthroughCastLaw.check(ctx(root)))).toEqual([
      expect.stringMatching(/no source file is in the data-access layer/),
    ]);
  });
});
