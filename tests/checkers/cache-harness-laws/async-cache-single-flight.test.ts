/**
 * Async Cache Single-Flight (#374): a cache that stores only after the await
 * misses for every request of a burst; a stored future/promise that is not
 * removed when it fails caches the error. Each finding names the store's
 * file and line; a project without such a cache does not select the law.
 */
import { AsyncCacheSingleFlightLaw } from '../../../src/checkers/cache-harness-laws/async-cache-single-flight';
import { CACHE_HARNESS_LAWS } from '../../../src/data/cache-harness-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = CACHE_HARNESS_LAWS.find(
  law => law.checkFunction === 'AsyncCacheSingleFlightLaw.check'
);
const run = (files: Record<string, string>) =>
  AsyncCacheSingleFlightLaw.check(ctx(project(files)));

/** Check, await on a miss, store the value: every concurrent caller misses. */
const STORE_AFTER_AWAIT = `_profiles = {}


async def get_profile(uid):
    cached = _profiles.get(uid)
    if cached is not None:
        return cached
    snap = await db.collection("profiles").document(uid).get()
    data = snap.to_dict()
    _profiles[uid] = data
    return data
`;

/** The future is stored before the await and dropped when it raises. */
const SINGLE_FLIGHT = `import asyncio

_inflight = {}


async def get_profile(uid):
    fut = _inflight.get(uid)
    if fut is not None:
        return await fut
    fut = asyncio.ensure_future(_load(uid))
    _inflight[uid] = fut
    try:
        return await fut
    except Exception:
        _inflight.pop(uid, None)
        raise


async def _load(uid):
    return await fetch_profile(uid)
`;

