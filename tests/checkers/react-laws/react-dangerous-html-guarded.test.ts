/**
 * ReactDangerousHtmlGuarded (#223): every dangerouslySetInnerHTML is judged on
 * the syntax tree — literal, sanitizer, allow-listed function with a reason,
 * or JSON with '<' escaped — and a file it cannot parse fails, never passes.
 */
import { ReactDangerousHtmlGuardedLaw } from '../../../src/checkers/react-laws/react-dangerous-html-guarded';
import { REACT_SECURITY_LAWS } from '../../../src/data/react-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const REACT = { 'package.json': manifest({ react: '19.3.0', 'react-dom': '19.3.0' }) };
const check = (code: string, overrides: Record<string, unknown> = {}, file = 'src/Post.tsx') =>
  ReactDangerousHtmlGuardedLaw.check(ctx(project({ ...REACT, [file]: code }), overrides));
const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];
const sink = (html: string): string =>
  `export const Post = ({ body, data }) => (\n  <div dangerouslySetInnerHTML={{ __html: ${html} }} />\n);`;

describe('ReactDangerousHtmlGuarded (#223): red', () => {
  it('a raw prop as __html, named with file and line', () => {
    expect(violations(check(sink('body')))).toEqual([
      expect.stringMatching(/^src\/Post\.tsx:2: __html is `body` — not a literal, a sanitizer call/),
    ]);
  });

  it('a template literal with a substitution', () => {
    expect(violations(check(sink('`<b>${body}</b>`')))).toHaveLength(1);
  });

  it('JSON.stringify in a <script> without the < escape names the escape', () => {
    const code =
      'export const Ld = ({ data }) => (\n  <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />\n);';
    expect(violations(check(code))).toEqual([
      expect.stringMatching(/:2: __html is JSON\.stringify\(\.\.\.\), which does not escape '<'/),
    ]);
  });

  it("an escape that is not \\u003c (a bare '\\u003c' string is '<' itself)", () => {
    expect(violations(check(sink("JSON.stringify(data).replace(/</g, '\\u003c')")))).toHaveLength(1);
  });

  it('a sanitizer-looking call that is not configured', () => {
    expect(violations(check(sink('cleanHtml(body)')))).toHaveLength(1);
  });

  it('a variable instead of { __html } cannot be read: flagged as unreadable', () => {
    const code = 'export const Post = ({ html }) => <div dangerouslySetInnerHTML={html} />;';
    expect(violations(check(code))).toEqual([
      expect.stringMatching(/dangerouslySetInnerHTML is given `html`, not an object literal/),
    ]);
  });

  it('the props-object form (createElement) is a sink too', () => {
    const code =
      "import { createElement } from 'react';\nexport const P = (b) => createElement('div', { dangerouslySetInnerHTML: { __html: b } });";
    expect(violations(check(code, {}, 'src/p.ts'))).toEqual([expect.stringMatching(/^src\/p\.ts:2: __html is `b`/)]);
  });

  it('a .jsx file is read too', () => {
    expect(violations(check(sink('body'), {}, 'src/Post.jsx'))).toHaveLength(1);
  });

  it('an allow-listed function without a reason is reported and not honoured', () => {
    const result = check(sink('renderMarkdown(body)'), {
      thresholds: { react: { trustedHtmlFunctions: [{ name: 'renderMarkdown', reason: ' ' }] } },
    });
    expect(violations(result)).toEqual([
      expect.stringMatching(/^thresholds\.react\.trustedHtmlFunctions: 'renderMarkdown' has no reason/),
      expect.stringMatching(/__html is `renderMarkdown\(body\)`/),
    ]);
  });
});

describe('ReactDangerousHtmlGuarded (#223): green', () => {
  it.each([
    ['a string literal', "'<b>hi</b>'"],
    ['a template literal without substitutions', '`<b>hi</b>`'],
    ['literals behind ?:', "body ? '<b>a</b>' : '<i>b</i>'"],
    ['DOMPurify.sanitize', 'DOMPurify.sanitize(body)'],
    ['DOMPurify.sanitize through a cast', 'DOMPurify.sanitize(body) as string'],
    ['JSON with < escaped (the Next JSON-LD form)', "JSON.stringify(data).replace(/</g, '\\\\u003c')"],
  ])('%s', (_label, html) => {
    expect(check(sink(html)).violations).toEqual([]);
  });

  it('a configured sanitizer', () => {
    const result = check(sink('purify.sanitize(body)'), {
      thresholds: { security: { htmlSanitizers: ['purify.sanitize'] } },
    });
    expect(result.violations).toEqual([]);
  });

  it('an allow-listed function with a reason', () => {
    const result = check(sink('renderMarkdown(body)'), {
      thresholds: { react: { trustedHtmlFunctions: [{ name: 'renderMarkdown', reason: 'escapes all input; no raw HTML' }] } },
    });
    expect(result.violations).toEqual([]);
  });

  it('a configured JSON serializer', () => {
    const result = check(sink('serialize(data)'), { thresholds: { react: { jsonSerializers: ['serialize'] } } });
    expect(result.violations).toEqual([]);
  });

  it('dangerouslySetInnerHTML only in a comment or a string is not a sink', () => {
    const code = "// never use dangerouslySetInnerHTML={{ __html: body }}\nexport const note = 'dangerouslySetInnerHTML';";
    expect(check(code).passed).toBe(true);
  });

  it('a test file is not source', () => {
    const root = project({ ...REACT, 'src/Post.test.tsx': sink('body') });
    expect(ReactDangerousHtmlGuardedLaw.check(ctx(root)).passed).toBe(true);
  });
});

describe('ReactDangerousHtmlGuarded (#223): cannot read', () => {
  it('fails, naming the files, when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check(sink("'<b>literal</b>'"));
      expect(result.passed).toBe(false);
      expect(violations(result)).toEqual([expect.stringMatching(/^1 file\(s\): could not load the 'typescript' package/)]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ReactDangerousHtmlGuarded (#223): selection', () => {
  const card = REACT_SECURITY_LAWS.find(law => law.checkFunction === 'ReactDangerousHtmlGuardedLaw.check');

  it('is selected where a workspace manifest declares react', () => {
    expect(card?.requires).toEqual({ anyDependency: ['react'] });
    expect(lawRequirementsMet(card?.requires, project(REACT))).toBe(true);
    expect(
      lawRequirementsMet(
        card?.requires,
        project({
          'package.json': JSON.stringify({ name: 'mono', workspaces: ['apps/*'] }),
          'apps/web/package.json': manifest({ next: '16.4.6', react: '19.3.0' }),
        })
      )
    ).toBe(true);
  });

  it('is not selected on an Angular or a Python project', () => {
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': "[project]\nname = 'x'\n" }))).toBe(false);
  });
});
