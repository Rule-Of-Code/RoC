import { MagicNumberPreventionLaw } from '../../src/checkers/code-quality-laws/magic-number-prevention';

/**
 * A magic number is a numeric literal in code logic with no name.
 *
 * The detector stripped comments and then read everything else — including the
 * insides of string and template literals, where a digit is data or prose and
 * can never be replaced by a named constant. And the only thing it accepted as
 * a name was a variable declaration, so an object property — which names its
 * number exactly as a declaration does — was reported.
 *
 * One consumer measured 217 findings across 12 files: 153 inside string
 * literals, 64 named object properties, and **none** a magic number. Their
 * source carried the comment "Every ratio is named: the engraving is maths, not
 * magic" directly above an object the law reported in full.
 */
describe('a magic number is unnamed, and in code', () => {
  const found = (source: string): string[] =>
    (
      MagicNumberPreventionLaw as unknown as {
        findMagicNumbers: (s: string) => string[];
      }
    ).findMagicNumbers(source);

  describe('a number inside a string literal is not code', () => {
    it.each([
      ["const x = { id: 'cfg', n: '01', title: 'The config file' };"],
      ['const t = `laws.minLawsChecked: 999`;'],
      ["const msg = '✅ alert policy: unauthorized_401';"],
      ['const help = "run with --timeout 30000 to wait longer";'],
      ["const doc = 'HTTP 404 means the page is not there';"],
    ])('says nothing about %s', source => {
      expect(found(source)).toEqual([]);
    });

    /**
     * Blanking must preserve length and stop at the right place, or every index
     * the scan computed afterwards points somewhere else.
     */
    it('an apostrophe in prose does not blank the rest of the file', () => {
      expect(found(`const s = "it's fine";\nif (x > 4242) {}`)).toContain('4242');
    });

    it('an escaped quote does not close the literal early', () => {
      expect(found(`const s = 'a \\' 8080 b';\nif (x > 4242) {}`)).toEqual([
        '4242',
      ]);
    });

    it('a template literal spanning lines is blanked to its end', () => {
      expect(found('const t = `line 4242\nline 8080`;')).toEqual([]);
    });
  });

  describe('an object property is a name', () => {
    it.each([
      ['const HERO = { curves: 44, ratio: 7, innerCurves: 26 };'],
      ["const row = { platform: 'Angular', laws: 31 };"],
      ['const opts = { timeout: 30000, retries: 5000 };'],
      ["const quoted = { 'max-age': 31536000 };"],
      ['const nested = { budget: { initial: 500 } };'],
    ])('says nothing about %s', source => {
      expect(found(source)).toEqual([]);
    });
  });

  /** The red controls. An unnamed literal in code logic is still the point. */
  describe('an unnamed literal in code is still reported', () => {
    it.each([
      ['if (elapsed > 86400) { retry(); }', '86400'],
      ['setTimeout(fn, 30000);', '30000'],
      ['const items = collect(rows, 500);', '500'],
      ['switch (k) { case 3: return 5000; }', '5000'],
      ['export function f() { return 4242; }', '4242'],
    ])('reports %s', (source, expected) => {
      expect(found(source)).toContain(expected);
    });

    it('still reports a literal that sits beside a string', () => {
      expect(found("log('starting up'); wait(45000);")).toContain('45000');
    });
  });
});
