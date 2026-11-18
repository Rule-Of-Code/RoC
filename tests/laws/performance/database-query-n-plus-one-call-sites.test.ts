/**
 * #352: N+1 is judged per call site, not per project.
 *
 * The law used to call a project "addressed" as soon as one file contained a
 * batching pattern, so a read per item in a loop elsewhere passed. Each
 * awaited read inside a loop of the same function is now a finding with its
 * file and line, in Python and in TS/JS; a batch read, an `in` query or a
 * concurrent gather at that site is the accepted fix.
 */
import { DatabaseQueryOptimizationLaw } from '../../../src/laws/performance/database-query-optimization';
import { ctx, project, removeProjects } from '../../checkers/toolkit-fixture';

afterAll(removeProjects);

const N_PLUS_ONE = /\(N\+1\)/;

async function sites(files: Record<string, string>): Promise<string[]> {
  const root = project(files);
  const result = await DatabaseQueryOptimizationLaw.check(ctx(root));
  return (result.violations ?? []).filter(v => N_PLUS_ONE.test(v));
}

const TS_MANIFEST = JSON.stringify({ name: 'svc', dependencies: { 'firebase-admin': '^12.0.0' } });
const PY_MANIFEST = '[project]\nname = "svc"\ndependencies = ["google-cloud-firestore>=2"]\n';

const TS_BATCHED = [
  "import { getFirestore } from 'firebase-admin/firestore';",
  'const db = getFirestore();',
  'export async function loadMany(ids: string[]) {',
  "  return db.getAll(...ids.map(id => db.collection('people').doc(id)));",
  '}',
  '',
].join('\n');

const TS_LOOP_READ = [
  "import { getFirestore } from 'firebase-admin/firestore';",
  'const db = getFirestore();',
  'export async function loadRoles(ids: string[]) {',
  '  const out = [];',
  '  for (const id of ids) {',
  "    const snap = await db.collection('roles').doc(id).get();",
  '    out.push(snap.data());',
  '  }',
  '  return out;',
  '}',
  '',
].join('\n');

const PY_BATCHED = [
  'async def load_many(db, refs):',
  '    return [s async for s in db.get_all(refs)]',
  '',
].join('\n');

const PY_LOOP_READ = [
  'async def load_roles(people, roles):',
  '    out = []',
  '    for role in roles:',
  '        out.append(await people.get(role))',
  '    return out',
  '',
].join('\n');

