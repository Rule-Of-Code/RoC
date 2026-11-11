/**
 * ReactHrefSchemeGuarded (#248): a non-literal <a href> / <iframe src> must
 * have a scheme fixed by the code or pass a configured URL guard.
 */
import {
  prefixFixesScheme,
  ReactHrefSchemeGuardedLaw,
} from '../../../src/checkers/react-laws/react-href-scheme-guarded';
import { REACT_SECURITY_LAWS } from '../../../src/data/react-security-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const REACT = { 'package.json': manifest({ react: '19.3.0' }) };
const check = (jsx: string, overrides: Record<string, unknown> = {}) =>
  ReactHrefSchemeGuardedLaw.check(
    ctx(project({ ...REACT, 'src/Card.tsx': `export const Card = ({ user, id, q }) => (\n  ${jsx}\n);` }), overrides)
  );
const violations = (result: { violations?: string[] }): string[] => result.violations ?? [];

describe('prefixFixesScheme', () => {
  it.each(['/users/', './a', '../a', '#top', '?q=', 'users/', 'https://x.io/', 'mailto:', '//cdn.example.com/'])(
    'fixed: %j',
    prefix => expect(prefixFixesScheme(prefix)).toBe(true)
  );
  it.each(['', 'java', 'javascript:', 'data:text/html,', 'vbscript:', 'users'])('not fixed: %j', prefix =>
    expect(prefixFixesScheme(prefix)).toBe(false)
  );
});

describe('ReactHrefSchemeGuarded (#248): red', () => {
  it('a user-supplied URL on <a href>, with file and line', () => {
    expect(violations(check('<a href={user.website}>site</a>'))).toEqual([
      expect.stringMatching(/^src\/Card\.tsx:2: <a href=\{user\.website\}> — the URL's scheme is not fixed by the code/),
    ]);
  });

  it('a user-supplied URL on <iframe src>', () => {
    expect(violations(check('<iframe src={user.embed} />'))).toHaveLength(1);
  });

  it('a template whose static start does not fix the scheme', () => {
    expect(violations(check('<a href={`${user.base}/profile`}>p</a>'))).toHaveLength(1);
  });

  it("a + chain that could spell javascript: ('java' + rest)", () => {
    expect(violations(check("<a href={'java' + user.rest}>x</a>"))).toHaveLength(1);
  });

  it('one safe and one unsafe branch', () => {
    expect(violations(check("<a href={id ? `/u/${id}` : user.website}>x</a>"))).toHaveLength(1);
  });

  it('a call that is not a configured guard', () => {
    expect(violations(check('<a href={toUrl(user.website)}>x</a>'))).toHaveLength(1);
  });
});

describe('ReactHrefSchemeGuarded (#248): green', () => {
  it.each([
    ['a string attribute', '<a href="/about">a</a>'],
    ['a literal in braces', "<a href={'/about'}>a</a>"],
    ['a path template', '<a href={`/users/${id}`}>u</a>'],
    ['a fixed https template', '<iframe src={`https://maps.example.com/embed?q=${q}`} />'],
    ['a fixed + chain', "<a href={'/users/' + id}>u</a>"],
    ['both branches fixed', "<a href={id ? `/u/${id}` : '/u'}>u</a>"],
    ['a fixed branch and undefined', "<a href={id ? `/u/${id}` : undefined}>u</a>"],
    ['an element the law does not judge', '<img src={user.avatar} alt="" />'],
    ['an <a> without href', '<a onClick={go}>x</a>'],
  ])('%s', (_label, jsx) => {
    expect(check(jsx).violations).toEqual([]);
  });

  it('a configured URL guard', () => {
    const result = check('<a href={safeUrl(user.website)}>x</a>', { thresholds: { react: { urlGuards: ['safeUrl'] } } });
    expect(result.violations).toEqual([]);
  });

  it('control: the same file without the guard configured is red', () => {
    expect(check('<a href={safeUrl(user.website)}>x</a>').passed).toBe(false);
  });
});

describe('ReactHrefSchemeGuarded (#248): cannot read', () => {
  it('fails when the parser cannot be loaded', () => {
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = check('<a href="/about">a</a>');
      expect(result.passed).toBe(false);
      expect(violations(result)).toEqual([expect.stringMatching(/could not load the 'typescript' package/)]);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('ReactHrefSchemeGuarded (#248): selection', () => {
  const card = REACT_SECURITY_LAWS.find(law => law.checkFunction === 'ReactHrefSchemeGuardedLaw.check');

  it('selected with react, not without it; warning by default', () => {
    expect(card?.defaultSeverity).toBe('warning');
    expect(lawRequirementsMet(card?.requires, project(REACT))).toBe(true);
    expect(lawRequirementsMet(card?.requires, project({ 'package.json': manifest({ '@angular/core': '20.0.0' }) }))).toBe(false);
    expect(lawRequirementsMet(card?.requires, project({ 'pyproject.toml': "[project]\nname = 'x'\n" }))).toBe(false);
  });
});
