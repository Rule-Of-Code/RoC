import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeComplexityControlLaw } from '../../src/checkers/code-quality-laws/code-complexity-control';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Code Complexity Control measures each function on its OWN body, read from
 * the syntax tree (#430), and file length in lines of code.
 *
 * The text detector found bodies by brace matching over source with only the
 * comments removed: an outer function was charged with its callbacks, an
 * `if` or a `{` inside a string was counted, and an expression-bodied arrow
 * or a function returning an inline object type was never measured. File
 * length counted comments and blank lines, a table of data was held to the
 * same 300 lines as logic, and many small functions were debt on their own.
 */
describe('Code Complexity Control reads the syntax tree (#430)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const findings = (pattern: RegExp): string[] => {
    const result = CodeComplexityControlLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'code-complexity-control',
    });
    return (result.violations ?? []).filter(v => pattern.test(v));
  };

  /** `n` decision points as statements: `if (a) x++;` each. */
  const branches = (n: number): string =>
    Array.from({ length: n }, (_, i) => `  if (a > ${i}) a++;`).join('\n');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-cx-ast-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('each function is measured on its own body', () => {
    it('does not charge an outer function with its callback', () => {
      // Outer: 1 + 3 = 4. Callback: 1 + 8 = 9. The old sum was 12.
      write(
        'src/outer.ts',
        [
          'export function outer(items: number[]): number {',
          '  let a = 0;',
          branches(3),
          '  items.forEach(a => {',
          branches(8),
          '  });',
          '  return a;',
          '}',
          '',
        ].join('\n')
      );

      expect(findings(/Function complexity/)).toEqual([]);
    });

    it('does not count keywords and braces inside strings and regexes', () => {
      write(
        'src/text.ts',
        [
          'export function describe(a: number): string {',
          "  const words = 'if if if for while case catch && || ? if for while';",
          '  const more = `if (x) for (;;) while (y) && || ?`;',
          '  const re = /if|for|while|case|&&|\\|\\|/g;',
          "  return a > 0 ? words + more + String(re) : '';",
          '}',
          '',
        ].join('\n')
      );

      expect(findings(/Function complexity/)).toEqual([]);
    });

    it('measures an arrow with an expression body', () => {
      write(
        'src/arrow.ts',
        'export const pick = (a: number) =>\n  a > 1 ? 1 : a > 2 ? 2 : a > 3 ? 3 : a > 4 ? 4 : a > 5 ? 5 : a > 6 ? 6 : a > 7 ? 7 : a > 8 ? 8 : a > 9 ? 9 : a > 10 ? 10 : 0;\n'
      );

      expect(findings(/Function complexity/)).toEqual([
        'Function complexity too high in src/arrow.ts (worst function 11, max 10)',
      ]);
    });

    it('measures a function whose return type is an inline object', () => {
      write(
        'src/shape.ts',
        [
          'export function shape(a: number): {',
          '  value: number;',
          '  label: string;',
          '} {',
          branches(10),
          "  return { value: a, label: 'x' };",
          '}',
          '',
        ].join('\n')
      );

      expect(findings(/Function complexity/)).toEqual([
        'Function complexity too high in src/shape.ts (worst function 11, max 10)',
      ]);
    });
  });

  describe('file length is lines of code, for files of logic', () => {
    /** One-line functions: logic, not a data table. */
    const logic = (n: number): string =>
      Array.from(
        { length: n },
        (_, i) => `export function f${i}(): number { return ${i}; }`
      ).join('\n');

    it('does not count comment and blank lines', () => {
      const prose = Array.from({ length: 120 }, (_, i) =>
        i % 2 ? '' : `// note ${i}`
      ).join('\n');
      write(
        'src/noted.ts',
        `/**\n * A module.\n */\n${prose}\n${logic(290)}\n`
      );

      expect(findings(/File too long/)).toEqual([]);
    });

    it('reports 301 lines of code, counting only the code', () => {
      write('src/long.ts', `// header\n\n${logic(301)}\n`);

      expect(findings(/File too long/)).toEqual([
        'File too long: src/long.ts (301 code lines, max 300)',
      ]);
    });

    it('does not hold a data file (at most two functions) to the limit', () => {
      const rows = Array.from(
        { length: 400 },
        (_, i) => `  { id: ${i}, name: 'row ${i}' },`
      ).join('\n');
      write(
        'src/table.ts',
        `export const ROWS = [\n${rows}\n];\nexport const byId = (id: number) => ROWS.find(r => r.id === id);\n`
      );

      expect(findings(/File too long/)).toEqual([]);
    });
  });

  describe('many functions are debt only next to high complexity', () => {
    const helpers = Array.from(
      { length: 25 },
      (_, i) =>
        `export function h${i}(a: number): number { if (a > ${i}) { return a; } return 0; }`
    ).join('\n');

    it('says nothing about many small branching functions', () => {
      write('src/helpers.ts', `${helpers}\n`);

      expect(findings(/Too many functions/)).toEqual([]);
    });

    it('reports them when one of them is over the complexity limit', () => {
      const tangled = `export function tangled(a: number): number {\n${branches(10)}\n  return a;\n}\n`;
      write('src/helpers.ts', `${helpers}\n${tangled}`);

      expect(findings(/Too many functions/)).toEqual([
        'Too many functions in src/helpers.ts (26, max 20) with a function of complexity 11 — split it, or extract the branching',
      ]);
    });
  });

  describe('without the parser', () => {
    it('says the files were not read, instead of measuring text', () => {
      write('src/a.ts', 'export const a = 1;\n');
      const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
      try {
        const result = CodeComplexityControlLaw.check({
          projectRoot: root,
          config: FileUtils.getMinimalDefaultConfig(),
          lawId: 'code-complexity-control',
        });

        expect(result.passed).toBe(false);
        expect(result.violations?.[0]).toMatch(
          /the 1 \.ts\/\.tsx file\(s\) were NOT read.*judged nothing/
        );
      } finally {
        spy.mockRestore();
      }
    });
  });
});
