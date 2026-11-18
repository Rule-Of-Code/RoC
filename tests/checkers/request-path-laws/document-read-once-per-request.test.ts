/**
 * #353: the same document read more than once while serving one request.
 *
 * Red: a handler calls helper A and helper B, and both read `users/<uid>` —
 * one warning naming both sites. Green: the value read once and passed down;
 * different ids; a collection name that is not a literal.
 */
import { DocumentReadOncePerRequestLaw } from '../../../src/checkers/request-path-laws/document-read-once-per-request';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const PYPROJECT = '[project]\nname = "svc"\ndependencies = ["google-cloud-firestore"]\n';
const PACKAGE = JSON.stringify({ name: 'svc', dependencies: { firebase: '^11.0.0' } });

const check = (files: Record<string, string>) => DocumentReadOncePerRequestLaw.check(ctx(project(files)));
const lines = (...l: string[]): string => l.join('\n') + '\n';

const PY_HANDLER = lines(
  'from app import prefs, blocks',
  '',
  'async def get_me(uid, db):',
  '    p = await prefs.load_prefs(db, uid)',
  '    b = await blocks.load_blocks(db, uid)',
  '    return {"prefs": p, "blocks": b}'
);

describe('Document Read Once Per Request (#353)', () => {
  describe('red', () => {
    it('Python: handler → helper A and helper B both read users/<uid> → one warning naming both sites', () => {
      const result = check({
        'pyproject.toml': PYPROJECT,
        'app/__init__.py': '',
        'app/handlers.py': PY_HANDLER,
        'app/prefs.py': lines('async def load_prefs(db, user_id):', '    snap = await db.collection("users").document(user_id).get()', '    return snap.to_dict()["prefs"]'),
        'app/blocks.py': lines('async def load_blocks(db, uid):', '    snap = await db.collection("users").document(uid).get()', '    return snap.to_dict()["blocks"]'),
      });
      expect(result.passed).toBe(false);
      expect(result.violations).toEqual([
        'app/prefs.py:2: users/{uid} is read 2 times while serving get_me() — app/prefs.py:2 in load_prefs() (called at app/handlers.py:4), app/blocks.py:2 in load_blocks() (called at app/handlers.py:5); read it once and pass the value down, or keep it in a request-scoped cache',
      ]);
    });

    it('TS: handler → two imported helpers read doc(db, "users", uid) → one warning naming both sites', () => {
      const result = check({
        'package.json': PACKAGE,
        'src/handler.ts': lines(
          "import { loadPrefs } from './prefs';",
          "import * as blocks from './blocks';",
          'export async function getMe(uid: string) {',
          '  const prefs = await loadPrefs(uid);',
          '  const list = await blocks.loadBlocks(uid);',
          '  return { prefs, list };',
          '}'
        ),
        'src/prefs.ts': lines(
          "import { doc, getDoc } from 'firebase/firestore';",
          'export async function loadPrefs(id: string) {',
          "  const snap = await getDoc(doc(db, 'users', id));",
          '  return snap.data()?.prefs;',
          '}'
        ),
        'src/blocks.ts': lines(
          "import { doc, getDoc } from 'firebase/firestore';",
          'export async function loadBlocks(uid: string) {',
          "  const ref = doc(db, 'users', uid);",
          '  const snap = await getDoc(ref);',
          '  return snap.data()?.blocks;',
          '}'
        ),
      });
      expect(result.violations).toEqual([
        expect.stringMatching(/^src\/prefs\.ts:3: users\/\{uid\} is read 2 times while serving getMe\(\) — src\/prefs\.ts:3 in loadPrefs\(\) \(called at src\/handler\.ts:4\), src\/blocks\.ts:4 in loadBlocks\(\) \(called at src\/handler\.ts:5\)/),
      ]);
    });

    it('a collection named by a module constant (own or imported) and an id wrapped in str() still match', () => {
      const result = check({
        'pyproject.toml': PYPROJECT,
        'app/__init__.py': '',
        'app/names.py': lines('USERS = "users"'),
        'app/handlers.py': PY_HANDLER,
        'app/prefs.py': lines(
          'from app.names import USERS',
          '',
          'async def load_prefs(db, user_id):',
          '    return await db.collection(USERS).document(str(user_id)).get()'
        ),
        'app/blocks.py': lines(
          'from typing import Final',
          '',
          'PEOPLE: Final = "users"',
          '',
          'async def load_blocks(db, uid):',
          '    return await db.collection(PEOPLE).document(str(uid)).get()'
        ),
      });
      expect(result.violations).toEqual([expect.stringMatching(/^app\/prefs\.py:4: users\/\{str\(uid\)\} is read 2 times while serving get_me\(\)/)]);
    });

    it('a handler that reads the document itself and calls a method of its class that reads it again', () => {
      const result = check({
        'pyproject.toml': PYPROJECT,
        'app/svc.py': lines(
          'class Profiles:',
          '    async def page(self, uid):',
          '        me = await self.db.collection("users").document(uid).get()',
          '        return me, await self._badges(uid)',
          '',
          '    async def _badges(self, uid):',
          '        user = await self.db.collection("users").document(uid).get()',
          '        return user.get("badges")'
        ),
      });
      expect(result.violations).toEqual([expect.stringMatching(/^app\/svc\.py:3: users\/\{uid\} is read 2 times while serving Profiles\.page\(\)/)]);
    });
  });

  describe('green', () => {
    it('the value read once and passed down', () => {
      expect(
        check({
          'pyproject.toml': PYPROJECT,
          'app/__init__.py': '',
          'app/handlers.py': lines(
            'from app import prefs, blocks',
            '',
            'async def get_me(uid, db):',
            '    user = (await db.collection("users").document(uid).get()).to_dict()',
            '    return prefs.prefs_of(user), blocks.blocks_of(user)'
          ),
          'app/prefs.py': lines('def prefs_of(user):', '    return user["prefs"]'),
          'app/blocks.py': lines('def blocks_of(user):', '    return user["blocks"]'),
        }).violations
      ).toEqual([]);
    });

    it('a re-read after a write sees the new state: in the handler, and inside one helper', () => {
      expect(
        check({
          'pyproject.toml': PYPROJECT,
          'app/__init__.py': '',
          'app/handlers.py': lines(
            'from app import prefs',
            '',
            'async def rename(uid, db, name):',
            '    before = await prefs.load(db, uid)',
            '    await db.collection("users").document(uid).update({"name": name})',
            '    return before, await prefs.load(db, uid)',
            '',
            'async def mute(uid, db):',
            '    return await prefs.toggle(db, uid)'
          ),
          'app/prefs.py': lines(
            'async def load(db, uid):',
            '    return await db.collection("users").document(uid).get()',
            '',
            'async def toggle(db, uid):',
            '    current = await db.collection("users").document(uid).get()',
            '    await db.collection("users").document(uid).set({"muted": not current.get("muted")})',
            '    return await db.collection("users").document(uid).get()'
          ),
        }).violations
      ).toEqual([]);
    });

    it('different id expressions are different documents', () => {
      expect(
        check({
          'pyproject.toml': PYPROJECT,
          'app/__init__.py': '',
          'app/handlers.py': lines('from app import prefs, blocks', '', 'async def pair(uid, other, db):', '    return await prefs.load_prefs(db, uid), await blocks.load_blocks(db, other)'),
          'app/prefs.py': lines('async def load_prefs(db, uid):', '    return await db.collection("users").document(uid).get()'),
          'app/blocks.py': lines('async def load_blocks(db, uid):', '    return await db.collection("users").document(uid).get()'),
        }).violations
      ).toEqual([]);
    });

    it('a collection name that is not a literal is not compared', () => {
      expect(
        check({
          'pyproject.toml': PYPROJECT,
          'app/__init__.py': '',
          'app/handlers.py': lines('from app import a, b', '', 'async def get(uid, db, coll):', '    return await a.load(db, coll, uid), await b.load(db, coll, uid)'),
          'app/a.py': lines('async def load(db, coll, uid):', '    return await db.collection(coll).document(uid).get()'),
          'app/b.py': lines('async def load(db, coll, uid):', '    return await db.collection(coll).document(uid).get()'),
          // One literal read elsewhere, so the law has something to judge.
          'app/c.py': lines('async def settings(db):', '    return await db.collection("config").document("main").get()'),
        }).violations
      ).toEqual([]);
    });
  });

  describe('the verdict says what it read', () => {
    const DYNAMIC_ONLY = {
      'pyproject.toml': PYPROJECT,
      'app/__init__.py': '',
      'app/handlers.py': lines('from app import a, b', '', 'async def get(uid, db, coll):', '    return await a.load(db, coll, uid), await b.load(db, coll, uid)'),
      'app/a.py': lines('async def load(db, coll, uid):', '    return await db.collection(coll).document(uid).get()'),
      'app/b.py': lines('async def load(db, coll, uid):', '    return await db.collection(coll).document(uid).get()'),
    };

    it('a DB client and only dynamic collections: PASS with the counter and what it did not compare, never judged nothing', () => {
      const result = check(DYNAMIC_ONLY);
      expect(result.passed).toBe(true);
      expect(result.judgedNothing).toBeUndefined();
      expect(result.message).toBe(
        'Document Read Once Per Request: 4 source file(s) read (4 Python, 0 TS/JS), 0 document reads keyed by a literal collection — nothing to compare; not compared: reads whose collection or id is computed at run time, reads through a repository or wrapper the reader does not resolve, and reads more than one call deep'
      );
      expect(result.details).toEqual([result.message]);
      expect(result.metrics).toEqual({ filesRead: 4, pythonFiles: 4, typescriptFiles: 0, oneOffScriptsSkipped: 0, compared: 0 });
    });

    it('keyed reads and no duplicate: PASS that counts what it compared', () => {
      const result = check({ ...DYNAMIC_ONLY, 'app/c.py': lines('async def settings(db):', '    return await db.collection("config").document("main").get()') });
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(/: 5 source file\(s\) read \(5 Python, 0 TS\/JS\), 1 keyed document read\(s\) compared, no document read twice in one request; not compared: /);
      expect(result.metrics).toMatchObject({ filesRead: 5, compared: 1 });
    });

    it('no source file to read: judged nothing, never a pass', () => {
      const result = check({ 'pyproject.toml': PYPROJECT, 'tests/test_x.py': lines('async def test_x():', '    pass') });
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.judgedNothing).toBe(true);
      expect(result.violations?.[0]).toMatch(/nothing was judged — no source file could be read: the project has no Python or TS\/JS source file outside tests/);
    });

    it('the TS parser cannot be loaded: judged nothing, saying why', () => {
      const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      try {
        const result = check({ 'package.json': PACKAGE, 'src/a.ts': 'export const a = 1;\n' });
        expect(result.passed).toBe(false);
        expect(result.judgedNothing).toBe(true);
        expect(result.violations?.[0]).toMatch(/nothing was judged — no source file could be read: 1 TS\/JS file\(s\): could not load the 'typescript' package/);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
