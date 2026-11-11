/**
 * GuardExemptionMatchesARoute (#197): every pattern of each declared guard
 * exemption list matches at least one page or route handler.
 */
import { NEXT_SERVER_LAWS } from '../../../src/data/next-server-laws';
import { GuardExemptionMatchesARouteLaw as Law } from '../../../src/checkers/next-laws/guard-exemption-matches-a-route';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { manifest, project, removeProjects } from '../toolkit-fixture';
import { nextApp, nextCtx, withoutTypeScript } from './next-server-fixture';

afterAll(removeProjects);

const ROUTES = {
  'src/app/(marketing)/login/page.tsx': 'export default () => null;\n',
  'src/app/api/webhooks/stripe/route.ts': 'export async function POST() { return new Response(null); }\n',
  'src/app/api/users/[id]/route.ts': 'export async function PUT() { return new Response(null); }\n',
  'src/app/docs/[...slug]/page.tsx': 'export default () => null;\n',
  'src/app/_internal/page.tsx': 'export default () => null;\n',
};
const csrf = (patterns: string): Record<string, string> => ({ 'src/lib/csrf.ts': `export const CSRF_EXEMPT = [${patterns}] as const;\n` });
const declare = (match: string) => ({ guardExemptions: [{ file: 'src/lib/csrf.ts', constant: 'CSRF_EXEMPT', match }] });
const run = (files: Record<string, string>, next?: Record<string, unknown>) =>
  Law.check(nextCtx(nextApp({ ...ROUTES, ...files }), next));

describe('GuardExemptionMatchesARouteLaw', () => {
  it('red: a prefix that matches no route; green: the ones that do, with coverage in metrics', () => {
    const result = run(csrf("'/api/webhooks/', '/api/webhook/stripe', '/login'"), declare('prefix'));
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/lib\/csrf\.ts:1: CSRF_EXEMPT pattern '\/api\/webhook\/stripe' \(prefix\) matches no route of 4/),
    ]);
    expect(result.metrics?.exemptionCoverage).toEqual({
      "src/lib/csrf.ts#CSRF_EXEMPT: /api/webhooks/": '1: /api/webhooks/stripe',
      "src/lib/csrf.ts#CSRF_EXEMPT: /api/webhook/stripe": '0: ',
      "src/lib/csrf.ts#CSRF_EXEMPT: /login": '1: /login',
    });
  });

  it('exact: a concrete path matches a dynamic route; a prefix-only path does not', () => {
    const result = run(csrf("'/api/users/42', '/api/users'"), declare('exact'));
    expect(result.violations).toEqual([expect.stringContaining("pattern '/api/users' (exact) matches no route")]);
  });

  it('a private folder is not a route; a catch-all absorbs the rest', () => {
    const result = run(csrf("'/_internal', '/docs/a/b'"), declare('exact'));
    expect(result.violations).toEqual([expect.stringContaining("pattern '/_internal' (exact) matches no route")]);
  });

  it('glob and regex (string and RegExp literal)', () => {
    expect(run(csrf("'/api/users/*', '/api/nothing/**'"), declare('glob')).violations).toEqual([
      expect.stringContaining("'/api/nothing/**' (glob) matches no route"),
    ]);
    expect(run(csrf("'^/api/users/\\\\d+$', /^\\/docs\\//"), declare('regex')).violations).toEqual([]);
  });

  it('fails closed: a non-literal list, a missing constant, a missing file', () => {
    expect(run({ 'src/lib/csrf.ts': 'export const CSRF_EXEMPT = buildList();\n' }, declare('prefix')).violations).toEqual([
      expect.stringContaining('is not a literal array (buildList())'),
    ]);
    expect(run({ 'src/lib/csrf.ts': "export const CSRF_EXEMPT = ['/login', PREFIX];\n" }, declare('prefix')).violations).toEqual([
      expect.stringContaining('holds a non-literal element (PREFIX)'),
    ]);
    expect(run({ 'src/lib/csrf.ts': 'export const OTHER = [];\n' }, declare('prefix')).violations).toEqual([
      expect.stringContaining('is not a top-level const in this file'),
    ]);
    expect(run({}, declare('prefix')).violations).toEqual([expect.stringContaining('cannot be read: the file is missing')]);
  });

  it('fails closed when nothing is declared; [] declares there is no list', () => {
    expect(run({}).violations).toEqual([expect.stringContaining('thresholds.next.guardExemptions is not declared')]);
    expect(run({}, { guardExemptions: [] }).violations).toEqual([]);
    expect(run({}, { guardExemptions: [{ file: 'x.ts', constant: 'X' }] }).violations).toEqual([
      expect.stringContaining('guardExemptions[0] needs a file, a constant and a match'),
    ]);
  });

  it('fails when the parser cannot be loaded', () => {
    const root = nextApp({ ...ROUTES, ...csrf("'/login'") });
    const result = withoutTypeScript(() => Law.check(nextCtx(root, declare('prefix'))));
    expect(result.violations).toEqual([expect.stringMatching(/^src\/lib\/csrf\.ts: could not load/)]);
  });

  it('is selected with next only', () => {
    const card = NEXT_SERVER_LAWS.find(law => law.checkFunction === 'GuardExemptionMatchesARouteLaw.check');
    expect(lawRequirementsMet(card?.requires, nextApp({}))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ express: '5.0.0' }) }))).toBe(false);
  });
});
