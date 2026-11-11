/**
 * ClientIpSingleBoundary (#201): forwarding-header reads live in the one
 * declared module; zero reads pass only with `notUsed` declared.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { ClientIpSingleBoundaryLaw as Law } from '../../../src/checkers/next-laws/client-ip-single-boundary';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const BOUNDARY = {
  'src/lib/client-ip.ts': "export function clientIp(h: Headers) { return h.get('x-forwarded-for')?.split(',').at(-1)?.trim() ?? null; }\n",
};
const ROUTE = { 'src/app/api/route.ts': "export async function GET(request: Request) { return new Response(request.headers.get('X-Real-IP')); }\n" };
const run = (files: Record<string, string>, clientIp?: Record<string, unknown>) =>
  Law.check(nextCtx(nextApp(files), undefined, clientIp));

describe('ClientIpSingleBoundaryLaw', () => {
  it('green: every read in the declared module', () => {
    expect(run(BOUNDARY, { module: 'src/lib/client-ip.ts' }).violations).toEqual([]);
  });

  it('red: a read outside it, case-insensitively', () => {
    const result = run({ ...BOUNDARY, ...ROUTE }, { module: 'src/lib/client-ip.ts' });
    expect(result.violations).toEqual([
      "src/app/api/route.ts:1: reads 'x-real-ip' outside src/lib/client-ip.ts — a second reading of the client IP drifts from the first. Call the boundary module instead",
    ]);
  });

  it("red: 'forwarded' where a header is looked up; control: the word elsewhere is not a read", () => {
    const files = {
      'src/lib/mail.ts': "export const status = 'forwarded';\n",
      'src/lib/geo.ts': "export const f = (req: { headers: Record<string, string> }) => req.headers['forwarded'];\n",
    };
    expect(run(files, { module: 'src/lib/client-ip.ts', }).violations).toEqual([
      expect.stringContaining("does not exist"),
      expect.stringMatching(/^src\/lib\/geo\.ts:1: reads 'forwarded'/),
    ]);
  });

  it('red: reads with nothing declared name every module', () => {
    const result = run({ ...BOUNDARY, ...ROUTE });
    expect(result.violations).toEqual([expect.stringMatching(/client IP headers are read in 2 module\(s\) .* and no thresholds\.clientIp\.module is declared/)]);
  });

  it('fails closed on zero reads without a declaration; notUsed makes it pass, and a read then fails', () => {
    expect(run({ 'src/app/page.tsx': 'export default () => null;\n' }).violations).toEqual([
      expect.stringContaining('neither thresholds.clientIp.module nor thresholds.clientIp.notUsed is declared'),
    ]);
    expect(run({ 'src/app/page.tsx': 'export default () => null;\n' }, { notUsed: 'no rate limits or IP logs' }).violations).toEqual([]);
    expect(run(ROUTE, { notUsed: 'none' }).violations).toEqual([expect.stringContaining("but thresholds.clientIp.notUsed says the project uses no client IP")]);
  });

  it('refuses both declarations at once', () => {
    expect(run(BOUNDARY, { module: 'src/lib/client-ip.ts', notUsed: 'x' }).violations).toEqual([
      expect.stringContaining('are both declared'),
    ]);
  });

  it('fails when the parser cannot be loaded', () => {
    const root = nextApp(BOUNDARY);
    const result = withoutTypeScript(() => Law.check(nextCtx(root, undefined, { module: 'src/lib/client-ip.ts' })));
    expect(result.violations?.[0]).toMatch(/file\(s\): could not load the 'typescript' package/);
  });

  it('is selected for Next and for Express, not for a React SPA or Python', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'ClientIpSingleBoundaryLaw.check');
    expect(card?.stack).toBe('typescript');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ express: '5.0.0' }) }))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ react: '19.0.0', vite: '7.0.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': '[project]\nname = "api"\n' }))).toBe(false);
  });
});
