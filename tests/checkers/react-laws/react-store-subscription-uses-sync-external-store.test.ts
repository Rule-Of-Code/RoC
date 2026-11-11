/**
 * ReactStoreSubscriptionUsesSyncExternalStore (#238): an effect subscription
 * whose callback only copies the source into useState is reported.
 */
import { ReactStoreSubscriptionUsesSyncExternalStoreLaw } from '../../../src/checkers/react-laws/react-store-subscription-uses-sync-external-store';
import { removeProjects } from '../toolkit-fixture';
import { describeFailsClosed, describeSelection, REACT_DEPS, run } from './react-law-fixture';

afterAll(removeProjects);

const law = ReactStoreSubscriptionUsesSyncExternalStoreLaw;
const check = (body: string) =>
  run(law, {
    'src/online.tsx': [
      "import { useEffect, useState, useSyncExternalStore } from 'react';",
      'export function useOnline() {',
      '  const [online, setOnline] = useState(true);',
      body,
      '  return online;',
      '}',
    ].join('\n'),
  });

describe('ReactStoreSubscriptionUsesSyncExternalStoreLaw (#238) — red', () => {
  it.each([
    ['store.subscribe(() => setX(…))', '  useEffect(() => store.subscribe(() => setOnline(store.get())), []);', 'subscribe'],
    [
      "addEventListener('online', function () { setX(…); })",
      "  useEffect(() => { const on = () => 0; window.addEventListener('online', function () { setOnline(navigator.onLine); }); return () => 0; }, []);",
      'addEventListener',
    ],
    [
      'a block callback with one setter call',
      "  useEffect(() => { media.addEventListener('change', e => { setOnline(e.matches); }); return () => 0; }, []);",
      'addEventListener',
    ],
  ])('%s', (_name, body, call) => {
    const result = check(body);
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(new RegExp(`^src/online\\.tsx:4: an effect's ${call} callback only copies the source into useState`)),
    ]);
  });
});

describe('ReactStoreSubscriptionUsesSyncExternalStoreLaw (#238) — green', () => {
  it.each([
    ['useSyncExternalStore itself', '  const v = useSyncExternalStore(store.subscribe, store.get, () => true);'],
    ['a callback that does more than set state', "  useEffect(() => store.subscribe(() => { log('x'); setOnline(store.get()); }), []);"],
    ['a callback that calls something that is not a setter', '  useEffect(() => store.subscribe(() => render()), []);'],
    ['a callback passed by name', '  useEffect(() => store.subscribe(onChange), []);'],
    ['a setter call outside any effect', "  window.addEventListener('online', () => setOnline(true));"],
  ])('%s', (_name, body) => {
    expect(check(body).violations).toEqual([]);
  });

  it('a file with no useState setter is not reported', () => {
    const result = run(law, {
      'src/x.tsx': "import { useEffect } from 'react';\nexport function X() { useEffect(() => store.subscribe(() => setOnline(1)), []); return null; }",
    });
    expect(result.violations).toEqual([]);
  });
});

describeFailsClosed('ReactStoreSubscriptionUsesSyncExternalStoreLaw', law, REACT_DEPS);
describeSelection('ReactStoreSubscriptionUsesSyncExternalStoreLaw.check', REACT_DEPS);