describe('AsyncCacheSingleFlightLaw (#374)', () => {
  it('is selected only where git publishes an async check-then-store cache', () => {
    expect(LAW?.requires).toBeDefined();
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'app/profiles.py': STORE_AFTER_AWAIT })
      )
    ).toBe(true);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'app/handler.py':
            'async def handle(req):\n    headers = {}\n    headers["x"] = 1\n    return headers\n',
        })
      )
    ).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'app/sync.py': STORE_AFTER_AWAIT.replace('async def', 'def').replace(
            'await ',
            ''
          ),
        })
      )
    ).toBe(false);
  });

  it('red: store-after-await — named at the store, with the check and the await', () => {
    const result = run({ 'app/profiles.py': STORE_AFTER_AWAIT });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^app\/profiles\.py:10: get_profile checks _profiles \(line 5\) and stores into it only after awaiting db\.collection\("profiles"\)\.document\(uid\)\.get\(…\) \(line 8\) — concurrent callers all miss/
      ),
    ]);
  });

  it('green: the future is stored before the await and removed on exception, with a counter', () => {
    const result = run({ 'app/profiles.py': SINGLE_FLIGHT });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 async check-then-store site\(s\) in 1 file\(s\): 1 shared cache\(s\) store the in-flight future\/promise and remove it on failure/
    );
    expect(result.metrics).toMatchObject({
      filesRead: 1,
      cacheSites: 1,
      inFlightSites: 1,
    });
  });

  it('red: the future is stored but never removed when it raises (a cached error)', () => {
    const noRemoval = SINGLE_FLIGHT.replace(
      '    try:\n        return await fut\n    except Exception:\n        _inflight.pop(uid, None)\n        raise\n',
      '    return await fut\n'
    );
    expect(run({ 'app/profiles.py': noRemoval }).violations).toEqual([
      expect.stringMatching(
        /^app\/profiles\.py:11: get_profile stores the in-flight future\/promise in _inflight but never removes it when it fails/
      ),
    ]);
  });

  it('a double-checked lock (check again and store under the lock) serialises the burst: not reported', () => {
    const doubleChecked = `import asyncio

_profiles = {}
_lock = asyncio.Lock()


async def get_profile(uid):
    cached = _profiles.get(uid)
    if cached is not None:
        return cached
    async with _lock:
        cached = _profiles.get(uid)
        if cached is not None:
            return cached
        snap = await db.collection("profiles").document(uid).get()
        _profiles[uid] = snap.to_dict()
    return _profiles[uid]
`;
    expect(run({ 'app/profiles.py': doubleChecked }).violations).toEqual([]);
  });

  it('a lock around the fetch alone (no check under it) still lets every waiter fetch in turn: reported', () => {
    const lockedFetchOnly = STORE_AFTER_AWAIT.replace(
      '_profiles = {}\n',
      '_profiles = {}\n_lock = asyncio.Lock()\n'
    ).replace(
      '    snap = await db.collection("profiles").document(uid).get()\n    data = snap.to_dict()\n    _profiles[uid] = data\n',
      '    async with _lock:\n        snap = await db.collection("profiles").document(uid).get()\n        data = snap.to_dict()\n        _profiles[uid] = data\n'
    );
    expect(run({ 'app/profiles.py': lockedFetchOnly }).violations).toEqual([
      expect.stringMatching(
        /^app\/profiles\.py:12: get_profile checks _profiles/
      ),
    ]);
  });

  it('a memo the caller hands in as a parameter belongs to one call, not to concurrent requests: not reported', () => {
    const perCall = `class Items:
    async def zone_of(self, group_id, memo):
        if group_id not in memo:
            group = await self._groups.get(group_id)
            memo[group_id] = None if group is None else group.zone
        return memo[group_id]


_shared = {}


async def shared_zone(group_id):
    if group_id not in _shared:
        _shared[group_id] = await load_zone(group_id)
    return _shared[group_id]
`;
    expect(run({ 'app/items.py': perCall }).violations).toEqual([
      expect.stringMatching(
        /^app\/items\.py:14: shared_zone checks _shared \(line 13\)/
      ),
    ]);
  });

  it('a dict built inside the function is a per-call value: judged (counted), not reported', () => {
    const local =
      'async def collect(ids):\n    out = {}\n    for i in ids:\n        if i in out:\n            continue\n        out[i] = await fetch(i)\n    return out\n';
    const result = run({ 'app/collect.py': local });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ cacheSites: 1, perCallSites: 1 });
  });

  it('a check and a store with nothing async between them do not select the law', () => {
    const split =
      'REGISTRY = {}\n\n\nasync def known(name):\n    return REGISTRY.get(name)\n\n\ndef register(name, value):\n    REGISTRY[name] = value\n';
    expect(
      lawRequirementsMet(LAW?.requires, project({ 'app/registry.py': split }))
    ).toBe(false);
  });

  it('judged nothing only when no file could be read: called on a project with none', () => {
    const result = run({ 'app/main.py': 'print(1)\n' });
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
    expect(result.violations?.[0]).toMatch(
      /nothing was judged — no file that selected the law could be read/
    );
  });

  describe('a sync memo in a build script (.mjs) — the site generator shape', () => {
    // A slug registry: check, then store, nothing awaited — there is nothing to coalesce.
    const SYNC_MEMO = [
      'const seen = new Map();',
      'for (const law of laws) {',
      '  if (seen.has(law.urlSlug)) {',
      '    throw new Error(`duplicate slug "${seen.get(law.urlSlug)}" and "${law.name}"`);',
      '  }',
      '  seen.set(law.urlSlug, law.name);',
      '}',
      "const loaders = 'new Map<string, () => Promise<unknown>>([' + laws.map(l => `import('./${l.urlSlug}.json').then(m => m.default)`).join(',') + '])';",
      '',
    ].join('\n');

    it('does not select the law', () => {
      expect(
        lawRequirementsMet(
          LAW?.requires,
          project({ 'tools/generate-registry.mjs': SYNC_MEMO })
        )
      ).toBe(false);
    });

    it('selected by an await between check and store, but the stored value is not awaited: a pass with the counter, never judged nothing', () => {
      const awaitedLog = [
        'const seen = new Map();',
        'export async function build(laws) {',
        '  for (const law of laws) {',
        '    if (seen.has(law.urlSlug)) continue;',
        '    await log(law.urlSlug);',
        '    seen.set(law.urlSlug, law.name);',
        '  }',
        '}',
        '',
      ].join('\n');
      const files = { 'tools/generate-registry.mjs': awaitedLog };
      expect(lawRequirementsMet(LAW?.requires, project(files))).toBe(true);
      const result = run(files);
      expect(result.judgedNothing).toBeUndefined();
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(
        /1 file\(s\) read, 0 functions that check a keyed container and store an awaited or in-flight value into it — nothing to judge \(1 sync check-then-store site\(s\) read/
      );
      expect(result.metrics).toMatchObject({
        filesRead: 1,
        cacheSites: 0,
        syncSites: 1,
      });
    });

    it('red: store-after-await in an .mjs module', () => {
      const storeAfterAwait = [
        'const profiles = new Map();',
        'export async function getProfile(id) {',
        '  if (profiles.has(id)) return profiles.get(id);',
        '  const value = await loadProfile(id);',
        '  profiles.set(id, value);',
        '  return value;',
        '}',
        '',
      ].join('\n');
      const files = { 'tools/profiles.mjs': storeAfterAwait };
      expect(lawRequirementsMet(LAW?.requires, project(files))).toBe(true);
      expect(run(files).violations).toEqual([
        expect.stringMatching(
          /^tools\/profiles\.mjs:5: getProfile checks profiles \(line 3\) and stores into it only after awaiting loadProfile\(…\) \(line 4\)/
        ),
      ]);
    });
  });

  describe('TS/JS', () => {
    const STORE_AFTER_AWAIT_TS = `const profiles = new Map<string, unknown>();

export async function getProfile(id: string) {
  if (profiles.has(id)) return profiles.get(id);
  const value = await loadProfile(id);
  profiles.set(id, value);
  return value;
}
`;
    const SINGLE_FLIGHT_TS = `const inflight = new Map<string, Promise<unknown>>();

export function getProfile(id: string) {
  const hit = inflight.get(id);
  if (hit) return hit;
  const pending = loadProfile(id).catch(err => {
    inflight.delete(id);
    throw err;
  });
  inflight.set(id, pending);
  return pending;
}
`;

    it('red: if (!cache.has(k)) { const v = await load(); cache.set(k, v) }', () => {
      expect(
        run({ 'src/profiles.ts': STORE_AFTER_AWAIT_TS }).violations
      ).toEqual([
        expect.stringMatching(
          /^src\/profiles\.ts:6: getProfile checks profiles \(line 4\) and stores into it only after awaiting loadProfile\(…\) \(line 5\)/
        ),
      ]);
    });

    it('green: the promise is stored before it settles and deleted in .catch', () => {
      expect(run({ 'src/profiles.ts': SINGLE_FLIGHT_TS }).violations).toEqual(
        []
      );
    });

    it('red: the promise is stored and never deleted when it rejects', () => {
      const cachedError = SINGLE_FLIGHT_TS.replace(
        'loadProfile(id).catch(err => {\n    inflight.delete(id);\n    throw err;\n  });',
        'loadProfile(id).then(value => value);'
      );
      expect(run({ 'src/profiles.ts': cachedError }).violations).toEqual([
        expect.stringMatching(
          /^src\/profiles\.ts:7: getProfile stores the in-flight future\/promise in inflight but never removes it when it fails/
        ),
      ]);
    });
  });
});
