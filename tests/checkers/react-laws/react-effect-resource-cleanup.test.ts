/**
 * ReactEffectResourceCleanup (#224): an effect that starts a resource returns
 * a cleanup — read from the effect's parse, not from the file's text.
 */
import { ReactEffectResourceCleanupLaw } from '../../../src/checkers/react-laws/react-effect-resource-cleanup';
import { removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactEffectResourceCleanupLaw;
const component = (body: string, imports = "import { useEffect, useState } from 'react';"): string =>
  [imports, 'export function Clock() {', body, '  return null;', '}'].join('\n');
const check = (body: string, imports?: string) =>
  run(law, { 'src/clock.tsx': component(body, imports) });

describe('ReactEffectResourceCleanupLaw (#224) — red', () => {
  it.each([
    ['setInterval', '  useEffect(() => { setInterval(() => tick(), 1000); }, []);'],
    ['setInterval', '  useEffect(() => { window.setInterval(tick, 1000); }, []);'],
    ['addEventListener', "  useEffect(() => { window.addEventListener('resize', onResize); }, []);"],
    ['new ResizeObserver', '  useEffect(() => { const o = new ResizeObserver(cb); o.observe(el); }, []);'],
    ['new IntersectionObserver', '  useEffect(() => { new IntersectionObserver(cb).observe(el); }, []);'],
    ['new WebSocket', "  useEffect(() => { const ws = new WebSocket('wss://x'); ws.onmessage = m; }, []);"],
    ['new EventSource', "  useEffect(() => { const es = new EventSource('/s'); }, []);"],
    ['subscribe', '  useEffect(() => { store.subscribe(render); }, []);'],
    ['requestAnimationFrame', '  useEffect(() => { requestAnimationFrame(draw); }, []);'],
    ['addEventListener', "  useLayoutEffect(() => { document.addEventListener('keydown', k); }, []);"],
  ])('starts %s with no returned cleanup: %s', (started, body) => {
    const result = check(body, "import { useEffect, useLayoutEffect } from 'react';");
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations?.[0]).toMatch(/^src\/clock\.tsx:3: use(Layout)?Effect starts .* and returns no cleanup/);
    expect(result.violations?.[0]).toContain(`starts ${started}`);
  });

  it('a start inside a nested handler of the setup counts (still lexically the effect)', () => {
    const body = '  useEffect(() => { function start() { setInterval(tick, 10); } start(); }, []);';
    expect(check(body).violations).toHaveLength(1);
  });

  it('an early bare `return;` is not a cleanup', () => {
    const body = "  useEffect(() => { if (!el) return; el.addEventListener('x', h); }, [el]);";
    expect(check(body).violations).toHaveLength(1);
  });

  it('a concise body returning an interval id is not a cleanup', () => {
    expect(check('  useEffect(() => setInterval(tick, 1000), []);').violations).toHaveLength(1);
  });

  it('React.useEffect through the namespace import is read', () => {
    const body = '  React.useEffect(() => { setInterval(tick, 1000); }, []);';
    expect(check(body, "import * as React from 'react';").violations).toHaveLength(1);
  });

  it('a reason comment without a reason does not answer it', () => {
    const body = ['  // roc-allow-effect-without-cleanup:', '  useEffect(() => { requestAnimationFrame(draw); }, []);'].join('\n');
    expect(check(body).violations).toHaveLength(1);
  });
});

describe('ReactEffectResourceCleanupLaw (#224) — green', () => {
  it.each([
    ['clearInterval in a returned arrow', '  useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);'],
    ['a returned named function', "  useEffect(() => { const stop = () => window.removeEventListener('r', h); window.addEventListener('r', h); return stop; }, []);"],
    ['a concise subscribe (returns the unsubscribe)', '  useEffect(() => store.subscribe(render), []);'],
    ['return of the subscribe result', '  useEffect(() => { return store.subscribe(render); }, []);'],
    ['an effect that starts nothing', "  useEffect(() => { document.title = 'x'; }, []);"],
    ['setTimeout is not a repeating resource', '  useEffect(() => { setTimeout(tick, 10); }, []);'],
    ['a setup passed by reference is not read', '  useEffect(subscribeAll, []);'],
    ['an inline reason on the line above', ['  // roc-allow-effect-without-cleanup: runs once, the frame cannot outlive the mount', '  useEffect(() => { requestAnimationFrame(draw); }, []);'].join('\n')],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it('a useEffect that is not React\'s is not read', () => {
    const body = '  useEffect(() => { setInterval(tick, 1000); }, []);';
    expect(check(body, "import { useEffect } from 'some-other-lib';").violations).toEqual([]);
  });

  it('the setInterval inside a comment or a string is not code', () => {
    const body = "  useEffect(() => { /* setInterval(tick) */ const s = 'addEventListener('; }, []);";
    expect(check(body).violations).toEqual([]);
  });

  it('control: the same file with the cleanup removed IS found (the scan sees the file)', () => {
    const red = check('  useEffect(() => { const id = setInterval(tick, 1000); }, []);');
    expect(red.violations).toHaveLength(1);
  });
});

describeFailsClosed('ReactEffectResourceCleanupLaw', law, REACT_DEPS);
describeSelection('ReactEffectResourceCleanupLaw.check', REACT_DEPS);
