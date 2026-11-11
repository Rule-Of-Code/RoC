/**
 * ReactEffectFetchRaceGuarded (#225): a fetch in an effect is aborted in the
 * cleanup or guarded by an ignore flag the cleanup sets.
 */
import { ReactEffectFetchRaceGuardedLaw } from '../../../src/checkers/react-laws/react-effect-fetch-race-guarded';
import { removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactEffectFetchRaceGuardedLaw;
const check = (body: string) =>
  run(law, {
    'src/user.tsx': [
      "import { useEffect, useState } from 'react';",
      'export function User({ id }: { id: string }) {',
      '  const [user, setUser] = useState(null);',
      body,
      '  return null;',
      '}',
    ].join('\n'),
  });

describe('ReactEffectFetchRaceGuardedLaw (#225) — red', () => {
  it('a bare fetch with no guard', () => {
    const result = check('  useEffect(() => { fetch(`/u/${id}`).then(r => r.json()).then(setUser); }, [id]);');
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/user\.tsx:4: useEffect runs a fetch with neither an aborted signal nor an ignore flag/),
    ]);
  });

  it('a fetch inside an async helper declared in the setup', () => {
    const body = '  useEffect(() => { async function load() { const r = await fetch(url); setUser(await r.json()); } load(); }, [id]);';
    expect(check(body).violations).toHaveLength(1);
  });

  it('a signal passed but never aborted in the cleanup', () => {
    const body = '  useEffect(() => { const c = new AbortController(); fetch(url, { signal: c.signal }).then(setUser); }, [id]);';
    expect(check(body).violations).toEqual([expect.stringContaining('never calls abort()')]);
  });

  it('one of two fetches without the signal', () => {
    const body = [
      '  useEffect(() => {',
      '    const c = new AbortController();',
      '    fetch(a, { signal: c.signal });',
      '    fetch(b);',
      '    return () => c.abort();',
      '  }, [id]);',
    ].join('\n');
    expect(check(body).violations).toEqual([expect.stringContaining('runs 2 fetches')]);
  });

  it('a flag the cleanup sets but the setup never reads', () => {
    const body = [
      '  useEffect(() => {',
      '    let ignore = false;',
      '    fetch(url).then(r => r.json()).then(setUser);',
      '    return () => { ignore = true; };',
      '  }, [id]);',
    ].join('\n');
    expect(check(body).violations).toHaveLength(1);
  });

});

describe('ReactEffectFetchRaceGuardedLaw (#225) — green', () => {
  it.each([
    [
      'AbortController aborted in the cleanup',
      '  useEffect(() => { const c = new AbortController(); fetch(url, { signal: c.signal }).then(setUser); return () => c.abort(); }, [id]);',
    ],
    [
      'shorthand signal',
      '  useEffect(() => { const c = new AbortController(); const signal = c.signal; fetch(url, { signal }); return () => { c.abort(); }; }, [id]);',
    ],
    [
      'the React docs ignore flag',
      [
        '  useEffect(() => {',
        '    let ignore = false;',
        '    fetch(url).then(r => r.json()).then(json => { if (!ignore) setUser(json); });',
        '    return () => { ignore = true; };',
        '  }, [id]);',
      ].join('\n'),
    ],
    [
      'an active flag cleared in a named cleanup',
      [
        '  useEffect(() => {',
        '    let active = true;',
        '    const stop = () => { active = false; };',
        '    fetch(url).then(d => active && setUser(d));',
        '    return stop;',
        '  }, [id]);',
      ].join('\n'),
    ],
    [
      'a flag held on an object the setup declares',
      [
        '  useEffect(() => {',
        '    const state = { ignore: false };',
        '    fetch(url).then(d => { if (!state.ignore) setUser(d); });',
        '    return () => { state.ignore = true; };',
        '  }, [id]);',
      ].join('\n'),
    ],
    ['an effect without fetch', "  useEffect(() => { document.title = 'x'; }, []);"],
    [
      'a fetch an interval runs later (a poll, judged by React Poll Visibility Gated)',
      "  useEffect(() => { const id = setInterval(() => fetch('/ping'), 5000); return () => clearInterval(id); }, []);",
    ],
    [
      'a fetch a listener runs later',
      "  useEffect(() => { const on = () => 0; window.addEventListener('focus', () => { fetch('/x'); }); return () => 0; }, []);",
    ],
    ['a fetch only in the cleanup is not a setup fetch', "  useEffect(() => () => { navigator.sendBeacon('/bye'); }, []);"],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it('control: the guarded effect with its guard removed IS found', () => {
    const body = '  useEffect(() => { const c = new AbortController(); fetch(url, { signal: c.signal }); }, [id]);';
    expect(check(body).violations).toHaveLength(1);
  });
});

describeFailsClosed('ReactEffectFetchRaceGuardedLaw', law, REACT_DEPS);
describeSelection('ReactEffectFetchRaceGuardedLaw.check', REACT_DEPS);
