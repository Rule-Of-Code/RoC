/**
 * The request-path model both front ends produce: Python read structurally
 * (no Python runtime), TS/JS read with the compiler. The laws trust these
 * facts, so each is pinned here on its own.
 */
import * as ts from 'typescript';
import { pythonModule } from '../../../src/utils/request-path/python-model';
import { typescriptModule } from '../../../src/utils/request-path/ts-model';

const PY = [
  'from app.repo import people as ppl',
  '',
  'class Svc:',
  '    @firestore.async_transactional',
  '    async def load(self, uid: str, *, limit: int = 5) -> dict:',
  '        """a docstring with a # and (a bracket',
  '        over two lines"""',
  '        user = await self.db.collection("users").document(',
  '            uid',
  '        ).get()  # a comment (with a bracket',
  '        roles, (a, b) = await get_roles(uid), (1, 2)',
  '        for role in roles:',
  '            r = await ppl.get(role)',
  '        items = [await repo.get(x) for x in ids if x]',
  '        docs = [d async for d in q.stream()]',
  '        while (row := await cursor.fetch()):',
  '            pass',
  '        total = len(list(q.stream())); n = 2',
  '        return {"a": await one(uid), "b": await two(uid)}',
  '',
  'def plain():',
  '    return 1',
  '',
].join('\n');

describe('Python structural model', () => {
  const module = pythonModule('/x/svc.py', 'svc.py', PY);
  const load = module.functions.find(f => f.name === 'Svc.load');
  const statements = load?.blocks.flat() ?? [];
  const at = (line: number) => statements.filter(s => s.line === line);

  it('finds functions, methods, async-ness, params and a transactional decorator', () => {
    expect(module.functions.map(f => [f.name, f.isAsync])).toEqual([
      ['Svc.load', true],
      ['plain', false],
    ]);
    expect(load?.params).toEqual(['self', 'uid', 'limit']);
    expect(load?.transactional).toBe(true);
    expect(module.imports).toEqual([{ local: 'ppl', module: 'app.repo', imported: 'people' }]);
  });

  it('joins a bracketed call over three lines into one statement; literals and comments do not confuse it', () => {
    const [user] = at(8);
    expect(user?.endLine).toBe(10);
    expect(user?.bound).toEqual(['user']);
    expect(user?.awaits[0]?.call?.callee).toBe('self.db.collection("users").document( uid ).get');
    expect(user?.awaits[0]?.call?.chain.map(l => l.name)).toEqual(['self', 'db', 'collection', 'document', 'get']);
    expect(user?.awaits[0]?.call?.chain[2]?.args?.[0]?.literal).toBe('users');
  });

  it('binds tuple-unpacking, walrus and for targets', () => {
    expect(at(11)[0]?.bound).toEqual(['roles', 'a', 'b']);
    expect(at(16)[0]?.bound).toEqual(['row']);
    expect(at(12)[0]?.bound).toEqual(['role']);
  });

  it('records the awaits that run once per loop item, comprehension elements included', () => {
    expect(load?.loopAwaits.map(l => [l.loopKind, l.site.line, l.site.call?.callee])).toEqual([
      ['for', 13, 'ppl.get'],
      ['comprehension', 14, 'repo.get'],
      ['while', 16, 'cursor.fetch'],
    ]);
  });

  it('splits statements on ";" and keeps every outermost await of one statement', () => {
    expect(at(18).map(s => s.bound)).toEqual([['total'], ['n']]);
    expect(at(19)[0]?.awaits.map(a => a.call?.callee)).toEqual(['one', 'two']);
  });

  it('an async comprehension over a stream is an awaited step of its statement', () => {
    expect(at(15)[0]?.awaits.map(a => [a.call?.callee, a.asyncIteration])).toEqual([['q.stream', true]]);
  });
});

const TSRC = [
  "import { getDoc, doc } from 'firebase/firestore';",
  'export class Svc {',
  '  async load(uid: string, tx?: unknown) {',
  "    const user = await getDoc(doc(this.db, 'users', uid));",
  '    const [a, b] = await Promise.all([one(uid), two(uid)]);',
  '    for (const r of roles) {',
  '      const x = await this.repo.findOne({ where: { id: r } });',
  '    }',
  "    items.forEach(async (i) => { await getDoc(doc(db, 'items', i)); });",
  '    this.cache = await loadAll();',
  '  }',
  '}',
  '',
].join('\n');

describe('TypeScript model', () => {
  const module = typescriptModule(ts, '/x/svc.ts', 'svc.ts', TSRC);
  const load = module.functions.find(f => f.name === 'Svc.load');
  const callback = module.functions.find(f => f.name.startsWith('<anonymous'));

  it('names methods by class, reads async-ness, params and a transaction parameter', () => {
    expect(load?.isAsync).toBe(true);
    expect(load?.params).toEqual(['uid', 'tx']);
    expect(load?.transactional).toBe(true);
    expect(module.imports.map(i => i.local)).toEqual(['getDoc', 'doc']);
  });

  it('binds declarations, destructuring and member targets', () => {
    const top = load?.blocks[0] ?? [];
    expect(top.map(s => s.bound)).toEqual([['user'], ['a', 'b'], [], [], ['this.cache']]);
    expect(top[0]?.awaits[0]?.call?.args[0]?.text).toBe('doc(this.db, "users", uid)');
  });

  it('records loop awaits in the same function, and a .forEach callback as a loop', () => {
    expect(load?.loopAwaits.map(l => [l.loopKind, l.site.call?.callee])).toEqual([['for-of', 'this.repo.findOne']]);
    expect(callback?.loopAwaits.map(l => [l.loopKind, l.site.call?.callee])).toEqual([['forEach', 'getDoc']]);
  });
});
