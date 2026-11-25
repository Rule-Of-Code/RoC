/**
 * #12, P4 — the React guidance of the frontend architecture laws (Stores In
 * Data Access, Defensive Array Coercion, No Passthrough Cast, No Hostname
 * Gating), proved on a React + Vite project.
 *
 * Each case starts RED (the law reports the project) and goes GREEN by doing
 * exactly what `satisfiedBy.react` says, and checks that the card names the
 * construct used — an instruction that does not clear the finding is wrong,
 * however plausible it reads.
 */
import { DefensiveArrayCoercionLaw } from '../../src/checkers/fe-architecture-laws/defensive-array-coercion';
import { NoHostnameGatingLaw } from '../../src/checkers/fe-architecture-laws/no-hostname-gating';
import { NoPassthroughCastLaw } from '../../src/checkers/fe-architecture-laws/no-passthrough-cast';
import { StoresInDataAccessLaw } from '../../src/checkers/fe-architecture-laws/stores-in-data-access';
import { DEFAULT_CONFIG } from '../../src/config/types';
import { ALL_ENHANCED_CONSTITUTIONAL_LAWS } from '../../src/data/enhanced-laws';
import type { LawCheckContext, LawResult } from '../../src/types/law.types';
import { json, useTempProject } from './foreign-json-486.helpers';

/** The law card's `satisfiedBy.react` text. */
const reactGuidance = (title: string): string => {
  const law = ALL_ENHANCED_CONSTITUTIONAL_LAWS.find(l => l.title === title);
  return law?.satisfiedBy?.react ?? '';
};

const project = useTempProject();
const { write } = project;

/** A React + Vite app, with any extra dependencies. */
const reactVite = (dependencies: Record<string, string> = {}): void => {
  write(
    'package.json',
    json({
      name: 'app',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        ...dependencies,
      },
      devDependencies: { vite: '^7.0.0', typescript: '^5.9.3' },
      scripts: { build: 'vite build' },
    })
  );
  write(
    'src/main.tsx',
    "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\ncreateRoot(document.getElementById('root')!).render(<App />);\n"
  );
};

/** The project with its layers declared in thresholds.frontend. */
const layered = (
  featureLayers: string[],
  dataAccessLayers: string[]
): LawCheckContext => ({
  projectRoot: project.root,
  config: {
    ...DEFAULT_CONFIG,
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      frontend: { featureLayers, dataAccessLayers },
    },
  } as LawCheckContext['config'],
});

const lines = (...text: string[]): string => `${text.join('\n')}\n`;

const expectRed = (result: LawResult, finding: RegExp): void => {
  expect(result.passed).toBe(false);
  expect((result.violations ?? []).join('\n')).toMatch(finding);
};

const expectGreen = (result: LawResult): void => {
  expect(result.violations ?? []).toEqual([]);
  expect(result.passed).toBe(true);
};

describe('#12 P4 Stores In Data Access — React', () => {
  const store = lines(
    "import { create } from 'zustand';",
    'export const useCart = create<{ n: number }>(() => ({ n: 0 }));'
  );
  const consumer = (from: string): string =>
    lines(
      `import { useCart } from '${from}';`,
      'export function Cart() {',
      '  const n = useCart(s => s.n);',
      '  return <p>{n}</p>;',
      '}'
    );

  it('the card names zustand create, the data layer and the two thresholds', () => {
    const text = reactGuidance('Stores In Data Access');
    expect(text).toMatch(/zustand create/);
    expect(text).toMatch(/thresholds\.frontend\.featureLayers/);
  });

  it('RED: a zustand store defined in the feature directory', () => {
    reactVite({ zustand: '^5.0.0' });
    write('src/features/cart/cart-store.ts', store);
    write('src/features/cart/Cart.tsx', consumer('./cart-store'));
    expectRed(
      StoresInDataAccessLaw.check(project.context()),
      /src\/features\/cart\/cart-store\.ts/
    );
  });

  it('GREEN: the store in the data-access layer, the feature component consumes it', () => {
    reactVite({ zustand: '^5.0.0' });
    write('src/data-access/cart-store.ts', store);
    write(
      'src/features/cart/Cart.tsx',
      consumer('../../data-access/cart-store')
    );
    expectGreen(StoresInDataAccessLaw.check(project.context()));
  });

  it('GREEN: the layers declared where a React app keeps them', () => {
    reactVite({ zustand: '^5.0.0' });
    write('src/stores/cart-store.ts', store);
    write('src/pages/Cart.tsx', consumer('../stores/cart-store'));
    expectGreen(
      StoresInDataAccessLaw.check(layered(['src/pages/**'], ['src/stores/**']))
    );
  });
});

