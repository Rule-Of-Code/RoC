/**
 * Database Read Cache Safety (#373): an in-process cache of database reads
 * has an expiry, a size bound, invalidation on the write paths, no use in an
 * authorization check, and a key that carries the user when the read is per
 * user. Every finding names a file and a line; a project without a database
 * client or without a cache does not select the law.
 */
import { DatabaseReadCacheSafetyLaw } from '../../../src/checkers/cache-harness-laws/database-read-cache-safety';
import { CACHE_HARNESS_LAWS } from '../../../src/data/cache-harness-laws';
import { lawRequirementsMet } from '../../../src/utils/law-requirements';
import { ctx, manifest, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const LAW = CACHE_HARNESS_LAWS.find(
  law => law.checkFunction === 'DatabaseReadCacheSafetyLaw.check'
);
const REQUIREMENTS = 'fastapi==0.115.0\ngoogle-cloud-firestore==2.34.1\n';
const run = (files: Record<string, string>) =>
  DatabaseReadCacheSafetyLaw.check(
    ctx(project({ 'requirements.txt': REQUIREMENTS, ...files }))
  );

/** functools.lru_cache on a document read: bounded (maxsize), but no expiry and nothing clears it. */
const LRU_READ = `from functools import lru_cache
from google.cloud import firestore

db = firestore.Client()


@lru_cache(maxsize=256)
def get_catalog_item(item_id):
    return db.collection("items").document(item_id).get().to_dict()
`;

/** A TTLCache filled from a read, cleared by the PUT handler that writes the same collection. */
const TTL_CACHE_CLEARED = `from cachetools import TTLCache
from fastapi import APIRouter
from google.cloud import firestore

db = firestore.AsyncClient()
router = APIRouter()
ITEM_CACHE = TTLCache(maxsize=1024, ttl=3)


async def get_item(item_id):
    hit = ITEM_CACHE.get(item_id)
    if hit is not None:
        return hit
    snap = await db.collection("items").document(item_id).get()
    data = snap.to_dict()
    ITEM_CACHE[item_id] = data
    return data


@router.put("/items/{item_id}")
async def update_item(item_id: str, body: dict):
    await db.collection("items").document(item_id).set(body)
    ITEM_CACHE.pop(item_id, None)
`;

/** Expiry, bound and invalidation in place — but the account read is used to refuse with 403. */
const CACHED_AUTH = `from cachetools import TTLCache, cached
from fastapi import Depends, HTTPException, Request
from google.cloud import firestore

db = firestore.Client()


@cached(cache=TTLCache(maxsize=512, ttl=3))
def load_account(uid):
    return db.collection("accounts").document(uid).get().to_dict()


def require_active(uid: str = Depends(current_uid)):
    account = load_account(uid)
    if account.get("suspended"):
        raise HTTPException(status_code=403, detail="suspended")
    return account


async def clear_on_write(request: Request, call_next):
    if request.method != "GET":
        load_account.cache_clear()
    return await call_next(request)
`;

describe('DatabaseReadCacheSafetyLaw (#373)', () => {
  it('is selected only where a database client is declared and git publishes a cache', () => {
    expect(LAW?.requires).toBeDefined();
    expect(
      lawRequirementsMet(LAW?.requires, project({ 'app/items.py': LRU_READ }))
    ).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({
          'requirements.txt': REQUIREMENTS,
          'app/main.py': 'print(1)\n',
        })
      )
    ).toBe(false);
    expect(
      lawRequirementsMet(
        LAW?.requires,
        project({ 'requirements.txt': REQUIREMENTS, 'app/items.py': LRU_READ })
      )
    ).toBe(true);
  });

  it('red: lru_cache on a database read — no expiry, and no write path clears it (bounded by maxsize)', () => {
    const result = run({ 'app/items.py': LRU_READ });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^app\/items\.py:8: the cache @lru_cache\(maxsize=256\) holds database reads with no expiry/
      ),
      expect.stringMatching(
        /^app\/items\.py:8: .*no write path clears it — no get_catalog_item\.cache_clear\(\)/
      ),
    ]);
  });

  it('red: functools.cache and lru_cache(maxsize=None) have no size bound either', () => {
    const unbounded = run({
      'app/items.py': LRU_READ.replace(
        '@lru_cache(maxsize=256)',
        '@lru_cache(maxsize=None)'
      ),
    });
    expect(unbounded.violations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^app\/items\.py:8: .*no size bound/),
      ])
    );
    const cache = run({
      'app/items.py': LRU_READ.replace(
        'from functools import lru_cache',
        'import functools'
      ).replace('@lru_cache(maxsize=256)', '@functools.cache'),
    });
    expect(cache.violations).toHaveLength(3);
  });

  it('green: TTL + maxsize + an entry dropped in the write path, with a counter in the message and metrics', () => {
    const result = run({ 'app/items.py': TTL_CACHE_CLEARED });
    expect(result.violations).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.message).toMatch(
      /1 in-process cache\(s\) found in 1 file\(s\), 1 of them holding database reads/
    );
    expect(result.metrics).toMatchObject({
      filesRead: 1,
      caches: 1,
      databaseReadCaches: 1,
    });
  });

  it('red: another function writes the same collection without clearing the cache — named at its write', () => {
    const staleDelete = `${TTL_CACHE_CLEARED}

@router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    await db.collection("items").document(item_id).delete()
`;
    expect(run({ 'app/items.py': staleDelete }).violations).toEqual([
      expect.stringMatching(
        /^app\/items\.py:28: writes collection "items", whose reads the cache at app\/items\.py:7 holds, without clearing it/
      ),
    ]);
  });

  it('the write path may live in another file and clear the cache through a helper it calls', () => {
    const cache =
      TTL_CACHE_CLEARED.slice(0, TTL_CACHE_CLEARED.indexOf('@router.put')) +
      '\ndef forget_item(item_id):\n    ITEM_CACHE.pop(item_id, None)\n';
    const routes = `from fastapi import APIRouter
from google.cloud import firestore
from app.items import forget_item

db = firestore.AsyncClient()
router = APIRouter()


@router.patch("/items/{item_id}")
async def patch_item(item_id: str, body: dict):
    await db.collection("items").document(item_id).update(body)
    forget_item(item_id)
`;
    expect(
      run({ 'app/items.py': cache, 'app/routes.py': routes }).violations
    ).toEqual([]);
    expect(
      run({
        'app/items.py': cache,
        'app/routes.py': routes.replace('    forget_item(item_id)\n', ''),
      }).violations
    ).toEqual([expect.stringMatching(/no write path clears it/)]);
  });

  it('red even with a TTL: a cached read used inside an authorization dependency that raises 403', () => {
    const result = run({ 'app/auth.py': CACHED_AUTH });
    expect(result.passed).toBe(false);
    expect(result.violations).toEqual([
      expect.stringMatching(
        /^app\/auth\.py:14: the authorization check require_active reads through the cache at app\/auth\.py:9 — a suspension/
      ),
    ]);
  });

  it('red: a per-user read stored under a key without the user', () => {
    const memberships = `from cachetools import TTLCache
from google.cloud import firestore

db = firestore.AsyncClient()
MEMBERSHIP_CACHE = TTLCache(maxsize=1024, ttl=3)


async def membership(uid, group_id):
    if group_id in MEMBERSHIP_CACHE:
        return MEMBERSHIP_CACHE[group_id]
    snap = await db.collection("memberships").document(uid).get()
    MEMBERSHIP_CACHE[group_id] = snap.to_dict()
    return MEMBERSHIP_CACHE[group_id]


async def middleware(request, call_next):
    if request.method != "GET":
        MEMBERSHIP_CACHE.clear()
    return await call_next(request)
`;
    expect(run({ 'app/members.py': memberships }).violations).toEqual([
      expect.stringMatching(
        /^app\/members\.py:12: the cache at app\/members\.py:5 stores a read of uid under a key without the user \(group_id\)/
      ),
    ]);
    const keyed = memberships
      .split('MEMBERSHIP_CACHE[group_id]')
      .join('MEMBERSHIP_CACHE[(uid, group_id)]')
      .replace('if group_id in', 'if (uid, group_id) in');
    expect(run({ 'app/members.py': keyed }).violations).toEqual([]);
  });

  it('red: a decorated read of the ambient user — the arguments (the key) do not carry the user', () => {
    const ambient = `from cachetools import TTLCache, cached
from flask import g
from google.cloud import firestore

db = firestore.Client()


@cached(cache=TTLCache(maxsize=64, ttl=3))
def my_settings(section):
    return db.collection("settings").document(g.user.id).get().to_dict()[section]


def save(request):
    if request.method != "GET":
        my_settings.cache_clear()
`;
    expect(run({ 'app/settings.py': ambient }).violations).toEqual([
      expect.stringMatching(
        /^app\/settings\.py:9: the cache at app\/settings\.py:9 stores a read of g\.user.* under a key without the user \(the arguments of my_settings\)/
      ),
    ]);
  });

  it('a cache that holds no database read (a settings loader) is judged and passes with the counter', () => {
    const settings =
      'from functools import lru_cache\n\n\n@lru_cache\ndef get_settings():\n    return Settings()\n';
    const result = run({ 'app/config.py': settings });
    expect(result.passed).toBe(true);
    expect(result.metrics).toMatchObject({ caches: 1, databaseReadCaches: 0 });
  });

  it('judged nothing, never compliant, when the selecting text was only a comment', () => {
    const result = run({
      'app/notes.py':
        '# replaced TTLCache(maxsize=1, ttl=1) with a request-scoped value\nVALUE = 1\n',
    });
    expect(result.passed).toBe(false);
    expect(result.judgedNothing).toBe(true);
    expect(result.violations?.[0]).toMatch(
      /nothing was judged — no in-process cache found in the 1 file/
    );
  });

  describe('TS/JS', () => {
    const PKG = manifest({ 'firebase-admin': '13.0.0' });
    const MAP_CACHE = `import { getFirestore } from 'firebase-admin/firestore';

const db = getFirestore();
const profileCache = new Map<string, unknown>();

export async function loadProfile(id: string) {
  const hit = profileCache.get(id);
  if (hit) return hit;
  const snap = await db.collection('profiles').doc(id).get();
  const data = snap.data();
  profileCache.set(id, data);
  return data;
}
`;
    const runTs = (files: Record<string, string>) =>
      DatabaseReadCacheSafetyLaw.check(
        ctx(project({ 'package.json': PKG, ...files }))
      );

    it('red: a Map filled from a read — no expiry, no bound, nothing clears it', () => {
      const result = runTs({ 'src/profiles.ts': MAP_CACHE });
      expect(result.violations).toEqual([
        expect.stringMatching(/^src\/profiles\.ts:4: .*no expiry/),
        expect.stringMatching(/^src\/profiles\.ts:4: .*no size bound/),
        expect.stringMatching(
          /^src\/profiles\.ts:4: .*no write path clears it/
        ),
      ]);
    });

    it('green: lru-cache with max and ttl, cleared by the handler that writes', () => {
      const green = MAP_CACHE.replace(
        "import { getFirestore } from 'firebase-admin/firestore';",
        "import { getFirestore } from 'firebase-admin/firestore';\nimport { LRUCache } from 'lru-cache';"
      ).replace(
        'new Map<string, unknown>()',
        'new LRUCache<string, object>({ max: 500, ttl: 3000 })'
      ).concat(`
export async function saveProfile(id: string, body: object) {
  await db.collection('profiles').doc(id).set(body);
  profileCache.delete(id);
}
`);
      expect(runTs({ 'src/profiles.ts': green }).violations).toEqual([]);
    });
  });
});
