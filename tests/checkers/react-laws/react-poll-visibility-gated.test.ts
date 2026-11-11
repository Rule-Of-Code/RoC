/**
 * ReactPollVisibilityGated (#241): a setInterval that fetches lives in a file
 * that reacts to page visibility, or in the configured poll helper.
 */
import { ReactPollVisibilityGatedLaw } from '../../../src/checkers/react-laws/react-poll-visibility-gated';
import { ctx, removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, reactProject, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactPollVisibilityGatedLaw;
const hook = (body: string): string =>
  ["import { useEffect } from 'react';", 'export function usePoll(url: string) {', body, '}'].join('\n');
const check = (body: string) => run(law, { 'src/use-poll.ts': hook(body) });

describe('ReactPollVisibilityGatedLaw (#241) — red', () => {
  it.each([
    ['an inline callback that fetches', '  useEffect(() => { const id = setInterval(() => fetch(url), 5000); return () => clearInterval(id); }, [url]);'],
    ['window.setInterval', '  useEffect(() => { const id = window.setInterval(async () => { await fetch(url); }, 5000); return () => clearInterval(id); }, [url]);'],
    [
      'a callback named, declared in the same file',
      '  useEffect(() => { async function load() { await fetch(url); } const id = setInterval(load, 5000); return () => clearInterval(id); }, [url]);',
    ],
    [
      'a callback that calls a same-file function which fetches',
      '  useEffect(() => { const load = () => fetch(url); const id = setInterval(() => { void load(); }, 5000); return () => clearInterval(id); }, [url]);',
    ],
  ])('%s', (_name, body) => {
    const result = check(body);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(/^src\/use-poll\.ts:3: setInterval polls with fetch and nothing in the file reacts to visibilitychange/),
    ]);
  });
});

describe('ReactPollVisibilityGatedLaw (#241) — green', () => {
  it.each([
    [
      'a visibilitychange listener in the file',
      "  useEffect(() => { const id = setInterval(() => fetch(url), 5000); document.addEventListener('visibilitychange', onVis); return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); }; }, [url]);",
    ],
    [
      'a visibilityState check in the callback',
      "  useEffect(() => { const id = setInterval(() => { if (document.visibilityState === 'visible') fetch(url); }, 5000); return () => clearInterval(id); }, [url]);",
    ],
    ['document.hidden', '  useEffect(() => { const id = setInterval(() => { if (!document.hidden) fetch(url); }, 5000); return () => clearInterval(id); }, [url]);'],
    ['an interval that does not fetch (a clock)', '  useEffect(() => { const id = setInterval(() => tick(), 1000); return () => clearInterval(id); }, []);'],
    ['visibilitychange only in a comment does not count — but nothing polls here', '  // visibilitychange'],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it("'visibilitychange' in a comment is not handling it", () => {
    const body = '  // visibilitychange is handled elsewhere\n  useEffect(() => { const id = setInterval(() => fetch(url), 5000); return () => clearInterval(id); }, [url]);';
    expect(check(body).violations).toHaveLength(1);
  });

  it('the configured poll helper is trusted (thresholds.react.pollHelpers)', () => {
    const root = reactProject({
      'src/lib/poller.ts': hook('  useEffect(() => { const id = setInterval(() => fetch(url), 5000); return () => clearInterval(id); }, [url]);'),
    });
    const configured = law.check(ctx(root, { thresholds: { react: { pollHelpers: ['src/lib/poller.ts'] } } }));
    expect(configured.violations).toEqual([]);
    // control: the same file, not configured, IS found
    expect(law.check(ctx(root)).violations).toHaveLength(1);
  });
});

describeFailsClosed('ReactPollVisibilityGatedLaw', law, REACT_DEPS);
describeSelection('ReactPollVisibilityGatedLaw.check', REACT_DEPS);
