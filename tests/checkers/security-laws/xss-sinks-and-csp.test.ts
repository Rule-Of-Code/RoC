/**
 * #212: the two XSS laws. legacyId 43 judges the DOM sinks, one violation per
 * sink, with the sanitizer judged in the sink's own statement; legacyId 44
 * judges the Content-Security-Policy, read from every place it is declared,
 * and fails when it found neither an entry nor a declaration. Before, both
 * ran the same detector, so one sink gave two `error` results, React's
 * dangerouslySetInnerHTML matched `innerHTML\s*=` by accident (case-
 * insensitive), and `retrieval(` matched `eval\s*\(`.
 */
import { ContentSecurityPolicyLaw } from '../../../src/checkers/security-laws/content-security-policy';
import { XSSPreventionLaw } from '../../../src/checkers/security-laws/xss-prevention';
import { SECURITY_LAWS } from '../../../src/data/security-laws';
import { ModularLawsRegistry } from '../../../src/registry/modular-laws-registry';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];
const sinks = (files: Record<string, string>, overrides: Record<string, unknown> = {}) =>
  violations(XSSPreventionLaw.check(ctx(project(files), overrides)));
const csp = (files: Record<string, string>, overrides: Record<string, unknown> = {}) =>
  ContentSecurityPolicyLaw.check(ctx(project(files), overrides));

describe('XSS Prevention: the sinks (#212)', () => {
  it('React dangerouslySetInnerHTML is not an innerHTML assignment (it has its own law)', () => {
    expect(
      sinks({ 'src/Post.tsx': 'export const P = ({ h }) => <div dangerouslySetInnerHTML={{ __html: h }} />;' })
    ).toEqual([]);
  });

  it('control: a real innerHTML assignment through a ref is flagged, with its line', () => {
    expect(
      sinks({ 'src/Post.tsx': 'export function f(ref, h) {\n  ref.current.innerHTML = h;\n}' })
    ).toEqual([expect.stringMatching(/^XSS risk in src\/Post\.tsx:2: innerHTML\/outerHTML assignment not sanitized at the sink/)]);
  });

  it('retrieval( is not eval(; eval( is', () => {
    expect(sinks({ 'src/a.ts': 'export const r = retrieval(q);' })).toEqual([]);
    expect(sinks({ 'src/a.ts': 'export const r = eval(q);' })).toEqual([
      expect.stringMatching(/src\/a\.ts:1: eval executes a string as code/),
    ]);
  });

  it('green: DOMPurify.sanitize in the sink statement', () => {
    expect(sinks({ 'src/a.ts': 'el.innerHTML = DOMPurify.sanitize(html);' })).toEqual([]);
  });

  it('green: Angular DomSanitizer.sanitize(SecurityContext.HTML, …) in the sink statement', () => {
    expect(
      sinks({ 'src/a.ts': 'this.el.innerHTML = this.s.sanitize(SecurityContext.HTML, html) ?? "";' })
    ).toEqual([]);
  });

  it('red: a sanitizer elsewhere in the repository does not protect this sink', () => {
    expect(
      sinks({
        'src/clean.ts': "import sanitizeHtml from 'sanitize-html';\nexport const c = (h: string) => sanitizeHtml(h);",
        'src/render.ts': 'el.innerHTML = html;',
      })
    ).toEqual([expect.stringMatching(/src\/render\.ts:1/)]);
  });

  it('a configured sanitizer counts at the sink; unconfigured, the same call does not', () => {
    const files = { 'src/a.ts': 'el.innerHTML = purify(html);' };
    expect(sinks(files)).toHaveLength(1);
    expect(sinks(files, { thresholds: { security: { htmlSanitizers: ['purify'] } } })).toEqual([]);
  });

  it('eval is flagged even with a sanitizer in its statement', () => {
    expect(sinks({ 'src/a.ts': 'eval(DOMPurify.sanitize(code));' })).toHaveLength(1);
  });

  it('one violation per sink, not one per pattern per file plus a global one', () => {
    const found = sinks({
      'src/a.ts': 'a.innerHTML = x;\nb.innerHTML = y;\ndocument.write(z);\nconst same = a.innerHTML === b;',
    });
    expect(found).toHaveLength(3);
  });

  it('a sink in a comment is not a sink; line numbers survive a block comment', () => {
    expect(
      sinks({ 'src/a.ts': '/* el.innerHTML = x;\n   more */\n// eval(x)\nel.innerHTML = y;' })
    ).toEqual([expect.stringMatching(/src\/a\.ts:4:/)]);
  });

  it('it no longer reports a missing CSP — that is legacyId 44', () => {
    expect(sinks({ 'src/index.html': '<html><head></head><body></body></html>' })).toEqual([]);
  });
});

