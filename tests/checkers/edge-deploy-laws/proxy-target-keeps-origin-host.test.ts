/**
 * #362 — a proxy that resolves the incoming path against its origin sends a
 * // path (and /\host) to another host with the headers it adds.
 */
import { ProxyTargetKeepsOriginHostLaw } from '../../../src/checkers/edge-deploy-laws/proxy-target-keeps-origin-host';
import { EDGE_DEPLOY_SECURITY_LAWS } from '../../../src/data/edge-deploy-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { repo } from '../../utils/git-fixture';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = EDGE_DEPLOY_SECURITY_LAWS.find(
  law => law.checkFunction === 'ProxyTargetKeepsOriginHostLaw.check'
);
const check = (files: Record<string, string>) =>
  ProxyTargetKeepsOriginHostLaw.check(ctx(project(files)));

const WORKER_RED = [
  'export default {',
  '  async fetch(request: Request, env: { ORIGIN: string; SECRET: string }) {',
  '    const incoming = new URL(request.url);',
  '    const target = new URL(incoming.pathname + incoming.search, env.ORIGIN);',
  "    return fetch(target, { headers: { 'x-origin-verify': env.SECRET } });",
  '  },',
  '};',
  '',
].join('\n');

const WORKER_GREEN = [
  'export default {',
  '  async fetch(request: Request, env: { ORIGIN: string }) {',
  '    const incoming = new URL(request.url);',
  '    const target = new URL(env.ORIGIN);',
  '    target.pathname = incoming.pathname;',
  '    target.search = incoming.search;',
  '    return fetch(target);',
  '  },',
  '};',
  '',
].join('\n');

const HEALTH =
  "export default { async fetch(request: Request) { return fetch(new URL('/health', ORIGIN)); } };\n";

describe('#362 Proxy Target Keeps Origin Host — acceptance', () => {
  it('red: a Worker fetch handler resolves the incoming path against the origin and fetches it', () => {
    const result = check({ 'src/worker.ts': WORKER_RED });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^src\/worker\.ts:4: the upstream URL is resolved from the incoming request/
      ),
    ]);
  });

  it('red: the same inline, in a JS service-worker style handler', () => {
    const js =
      "addEventListener('fetch', e => e.respondWith(fetch(new URL(new URL(e.request.url).pathname, ORIGIN).href)));\n";
    expect(check({ 'worker.js': js }).violations).toEqual([
      expect.stringMatching(/^worker\.js:1:/),
    ]);
  });

  it('red: Express middleware forwarding req.originalUrl', () => {
    const js =
      'app.use(async (req, res) => {\n  const upstream = new URL(req.originalUrl, process.env.ORIGIN);\n  res.send(await axios.get(upstream.toString()));\n});\n';
    expect(check({ 'server.js': js }).violations).toEqual([
      expect.stringMatching(/^server\.js:2:/),
    ]);
  });

  it('green: the origin URL with pathname and search assigned — no URL is resolved against a base, so nothing selects the law', () => {
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'src/worker.ts': WORKER_GREEN })
      )
    ).toBe(false);
    const result = check({
      'src/worker.ts': WORKER_GREEN,
      'src/health.ts': HEALTH,
    });
    expect(result.passed).toBe(true);
    expect(result.judgedNothing).not.toBe(true);
  });

  it('green: a constant first argument', () => {
    const ts =
      "export default { async fetch(request: Request) { return fetch(new URL('/health', ORIGIN)); } };\n";
    const result = check({ 'src/worker.ts': ts });
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ filesRead: 1, judged: 1 });
  });

  it('green: a client helper whose path is the caller’s, not a request’s', () => {
    const ts =
      'export function api(path: string) {\n  return fetch(new URL(path, BASE_URL));\n}\n';
    expect(check({ 'src/api.ts': ts }).passed).toBe(true);
  });

  it('green: a request-derived URL that is never requested', () => {
    const ts =
      "export default { fetch(request: Request) { const u = new URL(request.url, BASE); return Response.json({ path: u.pathname }); } };\nconst x = fetch('/x');\n";
    expect(check({ 'src/w.ts': ts }).passed).toBe(true);
  });
});

describe('#362 — Python urljoin', () => {
  const RED = [
    'from urllib.parse import urljoin',
    'import httpx',
    '',
    '@app.api_route("/{path:path}")',
    'async def proxy(request: Request, path: str):',
    '    target = urljoin(ORIGIN, path)',
    '    async with httpx.AsyncClient() as client:',
    '        return await client.get(target, headers={"x-origin-verify": KEY})',
    '',
  ].join('\n');

  it('red: a route handler joins its path onto the origin and requests it', () => {
    expect(check({ 'app/proxy.py': RED }).violations).toEqual([
      expect.stringMatching(/^app\/proxy\.py:6:/),
    ]);
  });

  it('green: a constant url', () => {
    const py = RED.replace(
      'urljoin(ORIGIN, path)',
      'urljoin(ORIGIN, "/health")'
    );
    expect(check({ 'app/proxy.py': py }).passed).toBe(true);
  });
});

describe('#362 — selection is the subject, and the gate set is the read set', () => {
  it('a project without a URL built against a base does not select the law', () => {
    const root = project({
      'src/a.ts': "export const r = fetch(new URL('https://x.example/a'));\n",
      'app/m.py': 'print(1)\n',
    });
    expect(lawRequirementsMet(LAW?.requires, root)).toBe(false);
  });

  it('an untracked, not-ignored proxy file selects the law and is judged; git-ignored selects nothing', () => {
    const files = { 'src/worker.ts': WORKER_RED, 'README.md': '# x\n' };
    const untracked = repo(files, ['README.md']);
    expect(lawRequirementsMet(LAW?.requires, untracked)).toBe(true);
    expect(
      ProxyTargetKeepsOriginHostLaw.check(ctx(untracked)).violations
    ).toHaveLength(1);
    const ignored = repo({ ...files, '.gitignore': 'src/\n' }, [
      'README.md',
      '.gitignore',
    ]);
    expect(lawRequirementsMet(LAW?.requires, ignored)).toBe(false);
  });

  it('new URL(x, base) in a comment or in a string does not select the law', () => {
    const root = project({
      'src/doc.ts':
        "/**\n * new URL(path, base) resolves // as a host\n */\n// new URL(p, b)\nexport const text = 'every new URL(a, b) with a base';\nexport const f = () => fetch('/x');\n",
    });
    expect(lawRequirementsMet(LAW?.requires, root)).toBe(false);
  });

  it('ignores.global: the file is neither a selector nor judged', () => {
    const root = project({ 'legacy/worker.ts': WORKER_RED });
    expect(lawRequirementsMet(LAW?.requires, root, ['legacy/**'])).toBe(false);
  });

  it('no file read → judged nothing, never a pass', () => {
    const result = check({ 'README.md': '# x\n' });
    expect(result.judgedNothing).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('a pass counts the URLs judged and the files read', () => {
    const result = check({ 'src/health.ts': HEALTH });
    expect(result.message).toMatch(
      /1 URL\(s\) built against a base judged in 1 file\(s\), no finding; not seen:/
    );
  });
});