describe('database-query-optimization: N+1 per call site (#352)', () => {
  describe('red', () => {
    it('TS: one batched file and one loop-read file → the loop site is named', async () => {
      const found = await sites({
        'package.json': TS_MANIFEST,
        'src/people.service.ts': TS_BATCHED,
        'src/roles.service.ts': TS_LOOP_READ,
      });
      expect(found).toHaveLength(1);
      expect(found[0]).toMatch(/^src\/roles\.service\.ts:6: await db\.collection\("roles"\)\.doc\(id\)\.get\(\) runs once per item of the for-of loop at line 5/);
    });

    it('Python: one batched file and one loop-read file → the loop site is named', async () => {
      const found = await sites({
        'pyproject.toml': PY_MANIFEST,
        'app/__init__.py': '',
        'app/people_service.py': PY_BATCHED,
        'app/roles_service.py': PY_LOOP_READ,
      });
      expect(found).toHaveLength(1);
      expect(found[0]).toMatch(/^app\/roles_service\.py:4: await people\.get\(\) runs once per item of the for loop at line 3 in load_roles\(\)/);
    });

    it('Python: a comprehension with await is detected', async () => {
      const found = await sites({
        'pyproject.toml': PY_MANIFEST,
        'app/roles.py': [
          'async def load_roles(db, ids):',
          '    return [await db.collection("roles").document(i).get() for i in ids]',
          '',
        ].join('\n'),
      });
      expect(found).toHaveLength(1);
      expect(found[0]).toMatch(/^app\/roles\.py:2: await db\.collection\("roles"\)\.document\(i\)\.get\(\) runs once per item of the comprehension loop/);
    });

    it('Python: async iteration over a query inside a loop, and an awaited read in an async for body', async () => {
      const found = await sites({
        'pyproject.toml': PY_MANIFEST,
        'app/feed.py': [
          'async def feed(db, users):',
          '    for uid in users:',
          '        async for post in db.collection("posts").where("author", "==", uid).stream():',
          '            yield post',
          '',
          'async def walk(db, stream):',
          '    async for row in stream:',
          '        await db.collection("users").document(row.id).get()',
          '',
        ].join('\n'),
      });
      expect(found).toHaveLength(2);
      expect(found[0]).toMatch(/^app\/feed\.py:3: async iteration over db\.collection\("posts"\)\.where\("author", "==", uid\)\.stream\(\) runs once per item of the for loop at line 2/);
      expect(found[1]).toMatch(/^app\/feed\.py:8: await .*\.get\(\) runs once per item of the async for loop at line 7/);
    });

    it('TS: .forEach with an async callback, a while loop and a classic for', async () => {
      const found = await sites({
        'package.json': TS_MANIFEST,
        'src/jobs/sync.ts': [
          "import { getFirestore } from 'firebase-admin/firestore';",
          'const db = getFirestore();',
          'export function touch(ids: string[]) {',
          "  ids.forEach(async id => { await db.collection('a').doc(id).get(); });",
          '}',
          'export async function drain(queue: string[], n: number) {',
          '  while (queue.length) {',
          "    await db.collection('b').doc(queue.pop() as string).get();",
          '  }',
          '  for (let i = 0; i < n; i++) {',
          "    await db.collection('c').doc(String(i)).get();",
          '  }',
          '}',
          '',
        ].join('\n'),
      });
      expect(found.map(f => f.split(' runs once')[0])).toEqual([
        'src/jobs/sync.ts:4: await db.collection("a").doc(id).get()',
        'src/jobs/sync.ts:8: await db.collection("b").doc(queue.pop() as string).get()',
        'src/jobs/sync.ts:11: await db.collection("c").doc(String(i)).get()',
      ]);
    });

    it('a loop read in a file that is not named like a service is found too', async () => {
      const found = await sites({
        'package.json': TS_MANIFEST,
        'src/handlers/orders.ts': TS_LOOP_READ,
      });
      expect(found).toHaveLength(1);
      expect(found[0]).toMatch(/^src\/handlers\/orders\.ts:6:/);
    });
  });

  describe('green', () => {
    it('Python: get_all, an "in" query and asyncio.gather at the site', async () => {
      expect(
        await sites({
          'pyproject.toml': PY_MANIFEST,
          'app/roles.py': [
            'import asyncio',
            '',
            'async def by_refs(db, chunks):',
            '    for refs in chunks:',
            '        docs = [d async for d in db.get_all(refs)]',
            '',
            'async def by_in(db, chunks):',
            '    for chunk in chunks:',
            '        docs = await db.collection("roles").where("id", "in", chunk).get()',
            '',
            'async def by_gather(people, roles):',
            '    return await asyncio.gather(*(people.get(r) for r in roles))',
            '',
          ].join('\n'),
        })
      ).toEqual([]);
    });

    it('TS: getAll, an "in" query and Promise.all over the items', async () => {
      expect(
        await sites({
          'package.json': TS_MANIFEST,
          'src/roles.service.ts': [
            "import { getFirestore, FieldPath } from 'firebase-admin/firestore';",
            'const db = getFirestore();',
            'export async function a(chunks: string[][]) {',
            '  for (const chunk of chunks) {',
            "    await db.getAll(...chunk.map(id => db.collection('roles').doc(id)));",
            "    await db.collection('roles').where(FieldPath.documentId(), 'in', chunk).get();",
            '  }',
            '}',
            'export async function b(ids: string[]) {',
            "  return Promise.all(ids.map(async id => await db.collection('roles').doc(id).get()));",
            '}',
            '',
          ].join('\n'),
        })
      ).toEqual([]);
    });

    it('a chunked "in" query built in a local before the loop read, and a bare local get() helper', async () => {
      expect(
        await sites({
          'pyproject.toml': PY_MANIFEST,
          'app/rows.py': [
            'async def rows_where_in(client, field, values):',
            '    for start in range(0, len(values), 30):',
            '        chunk = values[start : start + 30]',
            '        query = client.collection("rows").where(filter=FieldFilter(field, "in", chunk))',
            '        async for snap in query.stream():',
            '            yield snap',
            '',
          ].join('\n'),
          'package.json': TS_MANIFEST,
          'src/probe.ts': [
            'async function get(): Promise<number> { return 200; }',
            'export async function waitUntilUp() {',
            '  for (let i = 0; i < 5; i++) {',
            '    if ((await get()) === 200) return;',
            '  }',
            '}',
            '',
          ].join('\n'),
        })
      ).toEqual([]);
    });

    it('a loop over a count written in the source (a literal tuple or array, range(2)) is a fixed fan-out', async () => {
      expect(
        await sites({
          'pyproject.toml': PY_MANIFEST,
          'app/pairs.py': [
            'async def both_sides(db, uid):',
            '    for side in ("left", "right"):',
            '        async for snap in db.collection("pairs").where(side, "==", uid).stream():',
            '            yield snap',
            '    for i in range(2):',
            '        await db.collection("slots").document(str(i)).get()',
            '',
          ].join('\n'),
          'package.json': TS_MANIFEST,
          'src/pairs.ts': [
            "import { getFirestore } from 'firebase-admin/firestore';",
            'const db = getFirestore();',
            'export async function both(uid: string) {',
            "  for (const side of ['left', 'right']) {",
            "    await db.collection('pairs').where(side, '==', uid).get();",
            '  }',
            '}',
            '',
          ].join('\n'),
        })
      ).toEqual([]);
    });

    it('a read in a loop inside a test file is not a request path', async () => {
      expect(
        await sites({
          'package.json': TS_MANIFEST,
          'src/roles.service.ts': TS_BATCHED,
          'src/roles.service.spec.ts': TS_LOOP_READ,
          'tests/test_roles.py': PY_LOOP_READ,
          'pyproject.toml': PY_MANIFEST,
        })
      ).toEqual([]);
    });

    it('a Python project with a database but no recognised read stays not applicable', async () => {
      const root = project({ 'pyproject.toml': '[project]\ndependencies = ["sqlalchemy"]\n', 'main.py': 'def run():\n    pass\n' });
      const result = await DatabaseQueryOptimizationLaw.check(ctx(root));
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Not applicable');
    });
  });
});
