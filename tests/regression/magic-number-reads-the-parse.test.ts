import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Magic Number Prevention reads numeric literals from the parse, and a
 * literal the code already names is not reported (#424, #431).
 *
 * The text detector skipped a regex literal without blanking it, so `{0,300}`
 * was a magic number; it accepted a name only in `const X = N` or `key: N`, so
 * a `?? 50` config fallback, a parameter default, the later factors of a named
 * product, the elements of a named Set and a `parseInt` radix were reported;
 * and it blanked whole template literals, so `${text.slice(0, 57)}` was never
 * seen at all.
 */
describe('Magic Number Prevention reads the parse (#431)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  /** The numbers the law reports for one file holding `source`. */
  const reported = (source: string): string[] => {
    write('src/subject.ts', source);
    const result = MagicNumberPreventionLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'magic-number-prevention',
    });
    const finding = (result.violations ?? []).find(v =>
      v.startsWith('Magic numbers in src/subject.ts')
    );
    return finding ? (finding.split(': ')[1] ?? '').split(', ') : [];
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-magic-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('a number the code already names is not reported', () => {
    it.each([
      ['inside a regex literal', 'export const RE = /^.{0,300}$/;'],
      [
        'the fallback of ??',
        'export const max = (c: { max?: number }) => c.max ?? 50;',
      ],
      [
        'the fallback of ?? across a line break',
        'export const max = (c: { thresholds?: { max?: number } }) =>\n  c.thresholds?.max ??\n  50;',
      ],
      [
        'a parameter default',
        'export function page(before = 50): number { return before; }',
      ],
      [
        'a destructuring default',
        'export function page({ limit = 75 }: { limit?: number }): number { return limit; }',
      ],
      [
        'every factor of a named product',
        'export const MAX_AGE = 24 * 60 * 60 * 1000;',
      ],
      [
        'the elements of a Set that initialises a named const',
        'export const CODES = new Set([401, 403]);',
      ],
      [
        'the entries of a Map that initialises a class field',
        "export class Status {\n  private readonly names = new Map([[401, 'auth'], [403, 'denied']]);\n}",
      ],
      ['the elements of a named array', 'export const SIZES = [16, 32, 64];'],
      [
        'the radix of parseInt',
        'export const hex = (s: string) => parseInt(s, 16);',
      ],
      [
        'a number in a comment',
        '// retry after 86400 seconds\nexport const x = 1;',
      ],
    ])('%s', (_name, source) => {
      expect(reported(source)).toEqual([]);
    });
  });

  describe('an unnamed literal in code is reported', () => {
    /**
     * A collection names its elements only as a whole, through the const or
     * the field it initialises. Built anywhere else — a parameter default, an
     * object property, an argument — its numbers are not named by it.
     */
    it.each([
      [
        'in a Set built as a parameter default',
        'export const allowed = (codes = new Set([401, 403])) => codes;',
      ],
      [
        'in a Set built as an object property',
        'export const T = { codes: new Set([401, 403]) };',
      ],
      [
        'in a Set built as an argument',
        'export const has = (n: number) => new Set([401, 403]).has(n);',
      ],
    ])('%s', (_name, source) => {
      expect(reported(source)).toEqual(['401', '403']);
    });

    it('inside a template substitution', () => {
      expect(
        reported('export const cut = (t: string) => `${t.slice(0, 57)}…`;')
      ).toEqual(['57']);
    });

    it('as a score deduction', () => {
      expect(
        reported(
          'export function grade(ok: boolean): number { let score = 100; if (!ok) score -= 25; return score; }'
        )
      ).toEqual(['25']);
    });

    it('as an operand next to a name, not the whole expression', () => {
      expect(
        reported('export const total = (items: number[]) => items.length * 37;')
      ).toEqual(['37']);
    });
  });

  describe('without the parser', () => {
    it('says the files were not read, instead of scanning text', () => {
      write('src/a.ts', 'export const a = 1;\n');
      const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      try {
        const result = MagicNumberPreventionLaw.check({
          projectRoot: root,
          config: FileUtils.getMinimalDefaultConfig(),
          lawId: 'magic-number-prevention',
        });

        expect(result.passed).toBe(false);
        expect(result.violations?.[0]).toMatch(
          /the 1 code file\(s\) were NOT read.*judged nothing/
        );
      } finally {
        spy.mockRestore();
      }
    });
  });
});
