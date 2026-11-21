import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { CodeDuplicationControlLaw } from '../../src/checkers/code-quality-laws/code-duplication-control';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Code Duplication Control compares the bodies of real functions, read from
 * the parse, above a floor of 5 lines and 50 tokens (#432).
 *
 * The text detector started a "block" on any line with `=>` or `function`
 * and ran it to the next balancing `}` — the tail of whatever followed the
 * last arrow — and replaced every string with `STR`, so two tables of
 * different messages were "the same code", and one-line idioms matched.
 */
describe('Code Duplication Control compares function bodies (#432)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const findings = (): string[] => {
    const result = CodeDuplicationControlLaw.check({
      projectRoot: root,
      config: FileUtils.getMinimalDefaultConfig(),
      lawId: 'code-duplication-control',
    });
    return (result.violations ?? []).filter(v =>
      v.startsWith('Code duplication found')
    );
  };

  /**
   * A body over the floor, the same in every copy, with a callback that is
   * itself over the floor.
   */
  const copied = (name: string): string =>
    [
      `export function ${name}(items: { price: number; qty: number }[], rate: number): number {`,
      '  let sum = 0;',
      '  items.forEach(item => {',
      '    const line = item.price * item.qty;',
      '    const discount = item.qty > 10 ? line * 0.05 : 0;',
      '    const tax = (line - discount) * rate;',
      '    sum += line - discount + tax;',
      "    if (sum > 1e6) throw new Error('order too large');",
      '  });',
      '  return Math.round(sum * 100) / 100;',
      '}',
      '',
    ].join('\n');

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-dup-ast-'));
    write(
      'package.json',
      '{"name":"x","version":"1.0.0","devDependencies":{"jscpd":"4.0.0"}}'
    );
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('does not take message tables with different text as the same code', () => {
    const table = (words: string[]): string =>
      [
        'export function messages(code: number): string {',
        ...words.map(
          (word, i) => `  if (code === ${i}) return '${word} ${word} ${word}';`
        ),
        "  return 'unknown';",
        '}',
        '',
      ].join('\n');
    write('src/en.ts', table(['alpha', 'bravo', 'charlie', 'delta', 'echo']));
    write('src/de.ts', table(['anton', 'berta', 'caesar', 'dora', 'emil']));

    expect(findings()).toEqual([]);
  });

  it('does not take a type member and a call fragment as a block', () => {
    const shape = [
      'export interface Checker {',
      '  check: (content: string, file: string) => boolean;',
      '  describe: (content: string, file: string) => string;',
      '}',
      'export const run = (c: Checker) => {',
      "  return c.check('a', 'b') ? c.describe('a', 'b') : '';",
      '};',
      '',
    ].join('\n');
    write('src/a.ts', shape);
    write('src/b.ts', shape.replace('run', 'go'));

    expect(findings()).toEqual([]);
  });

  it('does not report an idiom under the floor', () => {
    const small = (name: string): string =>
      `export function ${name}(file: string): string {\n  try {\n    return read(file);\n  } catch {\n    return '';\n  }\n}\ndeclare function read(f: string): string;\n`;
    write('src/a.ts', small('safeRead'));
    write('src/b.ts', small('safeRead'));

    expect(findings()).toEqual([]);
  });

  it('reports a copied body once, not once more for every callback in it', () => {
    write('src/a.ts', copied('totalA'));
    write('src/b.ts', copied('totalB'));

    expect(findings()).toEqual([
      'Code duplication found in: src/a.ts, src/b.ts',
    ]);
  });

  it('says the files were not read without the parser', () => {
    write('src/a.ts', copied('totalA'));
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      const result = CodeDuplicationControlLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
        lawId: 'code-duplication-control',
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
