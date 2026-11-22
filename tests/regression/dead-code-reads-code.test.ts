import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { DeadCodeEliminationLaw } from '../../src/checkers/code-quality-laws/dead-code-elimination';
import { FileUtils } from '../../src/utils';
import * as tsxSource from '../../src/utils/react/tsx-source';

/**
 * Dead Code Elimination judges code, not text (#424).
 *
 * `includes('debugger')` ran on the raw file, so the word in a message was a
 * debug statement; any `//` line containing "function", "const" or "let" was
 * commented-out code, so four lines of prose were "commented code blocks";
 * and a line starting with `return` — `returned: n,` — opened an
 * "unreachable code" check.
 */
describe('Dead Code Elimination reads code (#424)', () => {
  let root: string;

  const write = (rel: string, content: string): void => {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };

  const findings = (): string[] =>
    (
      DeadCodeEliminationLaw.check({
        projectRoot: root,
        config: FileUtils.getMinimalDefaultConfig(),
        lawId: 'dead-code-elimination',
      }).violations ?? []
    ).filter(v => v.startsWith('Dead code in') || /NOT read/.test(v));

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'roc-dead-'));
    write('package.json', '{"name":"x","version":"1.0.0"}');
  });
  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('text is not dead code', () => {
    it.each([
      [
        'the word debugger in a string',
        "export const RISK = 'lets any desktop attach a debugger';\n",
      ],
      [
        'prose comments that mention function, const and let',
        [
          '// This function reads the config once.',
          '// The const below is the default; let the caller override it.',
          '// A function that returns early lets the caller decide.',
          '// Each const is named for what it holds.',
          'export const LIMIT = 3;',
          '',
        ].join('\n'),
      ],
      [
        'a line that starts with a name beginning "return"',
        'export function count(n: number): number {\n  let returnValue = n;\n  returnValue = n * 2;\n  return returnValue;\n}\n',
      ],
    ])('%s', (_name, source) => {
      write('src/subject.ts', source);

      expect(findings()).toEqual([]);
    });
  });

  describe('code is still dead code', () => {
    it('a debugger statement', () => {
      write('src/subject.ts', 'export function f() {\n  debugger;\n}\n');

      expect(findings()).toEqual([
        'Dead code in src/subject.ts: debug statement: debugger',
      ]);
    });

    it('commented-out declarations', () => {
      write(
        'src/subject.ts',
        [
          '// const total = sum(rows);',
          '// let index = 0;',
          '// function legacy(a) {',
          '// const unused = legacy(1);',
          'export const x = 1;',
          '',
        ].join('\n')
      );

      expect(findings()).toEqual([
        'Dead code in src/subject.ts: commented code blocks detected',
      ]);
    });

    it('a statement after a return', () => {
      write(
        'src/subject.ts',
        'export function f(): number {\n  return 1;\n  console.info("never");\n}\n'
      );

      expect(findings()).toEqual([
        'Dead code in src/subject.ts: unreachable code after return',
      ]);
    });
  });

  it('says the files were not read without the parser', () => {
    write('src/a.ts', 'export const a = 1;\n');
    const spy = jest.spyOn(tsxSource, 'loadTypeScript').mockReturnValue(null);
    try {
      expect(findings()[0]).toMatch(
        /the 1 code file\(s\) were NOT read.*judged nothing/
      );
    } finally {
      spy.mockRestore();
    }
  });
});
