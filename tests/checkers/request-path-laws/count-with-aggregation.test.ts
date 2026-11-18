/**
 * #354: counting by fetching documents instead of a count aggregation.
 *
 * Red: every shape the issue names, in Python and TS. Green: an aggregation;
 * documents that are also used for something else; a len() that is not of a
 * query.
 */
import { CountWithAggregationLaw } from '../../../src/checkers/request-path-laws/count-with-aggregation';
import * as tsxSource from '../../../src/utils/react/tsx-source';
import { ctx, project, removeProjects } from '../toolkit-fixture';

afterAll(removeProjects);

const PYPROJECT = '[project]\nname = "svc"\ndependencies = ["google-cloud-firestore"]\n';
const PACKAGE = JSON.stringify({ name: 'svc', dependencies: { firebase: '^11.0.0' } });
const lines = (...l: string[]): string => l.join('\n') + '\n';
const check = (files: Record<string, string>) => CountWithAggregationLaw.check(ctx(project(files)));

describe('Count With An Aggregation (#354)', () => {
  it('Python red: len(list(q.stream())), len([... async for ...]), len(await q.get()), len(docs) of a query used nowhere else', () => {
    const result = check({
      'pyproject.toml': PYPROJECT,
      'app/counts.py': lines(
        'async def count_a(q):',
        '    return len(list(q.stream()))',
        '',
        'async def count_b(q):',
        '    return len([d async for d in q.stream()])',
        '',
        'async def count_c(q):',
        '    return len(await q.get())',
        '',
        'async def count_d(q):',
        '    docs = await q.get()',
        '    return len(docs)'
      ),
    });
    expect(result.passed).toBe(false);
    expect(result.violations?.map(v => v.split(' fetches every')[0])).toEqual([
      'app/counts.py:2: len(list(q.stream()))',
      'app/counts.py:5: len([d async for d in q.stream()])',
      'app/counts.py:8: len(await q.get())',
      'app/counts.py:12: len(docs) of docs = await q.get()',
    ]);
    expect(result.violations?.[0]).toMatch(/await q\.count\(\)\.get\(\)/);
  });

  it('TS red: (await getDocs(q)).size and snapshot.docs.length with no other use', () => {
    const result = check({
      'package.json': PACKAGE,
      'src/counts.ts': lines(
        "import { getDocs } from 'firebase/firestore';",
        'export async function countA(q: any) {',
        '  return (await getDocs(q)).size;',
        '}',
        'export async function countB(q: any) {',
        '  const snapshot = await getDocs(q);',
        '  return snapshot.docs.length;',
        '}'
      ),
    });
    expect(result.violations?.map(v => v.split(' fetches every')[0])).toEqual([
      'src/counts.ts:3: (await getDocs(q)).size',
      'src/counts.ts:7: snapshot.docs.length of snapshot = await getDocs(q)',
    ]);
    expect(result.violations?.[0]).toMatch(/getCountFromServer/);
  });

  it('green: a count aggregation', () => {
    expect(
      check({
        'pyproject.toml': PYPROJECT,
        'app/counts.py': lines('async def count(q):', '    result = await q.count().get()', '    return result[0][0].value', '', 'async def page(q):', '    return [d.to_dict() for d in await q.get()]'),
        'package.json': PACKAGE,
        'src/counts.ts': lines(
          "import { getCountFromServer, getDocs } from 'firebase/firestore';",
          'export async function count(q: any) {',
          '  return (await getCountFromServer(q)).data().count;',
          '}',
          'export async function rows(q: any) {',
          '  return (await getDocs(q)).docs.map(d => d.data());',
          '}'
        ),
      }).violations
    ).toEqual([]);
  });

  it('green: the documents are also used', () => {
    expect(
      check({
        'pyproject.toml': PYPROJECT,
        'app/counts.py': lines('async def page(q):', '    docs = await q.get()', '    return len(docs), [d.to_dict() for d in docs]'),
        'package.json': PACKAGE,
        'src/counts.ts': lines(
          "import { getDocs } from 'firebase/firestore';",
          'export async function page(q: any) {',
          '  const snapshot = await getDocs(q);',
          '  return { total: snapshot.docs.length, items: snapshot.docs.map(d => d.data()) };',
          '}'
        ),
      }).violations
    ).toEqual([]);
  });

  it('green: len() of something that is not a query, and a filtered comprehension', () => {
    expect(
      check({
        'pyproject.toml': PYPROJECT,
        'app/x.py': lines(
          'async def f(data, q):',
          '    tags = len(data.get("tags", []))',
          '    active = len([d async for d in q.stream() if d.get("active")])',
          '    return tags, active'
        ),
      }).violations
    ).toEqual([]);
  });

  describe('the verdict says what it read', () => {
    it('a DB client and no whole-result fetch: PASS with the counter and what it did not check, never judged nothing', () => {
      const result = check({ 'pyproject.toml': PYPROJECT, 'app/x.py': lines('def f(items):', '    return len(items)') });
      expect(result.passed).toBe(true);
      expect(result.judgedNothing).toBeUndefined();
      expect(result.message).toBe(
        'Count With An Aggregation: 1 source file(s) read (1 Python, 0 TS/JS), no whole-result fetch counted — nothing to check; not checked: counts through a repository method the client registry does not list, and documents counted in a helper the fetch was passed to'
      );
      expect(result.details).toEqual([result.message]);
      expect(result.metrics).toEqual({ filesRead: 1, pythonFiles: 1, typescriptFiles: 0, compared: 0 });
    });

    it('fetches and no count by fetching: PASS that counts what it checked', () => {
      const result = check({ 'pyproject.toml': PYPROJECT, 'app/x.py': lines('async def page(q):', '    return [d.to_dict() for d in await q.get()]') });
      expect(result.passed).toBe(true);
      expect(result.message).toMatch(/: 1 source file\(s\) read \(1 Python, 0 TS\/JS\), 1 whole-result fetch\(es\) checked, none fetched only to be counted; not checked: /);
      expect(result.metrics).toMatchObject({ filesRead: 1, compared: 1 });
    });

    it('no source file to read: judged nothing, never a pass', () => {
      const result = check({ 'pyproject.toml': PYPROJECT });
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
