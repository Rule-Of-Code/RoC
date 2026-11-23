/**
 * #437 (last point) — Async Cache Single-Flight was selected by text inside
 * string literals: a law registry file that holds the card's own example
 * (`if (!cache.has(k)) { const v = await load(k); cache.set(k, v); }` as a
 * string) selected the law, which then read the file, found nothing to
 * judge and passed with no finding. Selection now reads the code: comments
 * and the contents of strings are not code, in TS/JS and in Python.
 */
import { REQUIRES_ASYNC_CACHE } from '../../src/checkers/cache-harness-laws/async-cache-single-flight';
import { lawRequirementsMet } from '../../src/utils/law-requirements';
import { project, removeProjects } from '../checkers/toolkit-fixture';

const selected = (files: Record<string, string>): boolean =>
  lawRequirementsMet(REQUIRES_ASYNC_CACHE, project(files));

const TS_CACHE = [
  'const cache = new Map<string, number>();',
  'export async function get(key: string): Promise<number> {',
  '  if (cache.has(key)) return cache.get(key) as number;',
  '  const value = await load(key);',
  '  cache.set(key, value);',
  '  return value;',
  '}',
  'declare function load(key: string): Promise<number>;',
];

const PY_CACHE = [
  'cache = {}',
  'async def get(key):',
  '    if key in cache:',
  '        return cache[key]',
  '    value = await load(key)',
  '    cache[key] = value',
  '    return value',
];

describe('#437 Async Cache Single-Flight is selected by code, not by text', () => {
  afterEach(removeProjects);

  it('is not selected by a TS example kept in a string literal', () => {
    expect(
      selected({
        'src/data/cards.ts': `export const EXAMPLE = ${JSON.stringify(TS_CACHE.join('\n'))};\n`,
      })
    ).toBe(false);
  });

  it('is not selected by a TS example in a comment', () => {
    expect(
      selected({
        'src/notes.ts': ['/*', ...TS_CACHE, '*/', 'export const x = 1;'].join(
          '\n'
        ),
      })
    ).toBe(false);
  });

  it('is not selected by a Python example in a docstring', () => {
    expect(
      selected({
        'app/notes.py': ['"""', ...PY_CACHE, '"""', 'X = 1'].join('\n'),
      })
    ).toBe(false);
  });

  /** The controls: the same cache written as code still selects the law. */
  it('is selected by the TS cache in code', () => {
    expect(selected({ 'src/cache.ts': TS_CACHE.join('\n') })).toBe(true);
  });

  it('is selected by the Python cache in code', () => {
    expect(selected({ 'app/cache.py': PY_CACHE.join('\n') })).toBe(true);
  });
});
