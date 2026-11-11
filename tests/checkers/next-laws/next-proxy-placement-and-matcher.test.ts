/**
 * NextProxyPlacementAndMatcher (#221): the proxy sits where Next loads it, is
 * not paired with middleware, exports one function and a literal matcher.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { NextProxyPlacementAndMatcherLaw as Law } from '../../../src/checkers/next-laws/next-proxy-placement-and-matcher';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, removeProjects } from '../toolkit-fixture';
import { NEXT_DEPENDENCIES, nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const ROUTER = { 'src/app/page.tsx': 'export default function Page() { return null; }\n' };
const GOOD = "export function proxy(request: Request) { return undefined; }\nexport const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };\n";
const run = (files: Record<string, string>, next?: Record<string, unknown>) =>
  Law.check(nextCtx(nextApp({ ...ROUTER, ...files }), next));

describe('NextProxyPlacementAndMatcherLaw', () => {
  it('green: src/proxy.ts beside src/app with one function and a literal matcher', () => {
    expect(run({ 'src/proxy.ts': GOOD }).violations).toEqual([]);
  });

  it('green: object matchers with literal has/missing', () => {
    const proxy = "export default function proxy() {}\nexport const config = { matcher: [{ source: '/api/:path*', locale: false, has: [{ type: 'header', key: 'x', value: 'y' }] }] };\n";
    expect(run({ 'src/proxy.ts': proxy }).violations).toEqual([]);
  });

  it('red: proxy.ts at the root while the router is in src/ is never loaded', () => {
    const result = run({ 'proxy.ts': GOOD });
    expect(result.violations).toEqual([expect.stringMatching(/^proxy\.ts: is never loaded — Next looks for proxy only in src/)]);
  });

  it('red: both proxy and middleware; middleware alone is deprecated on Next 16', () => {
    expect(run({ 'src/proxy.ts': GOOD, 'src/middleware.ts': GOOD.replace('proxy', 'middleware') }).violations).toEqual([
      expect.stringContaining('both exist — Next 16 refuses to build with both'),
    ]);
    expect(run({ 'src/middleware.ts': GOOD.replace('proxy', 'middleware') }).violations).toEqual([
      expect.stringContaining('the middleware convention is deprecated since Next 16'),
    ]);
  });

  it('red on Next 15: proxy.ts is not read; green: middleware.ts is', () => {
    const files = { ...ROUTER, 'node_modules/next/package.json': JSON.stringify({ name: 'next', version: '15.5.0' }) };
    const deps = { ...NEXT_DEPENDENCIES, next: '15.5.0' };
    const proxyResult = Law.check(nextCtx(nextApp({ ...files, 'src/proxy.ts': GOOD }, deps)));
    expect(proxyResult.violations).toEqual([expect.stringContaining('next@15 reads middleware, not proxy')]);
    const middleware = GOOD.replace('function proxy', 'function middleware');
    expect(Law.check(nextCtx(nextApp({ ...files, 'src/middleware.ts': middleware }, deps))).violations).toEqual([]);
  });

  it('red: no matcher; green when the reason is declared', () => {
    const proxy = 'export function proxy() {}\n';
    expect(run({ 'src/proxy.ts': proxy }).violations).toEqual([expect.stringContaining('has no config.matcher — it runs on every request')]);
    expect(run({ 'src/proxy.ts': proxy }, { proxyWithoutMatcher: 'adds a security header to every response' }).violations).toEqual([]);
  });

  it('red: a dynamic matcher, even with the reason declared (Next ignores it)', () => {
    const proxy = "const paths = ['/a'];\nexport function proxy() {}\nexport const config = { matcher: paths };\n";
    expect(run({ 'src/proxy.ts': proxy }, { proxyWithoutMatcher: 'x' }).violations).toEqual([
      expect.stringContaining('config.matcher (paths) is not a constant'),
    ]);
  });

  it('red: two proxy functions, or none', () => {
    const both = "export default function a() {}\nexport function proxy() {}\nexport const config = { matcher: '/a' };\n";
    expect(run({ 'src/proxy.ts': both }).violations).toEqual([expect.stringContaining('exports both a default and a named proxy')]);
    const none = "export function handler() {}\nexport const config = { matcher: '/a' };\n";
    expect(run({ 'src/proxy.ts': none }).violations).toEqual([expect.stringContaining("exports no default and no 'proxy' function")]);
  });

  it('control: a project with no proxy has nothing to place', () => {
    expect(run({}).violations).toEqual([]);
  });

  it('fails when the parser cannot be loaded and a proxy exists', () => {
    const root = nextApp({ ...ROUTER, 'src/proxy.ts': GOOD });
    const result = withoutTypeScript(() => Law.check(nextCtx(root)));
    expect(result.violations).toEqual([expect.stringMatching(/^src\/proxy\.ts: could not load the 'typescript' package/)]);
  });

  it('is selected with next, at warning', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'NextProxyPlacementAndMatcherLaw.check');
    expect(card?.defaultSeverity).toBe('warning');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, nextApp({ 'package.json': manifest({ express: '5.0.0' }) }))).toBe(false);
  });
});