describe('#12 P4 Defensive Array Coercion — React', () => {
  const mapper = (items: string): string =>
    lines(
      'export interface RawUsers { items: Array<{ id: string }> }',
      'export function toUserIds(raw: RawUsers): string[] {',
      `  return ${items}.map(u => u.id);`,
      '}'
    );

  it('the card names the Array.isArray guard, Raw* and the data-access layer', () => {
    const text = reactGuidance('Defensive Array Coercion');
    expect(text).toMatch(/\(Array\.isArray\(x\) \? x : \[\]\)/);
    expect(text).toMatch(/thresholds\.frontend\.dataAccessLayers/);
  });

  it('RED: .map over a property of a Raw* parameter', () => {
    reactVite();
    write('src/data-access/users.ts', mapper('raw.items'));
    expectRed(
      DefensiveArrayCoercionLaw.check(project.context()),
      /src\/data-access\/users\.ts:3: unguarded array method on raw\.items/
    );
  });

  it('GREEN: (Array.isArray(raw.items) ? raw.items : []).map', () => {
    reactVite();
    write(
      'src/data-access/users.ts',
      mapper('(Array.isArray(raw.items) ? raw.items : [])')
    );
    expectGreen(DefensiveArrayCoercionLaw.check(project.context()));
  });
});

describe('#12 P4 No Passthrough Cast — React', () => {
  it('the card names res.json(), axios generics and the data-access layer', () => {
    const text = reactGuidance('No Passthrough Cast');
    expect(text).toMatch(/res\.json\(\)/);
    expect(text).toMatch(/axios\.get<RawUser>/);
    expect(text).toMatch(/thresholds\.frontend\.dataAccessLayers/);
  });

  it('RED: (await res.json()) as User', () => {
    reactVite();
    write(
      'src/data-access/user-api.ts',
      lines(
        'export interface User { id: string }',
        'export async function getUser(): Promise<User> {',
        "  const res = await fetch('/api/user');",
        '  return (await res.json()) as User;',
        '}'
      )
    );
    expectRed(
      NoPassthroughCastLaw.check(project.context()),
      /user-api\.ts:4: the body of res\.json\(\) is relabelled as User/
    );
  });

  it('GREEN: the body read as unknown and parsed by a mapper', () => {
    reactVite();
    write(
      'src/data-access/user-api.ts',
      lines(
        'export interface User { id: string }',
        'function toUser(body: unknown): User {',
        "  if (typeof body === 'object' && body !== null && 'id' in body && typeof body.id === 'string') return { id: body.id };",
        "  throw new Error('bad user payload');",
        '}',
        'export async function getUser(): Promise<User> {',
        "  const res = await fetch('/api/user');",
        '  const body: unknown = await res.json();',
        '  return toUser(body);',
        '}'
      )
    );
    expectGreen(NoPassthroughCastLaw.check(project.context()));
  });

  it('RED: axios.get<User>() types the response as the domain model', () => {
    reactVite({ axios: '^1.7.0' });
    write(
      'src/data-access/user-api.ts',
      lines(
        "import axios from 'axios';",
        'export interface User { id: string }',
        'export const getUser = async (): Promise<User> =>',
        "  (await axios.get<User>('/api/user')).data;"
      )
    );
    expectRed(
      NoPassthroughCastLaw.check(project.context()),
      /user-api\.ts:4: http\.get<User> casts the response/
    );
  });

  it('GREEN: axios.get<RawUser>() and a mapper to the domain type', () => {
    reactVite({ axios: '^1.7.0' });
    write(
      'src/data-access/user-api.ts',
      lines(
        "import axios from 'axios';",
        'export interface User { id: string }',
        'interface RawUser { id?: unknown }',
        "const toUser = (raw: RawUser): User => ({ id: String(raw.id ?? '') });",
        'export const getUser = async (): Promise<User> =>',
        "  toUser((await axios.get<RawUser>('/api/user')).data);"
      )
    );
    expectGreen(NoPassthroughCastLaw.check(project.context()));
  });
});

describe('#12 P4 No Hostname Gating — React', () => {
  const banner = (condition: string): string =>
    lines(
      'export function DemoBanner() {',
      `  if (!(${condition})) return null;`,
      '  return <p>Demo</p>;',
      '}'
    );

  it('the card says to branch on an env value read at build time', () => {
    expect(reactGuidance('No Hostname Gating')).toMatch(
      /an env value read at build time/
    );
  });

  it('RED: the banner shows on a hostname', () => {
    reactVite();
    write(
      'src/DemoBanner.tsx',
      banner("location.hostname === 'demo.example.com'")
    );
    expectRed(
      NoHostnameGatingLaw.check(project.context()),
      /src\/DemoBanner\.tsx/
    );
  });

  it('GREEN: the banner shows on import.meta.env.VITE_DEMO', () => {
    reactVite();
    write('src/DemoBanner.tsx', banner("import.meta.env.VITE_DEMO === 'true'"));
    expectGreen(NoHostnameGatingLaw.check(project.context()));
  });
});
