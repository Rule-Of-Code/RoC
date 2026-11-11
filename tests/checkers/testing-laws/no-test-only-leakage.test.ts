/**
 * NoTestOnlyLeakage (#247): a test-only file reachable from a Next route with
 * no environment gate on the way ships in the production build. Imports are
 * resolved with the app's tsconfig (aliases included); only ungated edges are
 * followed.
 */
import { NoTestOnlyLeakageLaw } from '../../../src/checkers/testing-laws/no-test-only-leakage';
import { TEST_INTEGRITY_LAWS } from '../../../src/data/test-integrity-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const TSCONFIG = JSON.stringify({
  compilerOptions: { jsx: 'preserve', moduleResolution: 'bundler', module: 'esnext', paths: { '@/*': ['./src/*'] } },
});
const FAKE = "export function FakeAuthProvider({ children }) { return children; }";
const layout = (...lines: string[]) =>
  [...lines, 'export default function Layout({ children }) {', '  return <html><body>{children}</body></html>;', '}'].join('\n');

const nextProject = (files: Record<string, string>) =>
  project({ 'package.json': manifest({ next: '16.4.6', react: '19.3.0' }), 'tsconfig.json': TSCONFIG, ...files });
const check = (files: Record<string, string>, overrides = {}) =>
  NoTestOnlyLeakageLaw.check(ctx(nextProject(files), overrides));