describe('Content Security Policy (#212)', () => {
  const INDEX = '<!doctype html><html><head><title>x</title></head><body></body></html>';
  const INDEX_CSP =
    '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head><body></body></html>';

  it('red: an index.html without a meta CSP and no site-wide declaration', () => {
    const result = csp({ 'apps/web/src/index.html': INDEX });
    expect(result.passed).toBe(false);
    expect(violations(result)).toEqual([
      expect.stringMatching(/^apps\/web\/src\/index\.html: no Content-Security-Policy/),
    ]);
  });

  it('green: the meta tag in the entry document', () => {
    expect(csp({ 'src/index.html': INDEX_CSP }).passed).toBe(true);
  });

  it('red: a CSP that only appears in an HTML comment declares nothing', () => {
    expect(
      csp({ 'src/index.html': '<html><head><!-- <meta http-equiv="Content-Security-Policy"> --></head></html>' }).passed
    ).toBe(false);
  });

  it.each([
    ['firebase.json', JSON.stringify({ hosting: { headers: [{ source: '**', headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'" }] }] } })],
    ['vercel.json', JSON.stringify({ headers: [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'" }] }] })],
    ['netlify.toml', '[[headers]]\n  for = "/*"\n  [headers.values]\n    Content-Security-Policy = "default-src \'self\'"\n'],
  ])('green: a site-wide declaration in %s covers the entry', (file, content) => {
    expect(csp({ 'src/index.html': INDEX, [file]: content }).violations).toEqual([]);
  });

  it('red: Content-Security-Policy-Report-Only does not block, so it does not count', () => {
    const firebase = JSON.stringify({ hosting: { headers: [{ source: '**', headers: [{ key: 'Content-Security-Policy-Report-Only', value: 'x' }] }] } });
    expect(csp({ 'src/index.html': INDEX, 'firebase.json': firebase }).passed).toBe(false);
  });

  describe('a Next app', () => {
    const NEXT = { 'package.json': manifest({ next: '16.4.6', react: '19.3.0' }), 'src/app/page.tsx': 'export default () => null;' };
    const HEADERS =
      "export default { async headers() { return [{ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: \"default-src 'self'\" }] }]; } };";

    it('red: it declares no CSP anywhere', () => {
      expect(violations(csp(NEXT))).toEqual([
        expect.stringMatching(/^\.: this Next app declares no Content-Security-Policy — none in next\.config\.\* headers\(\), proxy\.\* or middleware\.\*/),
      ]);
    });

    it.each([['next.config.ts'], ['next.config.mjs'], ['proxy.ts'], ['src/proxy.ts'], ['middleware.js']])(
      'green: declared in %s',
      file => {
        expect(csp({ ...NEXT, [file]: HEADERS }).violations).toEqual([]);
      }
    );

    it('red: the header named only in a comment of next.config.ts', () => {
      expect(csp({ ...NEXT, 'next.config.ts': '// TODO: Content-Security-Policy\nexport default {};' }).passed).toBe(false);
    });

    it('a workspace app is found by its manifest and named by its directory', () => {
      const result = csp({
        'package.json': JSON.stringify({ name: 'root', workspaces: ['apps/*'] }),
        'apps/web/package.json': manifest({ next: '16.4.6' }),
        'apps/web/src/app/page.tsx': 'export default () => null;',
      });
      expect(violations(result)).toEqual([expect.stringMatching(/^apps\/web: this Next app declares no/)]);
    });
  });

  describe('thresholds.security.cspFiles', () => {
    it('green: a named server config that sets the header', () => {
      const config = { thresholds: { security: { cspFiles: ['deploy/nginx.conf'] } } };
      const result = csp(
        { 'src/index.html': INDEX, 'deploy/nginx.conf': 'add_header Content-Security-Policy "default-src \'self\'";' },
        config
      );
      expect(result.violations).toEqual([]);
    });

    it('red: a named file that does not exist, or does not set the header', () => {
      const config = { thresholds: { security: { cspFiles: ['deploy/nginx.conf', 'missing.conf'] } } };
      const result = csp({ 'src/index.html': INDEX_CSP, 'deploy/nginx.conf': 'server { listen 80; }' }, config);
      expect(violations(result)).toEqual([
        'thresholds.security.cspFiles: deploy/nginx.conf does not set a Content-Security-Policy header',
        'thresholds.security.cspFiles: missing.conf does not exist — the CSP it is said to declare cannot be read',
      ]);
    });
  });

  it('a generated report under coverage/ is not an entry document', () => {
    expect(csp({ 'src/index.html': INDEX_CSP, 'coverage/lcov-report/index.html': INDEX }).passed).toBe(true);
  });

  it('judged nothing: no entry, no Next app, no declaration — fails, does not pass', () => {
    const result = csp({ 'src/main.ts': 'export {};' });
    expect(result.passed).toBe(false);
    expect(violations(result)).toEqual([expect.stringMatching(/^found no entry document .* this law judged nothing/)]);
  });
});

describe('routing (#212): one sink gives one result across the two laws', () => {
  const card = (legacyId: number) => SECURITY_LAWS.find(law => law.legacyId === legacyId);

  it('legacyId 43 runs the sinks, legacyId 44 the CSP', () => {
    const map = ModularLawsRegistry.LAW_CLASS_MAPPING as Record<string, unknown>;
    expect(map[card(43)?.checkFunction as string]).toBe(XSSPreventionLaw);
    expect(map[card(44)?.checkFunction as string]).toBe(ContentSecurityPolicyLaw);
  });

  it('a project with a CSP and one sink: 43 reports it once, 44 does not', () => {
    const root = project({
      'src/index.html': '<html><head><meta http-equiv="Content-Security-Policy" content="x"></head></html>',
      'src/a.ts': 'el.innerHTML = html;',
    });
    expect(violations(XSSPreventionLaw.check(ctx(root)))).toHaveLength(1);
    expect(violations(ContentSecurityPolicyLaw.check(ctx(root)))).toEqual([]);
  });
});