describe('NoTestOnlyLeakageLaw (#247)', () => {
  it('red: a layout renders a fake provider imported through an alias, with no gate', () => {
    const result = check({
      'src/app/layout.tsx': [
        "import { FakeAuthProvider } from '@/mocks/fake-auth';",
        'export default function Layout({ children }) {',
        '  return <FakeAuthProvider>{children}</FakeAuthProvider>;',
        '}',
      ].join('\n'),
      'src/mocks/fake-auth.tsx': FAKE,
    });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      'src/mocks/fake-auth.tsx is test-only and is reachable from src/app/layout.tsx → src/mocks/fake-auth.tsx with no environment gate on the way — it ships in the production build. Gate its use on process.env, or make it stop itself outside tests',
    ]);
  });

  it('red: through an intermediate module, naming the whole chain', () => {
    const result = check({
      'src/app/page.tsx': "import { Providers } from '../providers';\nexport default function P() { return <Providers />; }",
      'src/providers.tsx': "import { FakeAuthProvider } from './auth.fake';\nexport const Providers = () => <FakeAuthProvider />;",
      'src/auth.fake.tsx': FAKE,
    });
    expect(result.violations).toEqual([
      expect.stringContaining('reachable from src/app/page.tsx → src/providers.tsx → src/auth.fake.tsx'),
    ]);
  });

  it('red: a test route under app/api/test with no gate', () => {
    const result = check({
      'src/app/api/test/seed/route.ts': 'export async function POST() { return Response.json({ seeded: true }); }',
    });
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/app\/api\/test\/seed\/route\.ts is test-only and is itself a route/),
    ]);
  });

  it('red: a side-effect import of mocks is never gated', () => {
    const result = check({ 'src/app/layout.tsx': layout("import '../mocks/browser';"), 'src/mocks/browser.ts': 'export {};' });
    expect(result.violations).toHaveLength(1);
  });

  it('red: a re-export of a fake is never gated', () => {
    const result = check({
      'src/app/page.tsx': "export { FakeAuthProvider as default } from '../__mocks__/auth';",
      'src/__mocks__/auth.tsx': FAKE,
    });
    expect(result.violations).toHaveLength(1);
  });

  it('red: one use under a gate and one outside it is not gated', () => {
    const result = check({
      'src/app/layout.tsx': [
        "import { FakeAuthProvider } from '../mocks/fake';",
        'export const used = FakeAuthProvider;',
        "export default function L() { return process.env.E2E === 'true' ? <FakeAuthProvider /> : null; }",
      ].join('\n'),
      'src/mocks/fake.tsx': FAKE,
    });
    expect(result.violations).toHaveLength(1);
  });

  it('red: a configured test-only path (thresholds.testing.testOnlyPaths)', () => {
    const files = {
      'src/app/page.tsx': "import { seed } from '../dev-tools/seed';\nexport default function P() { seed(); return null; }",
      'src/dev-tools/seed.ts': 'export const seed = () => 1;',
    };
    expect(check(files).violations).toEqual([]);
    const result = check(files, { thresholds: { testing: { testOnlyPaths: ['src/dev-tools/**'] } } });
    expect(result.violations).toEqual([expect.stringMatching(/^src\/dev-tools\/seed\.ts is test-only/)]);
  });

  it.each([
    [
      'used only under a process.env condition (JSX &&)',
      layout(
        "import { MockProvider } from '../mocks/provider';",
        "export const Wrap = ({ children }) => process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' && <MockProvider>{children}</MockProvider>;"
      ),
    ],
    [
      'used only in an if on process.env',
      layout(
        "import { startMocks } from '../mocks/provider';",
        "if (process.env.NODE_ENV === 'development') { startMocks(); }"
      ),
    ],
    [
      'imported with import() inside a process.env branch',
      layout("if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') { import('../mocks/provider'); }"),
    ],
    [
      'imported as a type only',
      layout("import type { MockProvider } from '../mocks/provider';", 'export type P = typeof MockProvider;'),
    ],
  ])('green: %s', (_name, code) => {
    const result = check({ 'src/app/layout.tsx': code, 'src/mocks/provider.tsx': 'export const MockProvider = () => null; export const startMocks = () => {};' });
    expect(result.violations).toEqual([]);
  });

  it('green: a test route that stops itself in production', () => {
    const result = check({
      'src/app/api/test/seed/route.ts': [
        "import { notFound } from 'next/navigation';",
        'export async function POST() {',
        "  if (process.env.NODE_ENV === 'production') notFound();",
        '  return Response.json({ seeded: true });',
        '}',
      ].join('\n'),
    });
    expect(result.violations).toEqual([]);
  });

  it('green: a fake that only a test imports (tests are not routes)', () => {
    const result = check({
      'src/app/page.tsx': 'export default function P() { return null; }',
      'src/app/page.test.tsx': "import { FakeAuthProvider } from '../mocks/fake';\nit('p', () => {});",
      'src/mocks/fake.tsx': FAKE,
    });
    expect(result.violations).toEqual([]);
  });

  it('reads the Pages Router and middleware as routes', () => {
    const result = check({
      'pages/index.tsx': "import { fake } from '../src/__fixtures__/user';\nexport default function H() { return fake; }",
      'src/__fixtures__/user.ts': 'export const fake = 1;',
      'middleware.ts': "import { allow } from './src/test-utils/allow';\nexport function middleware() { return allow(); }",
      'src/test-utils/allow.ts': 'export const allow = () => null;',
    });
    expect(result.violations).toHaveLength(2);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        expect.stringContaining('src/test-utils/allow.ts is test-only and is reachable from middleware.ts'),
        expect.stringContaining('src/__fixtures__/user.ts is test-only and is reachable from pages/index.tsx'),
      ])
    );
  });

  it('a malformed testOnlyPaths is reported, not ignored', () => {
    const result = check(
      { 'src/app/page.tsx': 'export default function P() { return null; }' },
      { thresholds: { testing: { testOnlyPaths: 'src/dev/**' } } }
    );
    expect(result.violations).toEqual([expect.stringMatching(/thresholds\.testing\.testOnlyPaths is "src\/dev\/\*\*" — not a list of globs/)]);
  });

  it('fails, never passes, when a package declares next but has no router directory', () => {
    const result = check({ 'src/index.ts': 'export {};' });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([expect.stringMatching(/^\.: declares next but has no app\/ or pages\/ directory/)]);
  });

  it('fails, never passes, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check({ 'src/app/page.tsx': 'export default function P() { return null; }' });
      expect(result.passed).toBe(false);
      expect((result.violations ?? []).join('\n')).toMatch(/could not load the 'typescript' package/);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('No Test-Only Leakage selection (requires)', () => {
  const card = TEST_INTEGRITY_LAWS.find(law => law.title === 'No Test-Only Leakage');

  it('is selected where next is declared, and not on plain React', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ next: '16' }) }))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19' }) }))).toBe(false);
  });
});
